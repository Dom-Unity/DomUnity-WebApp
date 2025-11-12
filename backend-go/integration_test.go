package main

import (
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

var testDB *sql.DB

func TestMain(m *testing.M) {
	// Setup
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgresql://postgres:postgres@localhost:5432/domunity_test"
	}

	var err error
	testDB, err = sql.Open("postgres", databaseURL)
	if err != nil {
		// Skip integration tests if database is not available
		os.Exit(0)
	}

	// Test connection
	if err := testDB.Ping(); err != nil {
		// Skip integration tests if database is not available
		testDB.Close()
		os.Exit(0)
	}

	// Run tests
	code := m.Run()

	// Teardown
	testDB.Close()
	os.Exit(code)
}

func setupTestTables(t *testing.T) {
	// Drop existing tables
	tables := []string{
		"announcements",
		"payments",
		"apartment_residents",
		"apartments",
		"buildings",
		"users",
	}

	for _, table := range tables {
		_, err := testDB.Exec("DROP TABLE IF EXISTS " + table + " CASCADE")
		assert.NoError(t, err)
	}

	// Create users table
	_, err := testDB.Exec(`
		CREATE TABLE users (
			id SERIAL PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			full_name VARCHAR(255),
			phone VARCHAR(50),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	assert.NoError(t, err)

	// Create buildings table
	_, err = testDB.Exec(`
		CREATE TABLE buildings (
			id SERIAL PRIMARY KEY,
			address VARCHAR(500) NOT NULL,
			entrance VARCHAR(10),
			total_apartments INTEGER DEFAULT 0,
			total_residents INTEGER DEFAULT 0
		)
	`)
	assert.NoError(t, err)

	// Create apartments table
	_, err = testDB.Exec(`
		CREATE TABLE apartments (
			id SERIAL PRIMARY KEY,
			building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
			apartment_number VARCHAR(10) NOT NULL,
			floor INTEGER,
			owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
			UNIQUE(building_id, apartment_number)
		)
	`)
	assert.NoError(t, err)
}

func TestCreateUser(t *testing.T) {
	if testDB == nil {
		t.Skip("Test database not available")
	}

	setupTestTables(t)

	email := "test@example.com"
	password := "SecurePass123!"
	fullName := "Test User"
	phone := "+359888123456"

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	assert.NoError(t, err)

	var userID int
	err = testDB.QueryRow(
		"INSERT INTO users (email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4) RETURNING id",
		email, string(hashedPassword), fullName, phone,
	).Scan(&userID)
	assert.NoError(t, err)
	assert.NotZero(t, userID)

	// Verify user was created
	var dbEmail, dbFullName, dbPhone, dbPasswordHash string
	err = testDB.QueryRow(
		"SELECT email, password_hash, full_name, phone FROM users WHERE id = $1",
		userID,
	).Scan(&dbEmail, &dbPasswordHash, &dbFullName, &dbPhone)
	assert.NoError(t, err)

	assert.Equal(t, email, dbEmail)
	assert.Equal(t, fullName, dbFullName)
	assert.Equal(t, phone, dbPhone)

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(dbPasswordHash), []byte(password))
	assert.NoError(t, err)
}

func TestCreateBuilding(t *testing.T) {
	if testDB == nil {
		t.Skip("Test database not available")
	}

	setupTestTables(t)

	address := "123 Main St"
	entrance := "A"
	totalApartments := 10

	var buildingID int
	err := testDB.QueryRow(
		"INSERT INTO buildings (address, entrance, total_apartments) VALUES ($1, $2, $3) RETURNING id",
		address, entrance, totalApartments,
	).Scan(&buildingID)
	assert.NoError(t, err)
	assert.NotZero(t, buildingID)

	// Verify building
	var dbAddress, dbEntrance string
	var dbTotalApartments int
	err = testDB.QueryRow(
		"SELECT address, entrance, total_apartments FROM buildings WHERE id = $1",
		buildingID,
	).Scan(&dbAddress, &dbEntrance, &dbTotalApartments)
	assert.NoError(t, err)

	assert.Equal(t, address, dbAddress)
	assert.Equal(t, entrance, dbEntrance)
	assert.Equal(t, totalApartments, dbTotalApartments)
}

func TestCreateApartmentWithOwner(t *testing.T) {
	if testDB == nil {
		t.Skip("Test database not available")
	}

	setupTestTables(t)

	// Create user
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	var userID int
	err := testDB.QueryRow(
		"INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
		"owner@example.com", string(hashedPassword),
	).Scan(&userID)
	assert.NoError(t, err)

	// Create building
	var buildingID int
	err = testDB.QueryRow(
		"INSERT INTO buildings (address) VALUES ($1) RETURNING id",
		"456 Oak Ave",
	).Scan(&buildingID)
	assert.NoError(t, err)

	// Create apartment
	var apartmentID int
	err = testDB.QueryRow(
		"INSERT INTO apartments (building_id, apartment_number, floor, owner_id) VALUES ($1, $2, $3, $4) RETURNING id",
		buildingID, "101", 1, userID,
	).Scan(&apartmentID)
	assert.NoError(t, err)

	// Verify apartment
	var apartmentNumber string
	var floor int
	var ownerEmail string
	err = testDB.QueryRow(`
		SELECT a.apartment_number, a.floor, u.email 
		FROM apartments a 
		LEFT JOIN users u ON a.owner_id = u.id 
		WHERE a.id = $1
	`, apartmentID).Scan(&apartmentNumber, &floor, &ownerEmail)
	assert.NoError(t, err)

	assert.Equal(t, "101", apartmentNumber)
	assert.Equal(t, 1, floor)
	assert.Equal(t, "owner@example.com", ownerEmail)
}

func TestUniqueApartmentNumber(t *testing.T) {
	if testDB == nil {
		t.Skip("Test database not available")
	}

	setupTestTables(t)

	// Create building
	var buildingID int
	err := testDB.QueryRow(
		"INSERT INTO buildings (address) VALUES ($1) RETURNING id",
		"789 Elm St",
	).Scan(&buildingID)
	assert.NoError(t, err)

	// Create first apartment
	_, err = testDB.Exec(
		"INSERT INTO apartments (building_id, apartment_number) VALUES ($1, $2)",
		buildingID, "201",
	)
	assert.NoError(t, err)

	// Try to create duplicate
	_, err = testDB.Exec(
		"INSERT INTO apartments (building_id, apartment_number) VALUES ($1, $2)",
		buildingID, "201",
	)
	assert.Error(t, err)
}

func TestCascadeDeleteBuilding(t *testing.T) {
	if testDB == nil {
		t.Skip("Test database not available")
	}

	setupTestTables(t)

	// Create building
	var buildingID int
	err := testDB.QueryRow(
		"INSERT INTO buildings (address) VALUES ($1) RETURNING id",
		"111 Pine St",
	).Scan(&buildingID)
	assert.NoError(t, err)

	// Create apartments
	_, err = testDB.Exec(
		"INSERT INTO apartments (building_id, apartment_number) VALUES ($1, $2)",
		buildingID, "101",
	)
	assert.NoError(t, err)

	_, err = testDB.Exec(
		"INSERT INTO apartments (building_id, apartment_number) VALUES ($1, $2)",
		buildingID, "102",
	)
	assert.NoError(t, err)

	// Verify apartments exist
	var countBefore int
	err = testDB.QueryRow(
		"SELECT COUNT(*) FROM apartments WHERE building_id = $1",
		buildingID,
	).Scan(&countBefore)
	assert.NoError(t, err)
	assert.Equal(t, 2, countBefore)

	// Delete building
	_, err = testDB.Exec("DELETE FROM buildings WHERE id = $1", buildingID)
	assert.NoError(t, err)

	// Verify apartments are deleted
	var countAfter int
	err = testDB.QueryRow(
		"SELECT COUNT(*) FROM apartments WHERE building_id = $1",
		buildingID,
	).Scan(&countAfter)
	assert.NoError(t, err)
	assert.Equal(t, 0, countAfter)
}
