package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Database struct {
	Pool *pgxpool.Pool
}

func Connect() (*Database, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable not set")
	}

	obscuredURL := obscurePassword(databaseURL)
	log.Printf("Connecting to database: %s", obscuredURL)

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse DATABASE_URL: %v", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %v", err)
	}

	db := &Database{Pool: pool}

	if err := db.initSchema(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to initialize schema: %v", err)
	}

	return db, nil
}

func obscurePassword(url string) string {
	if strings.Contains(url, "@") && strings.Contains(url, ":") {
		parts := strings.Split(url, "@")
		beforeAt := parts[0]
		afterAt := strings.Join(parts[1:], "@")

		if strings.Contains(beforeAt, "://") {
			protocolParts := strings.SplitN(beforeAt, "://", 2)
			protocol := protocolParts[0]
			credentials := protocolParts[1]
			if strings.Contains(credentials, ":") {
				credParts := strings.SplitN(credentials, ":", 2)
				username := credParts[0]
				return fmt.Sprintf("%s://%s:****@%s", protocol, username, afterAt)
			}
		}
	}
	return "****"
}

func (db *Database) initSchema(ctx context.Context) error {
	log.Println("Initializing database schema...")

	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            phone VARCHAR(50),
            role VARCHAR(50) DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
		`DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        EXCEPTION WHEN others THEN NULL;
        END $$;`,
		`CREATE TABLE IF NOT EXISTS buildings (
            id SERIAL PRIMARY KEY,
            address VARCHAR(500) NOT NULL,
            entrance VARCHAR(10),
            total_apartments INTEGER DEFAULT 0,
            total_residents INTEGER DEFAULT 0
        )`,
		`CREATE TABLE IF NOT EXISTS apartments (
            id SERIAL PRIMARY KEY,
            building_id INTEGER REFERENCES buildings(id),
            number INTEGER NOT NULL,
            floor INTEGER,
            type VARCHAR(50),
            residents INTEGER DEFAULT 0,
            user_id INTEGER REFERENCES users(id)
        )`,
		`CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            building_id INTEGER REFERENCES buildings(id),
            date DATE NOT NULL,
            title VARCHAR(500),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
		`CREATE TABLE IF NOT EXISTS financial_records (
            id SERIAL PRIMARY KEY,
            apartment_id INTEGER REFERENCES apartments(id),
            period VARCHAR(20),
            elevator_gtp DECIMAL(10, 2) DEFAULT 0,
            elevator_electricity DECIMAL(10, 2) DEFAULT 0,
            common_area_electricity DECIMAL(10, 2) DEFAULT 0,
            elevator_maintenance DECIMAL(10, 2) DEFAULT 0,
            management_fee DECIMAL(10, 2) DEFAULT 0,
            repair_fund DECIMAL(10, 2) DEFAULT 0,
            total_due DECIMAL(10, 2) DEFAULT 0
        )`,
		`CREATE TABLE IF NOT EXISTS contact_requests (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            phone VARCHAR(50),
            email VARCHAR(255),
            message TEXT,
            type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
		`CREATE TABLE IF NOT EXISTS user_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(id),
            account_manager VARCHAR(255),
            balance DECIMAL(10, 2) DEFAULT 0,
            client_number VARCHAR(50),
            contract_end_date DATE
        )`,
		`CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            apartment_id INTEGER REFERENCES apartments(id),
            amount DECIMAL(10, 2) NOT NULL,
            period VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            paid_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
		`CREATE TABLE IF NOT EXISTS maintenance_records (
            id SERIAL PRIMARY KEY,
            building_id INTEGER REFERENCES buildings(id),
            date DATE NOT NULL,
            description TEXT,
            cost DECIMAL(10, 2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'planned',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
	}

	for _, q := range queries {
		if _, err := db.Pool.Exec(ctx, q); err != nil {
			return fmt.Errorf("error executing query: %v", err)
		}
	}

	log.Println("✓ Database schema initialized successfully")
	return db.insertSampleData(ctx)
}

func (db *Database) insertSampleData(ctx context.Context) error {
	var count int
	err := db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM buildings").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	log.Println("Inserting sample data...")

	var buildingID int
	err = db.Pool.QueryRow(ctx, `
        INSERT INTO buildings (address, entrance, total_apartments, total_residents)
        VALUES ('ж.к. Младост 3, бл. 325', 'Б', 24, 38)
        RETURNING id
    `).Scan(&buildingID)
	if err != nil {
		return err
	}

	usersData := []struct {
		Email    string
		Name     string
		Phone    string
		Role     string
		IsActive bool
	}{
		{"ivan.ivanov@example.com", "Иван Иванов", "+359 888 123 456", "user", true},
		{"m.georgieva@example.com", "Мария Георгиева", "+359 888 234 567", "user", true},
		{"petar.petrov@example.com", "Петър Петров", "+359 888 345 678", "user", false},
		{"admin@domunity.bg", "Админ ДомУнити", "+359 888 000 000", "admin", true},
	}

	userIDs := make([]int, 0)
	for _, u := range usersData {
		hash, _ := bcrypt.GenerateFromPassword([]byte("test123"), bcrypt.DefaultCost)
		var id int
		err = db.Pool.QueryRow(ctx, `
            INSERT INTO users (email, password_hash, full_name, phone, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, u.Email, string(hash), u.Name, u.Phone, u.Role, u.IsActive).Scan(&id)
		if err != nil {
			return err
		}
		userIDs = append(userIDs, id)
	}

	apartmentsData := []struct {
		Number    int
		Floor     int
		Residents int
		UserID    *int
	}{
		{25, 5, 3, &userIDs[0]},
		{26, 5, 2, &userIDs[1]},
		{27, 5, 4, &userIDs[2]},
		{22, 4, 2, nil},
		{23, 4, 3, nil},
		{24, 4, 2, nil},
	}

	apartmentIDs := make([]int, 0)
	for _, a := range apartmentsData {
		var id int
		err = db.Pool.QueryRow(ctx, `
            INSERT INTO apartments (building_id, number, floor, type, residents, user_id)
            VALUES ($1, $2, $3, 'Апартамент', $4, $5)
            RETURNING id
        `, buildingID, a.Number, a.Floor, a.Residents, a.UserID).Scan(&id)
		if err != nil {
			return err
		}
		apartmentIDs = append(apartmentIDs, id)
	}

	profilesData := []struct {
		UserID       int
		Manager      string
		Balance      float64
		ClientNumber string
	}{
		{userIDs[0], "Мария Петрова", 0.00, "12356787"},
		{userIDs[1], "Мария Петрова", -10.00, "98765432"},
		{userIDs[2], "Мария Петрова", 0.00, "55555555"},
	}
	for _, p := range profilesData {
		_, err = db.Pool.Exec(ctx, `
            INSERT INTO user_profiles (user_id, account_manager, balance, client_number, contract_end_date)
            VALUES ($1, $2, $3, $4, '2026-12-31')
        `, p.UserID, p.Manager, p.Balance, p.ClientNumber)
		if err != nil {
			return err
		}
	}

	paymentsData := []struct {
		UserID   int
		AptID    int
		Amount   float64
		Period   string
		Status   string
		PaidDate *string
	}{
		{userIDs[0], apartmentIDs[0], 30.00, "Ноември 2025", "pending", nil},
		{userIDs[0], apartmentIDs[0], 40.00, "Октомври 2025", "paid", ptrString("2025-10-15")},
		{userIDs[0], apartmentIDs[0], 30.00, "Септември 2025", "paid", ptrString("2025-09-12")},
		{userIDs[1], apartmentIDs[1], 25.00, "Ноември 2025", "pending", nil},
		{userIDs[1], apartmentIDs[1], 25.00, "Октомври 2025", "paid", ptrString("2025-10-20")},
		{userIDs[2], apartmentIDs[2], 35.00, "Ноември 2025", "overdue", nil},
		{userIDs[2], apartmentIDs[2], 35.00, "Октомври 2025", "overdue", nil},
	}
	for _, p := range paymentsData {
		var paidAt *time.Time
		if p.PaidDate != nil {
			t, _ := time.Parse("2006-01-02", *p.PaidDate)
			paidAt = &t
		}
		_, err = db.Pool.Exec(ctx, `
            INSERT INTO payments (user_id, apartment_id, amount, period, status, paid_date)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, p.UserID, p.AptID, p.Amount, p.Period, p.Status, paidAt)
		if err != nil {
			return err
		}
	}

	_, err = db.Pool.Exec(ctx, `
        INSERT INTO events (building_id, date, title, description)
        VALUES 
            ($1, '2025-11-05', 'Планирана профилактика', 'Планирана профилактика на асансьора от 10:00 до 13:00 ч.'),
            ($1, '2025-11-02', 'Общо събрание', 'Общо събрание на вход Б – от 19:00 ч. във входното фоайе.'),
            ($1, '2025-10-28', 'Напомняне за такса', 'Изпратено напомняне за месечна такса за поддръжка.')
    `, buildingID)
	if err != nil {
		return err
	}

	_, err = db.Pool.Exec(ctx, `
        INSERT INTO maintenance_records (building_id, date, description, cost, status)
        VALUES 
            ($1, '2025-02-05', 'Почистване и дезинфекция на входа', 20.00, 'completed'),
            ($1, '2025-03-18', 'Профилактика на асансьора', 60.00, 'planned'),
            ($1, '2025-01-15', 'Смяна на осветление в стълбището', 35.00, 'completed')
    `, buildingID)
	if err != nil {
		return err
	}

	log.Println("✓ Sample data inserted successfully")
	return nil
}

func ptrString(s string) *string {
	return &s
}

func (db *Database) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}
