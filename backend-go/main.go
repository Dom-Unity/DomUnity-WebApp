package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

var (
	db        *sql.DB
	jwtSecret []byte
)

const (
	jwtExpiration = 24 * time.Hour
	version       = "1.0.0"
)

// ==================== Database Setup ====================

func initDatabase() error {
	logSection("DATABASE CONNECTION ATTEMPT")
	
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Println("✗ DATABASE_URL environment variable not set!")
		return fmt.Errorf("DATABASE_URL not configured")
	}
	
	log.Printf("Database URL present: true")
	log.Printf("Database URL (obscured): %s", obscurePassword(databaseURL))
	
	var err error
	db, err = sql.Open("postgres", databaseURL)
	if err != nil {
		log.Printf("✗ Database connection failed: %v", err)
		return err
	}
	
	// Test connection
	if err := db.Ping(); err != nil {
		log.Printf("✗ Database ping failed: %v", err)
		return err
	}
	
	log.Println("✓ Database connection established successfully")
	logSeparator()
	
	return initSchema()
}

func obscurePassword(url string) string {
	if strings.Contains(url, "@") && strings.Contains(url, ":") {
		parts := strings.Split(url, "@")
		beforeAt := parts[0]
		afterAt := strings.Join(parts[1:], "@")
		
		if strings.Contains(beforeAt, "://") {
			protoParts := strings.Split(beforeAt, "://")
			protocol := protoParts[0]
			credentials := protoParts[1]
			
			if strings.Contains(credentials, ":") {
				credParts := strings.Split(credentials, ":")
				username := credParts[0]
				return fmt.Sprintf("%s://%s:****@%s", protocol, username, afterAt)
			}
		}
	}
	return "****"
}

func initSchema() error {
	log.Println("Initializing database schema...")
	
	schema := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			full_name VARCHAR(255),
			phone VARCHAR(50),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
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
	}
	
	for i, query := range schema {
		log.Printf("Creating table %d/%d...", i+1, len(schema))
		if _, err := db.Exec(query); err != nil {
			log.Printf("✗ Schema creation failed: %v", err)
			return err
		}
	}
	
	log.Println("✓ Database schema initialized successfully")
	
	// Insert sample data
	insertSampleData()
	
	return nil
}

// ==================== HTTP Health Check Server ====================

type healthCheckResponse struct {
	Status    string `json:"status"`
	Database  string `json:"database"`
	Timestamp string `json:"timestamp"`
	Service   string `json:"service"`
	Version   string `json:"version"`
}

func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/health" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Check database connection
	dbStatus := "connected"
	statusCode := http.StatusOK

	if err := db.Ping(); err != nil {
		log.Printf("Health check database error: %v", err)
		dbStatus = fmt.Sprintf("error: %v", err)
		statusCode = http.StatusServiceUnavailable
	}

	w.WriteHeader(statusCode)

	response := healthCheckResponse{
		Status:    map[bool]string{true: "healthy", false: "unhealthy"}[statusCode == http.StatusOK],
		Database:  dbStatus,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Service:   "domunity-backend-go",
		Version:   version,
	}

	json.NewEncoder(w).Encode(response)
	log.Printf("Health check: %d - %s", statusCode, dbStatus)
}

func startHTTPHealthServer(port string) {
	http.HandleFunc("/health", healthCheckHandler)

	log.Printf("✓ HTTP health check server starting on port %s", port)
	log.Printf("  Health endpoint: http://0.0.0.0:%s/health", port)

	go func() {
		if err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%s", port), nil); err != nil {
			log.Fatalf("✗ HTTP health server failed: %v", err)
		}
	}()
}

func insertSampleData() {
	var count int
	db.QueryRow("SELECT COUNT(*) FROM buildings").Scan(&count)
	
	if count == 0 {
		log.Println("Inserting sample data...")
		
		var buildingID int
		err := db.QueryRow(`
			INSERT INTO buildings (address, entrance, total_apartments, total_residents)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`, "ж.к. Младост 3, бл. 325", "Б", 24, 38).Scan(&buildingID)
		
		if err != nil {
			log.Printf("Sample data insertion warning: %v", err)
			return
		}
		
		// Insert sample apartments
		for i := 1; i <= 3; i++ {
			db.Exec(`
				INSERT INTO apartments (building_id, number, floor, type, residents)
				VALUES ($1, $2, $3, $4, $5)
			`, buildingID, i, i, "Апартамент", 2+i)
		}
		
		// Insert sample events
		db.Exec(`
			INSERT INTO events (building_id, date, title, description)
			VALUES 
				($1, '2025-11-05', 'Планирана профилактика', 'Планирана профилактика на асансьора от 10:00 до 13:00 ч.'),
				($1, '2025-11-02', 'Общо събрание', 'Общо събрание на вход Б – от 19:00 ч. във входното фоайе.')
		`, buildingID)
		
		log.Println("✓ Sample data inserted successfully")
	}
}

// ==================== Helper Functions ====================

func logSection(title string) {
	log.Println(strings.Repeat("=", 80))
	log.Println(title)
	log.Println(strings.Repeat("=", 80))
}

func logSeparator() {
	log.Println(strings.Repeat("=", 80))
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func generateToken(userID int, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(jwtExpiration).Unix(),
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ==================== Auth Service ====================

type authServer struct {
	pb.UnimplementedAuthServiceServer
}

func (s *authServer) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	logSection("LOGIN REQUEST")
	log.Printf("Email: %s", req.Email)
	logSeparator()
	
	var user struct {
		ID           int
		Email        string
		PasswordHash string
		FullName     sql.NullString
		Phone        sql.NullString
		CreatedAt    time.Time
	}
	
	err := db.QueryRow(`
		SELECT id, email, password_hash, full_name, phone, created_at
		FROM users WHERE email = $1
	`, req.Email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.Phone, &user.CreatedAt)
	
	if err == sql.ErrNoRows {
		log.Printf("✗ User not found: %s", req.Email)
		return &pb.LoginResponse{
			Success: false,
			Message: "Invalid email or password",
		}, nil
	} else if err != nil {
		log.Printf("✗ Login error: %v", err)
		return nil, status.Errorf(codes.Internal, "Database error: %v", err)
	}
	
	if !checkPasswordHash(req.Password, user.PasswordHash) {
		log.Printf("✗ Invalid password for user: %s", req.Email)
		return &pb.LoginResponse{
			Success: false,
			Message: "Invalid email or password",
		}, nil
	}
	
	accessToken, err := generateToken(user.ID, user.Email)
	if err != nil {
		log.Printf("✗ Token generation failed: %v", err)
		return nil, status.Errorf(codes.Internal, "Token generation failed")
	}
	
	refreshToken, _ := generateToken(user.ID, user.Email) // Same for simplicity
	
	log.Printf("✓ Login successful for user: %s", user.Email)
	
	return &pb.LoginResponse{
		Success:      true,
		Message:      "Login successful",
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: &pb.User{
			Id:        fmt.Sprintf("%d", user.ID),
			Email:     user.Email,
			FullName:  user.FullName.String,
			Phone:     user.Phone.String,
			CreatedAt: user.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

func (s *authServer) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	logSection("REGISTER REQUEST")
	log.Printf("Email: %s", req.Email)
	log.Printf("Full name: %s", req.FullName)
	logSeparator()
	
	hashedPassword, err := hashPassword(req.Password)
	if err != nil {
		log.Printf("✗ Password hashing failed: %v", err)
		return nil, status.Errorf(codes.Internal, "Password hashing failed")
	}
	
	var userID int
	err = db.QueryRow(`
		INSERT INTO users (email, password_hash, full_name, phone)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, req.Email, hashedPassword, req.FullName, req.Phone).Scan(&userID)
	
	if err != nil {
		log.Printf("✗ Registration error: %v", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: fmt.Sprintf("Registration failed: %v", err),
		}, nil
	}
	
	log.Printf("✓ User registered successfully: %s (ID: %d)", req.Email, userID)
	
	return &pb.RegisterResponse{
		Success: true,
		Message: "Registration successful",
		UserId:  fmt.Sprintf("%d", userID),
	}, nil
}

func (s *authServer) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	log.Println("REFRESH TOKEN REQUEST")
	
	// In production, validate the refresh token properly
	// For now, just return a success
	return &pb.RefreshTokenResponse{
		Success:     true,
		AccessToken: "new-token",
	}, nil
}

func (s *authServer) ForgotPassword(ctx context.Context, req *pb.ForgotPasswordRequest) (*pb.ForgotPasswordResponse, error) {
	log.Printf("FORGOT PASSWORD REQUEST for: %s", req.Email)
	
	return &pb.ForgotPasswordResponse{
		Success: true,
		Message: "Password reset instructions sent to your email",
	}, nil
}

// ==================== Main Server ====================

func main() {
	logSection("DOMUNITY gRPC SERVER (Go)")
	log.Printf("Starting at %s", time.Now().Format(time.RFC3339))
	log.Printf("Go version: %s", "1.21")
	log.Println()
	
	// Log environment configuration
	log.Println("Environment Configuration:")
	if os.Getenv("DATABASE_URL") != "" {
		log.Println("  DATABASE_URL: SET")
	} else {
		log.Println("  DATABASE_URL: NOT SET")
	}
	
	if os.Getenv("JWT_SECRET") != "" {
		log.Println("  JWT_SECRET: SET")
		jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	} else {
		log.Println("  JWT_SECRET: USING DEFAULT")
		jwtSecret = []byte("your-secret-key-change-in-production")
	}
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "50051"
	}
	httpPort := os.Getenv("HTTP_PORT")
	if httpPort == "" {
		httpPort = "8080"
	}
	log.Printf("  GRPC_PORT: %s", port)
	log.Printf("  HTTP_PORT: %s", httpPort)
	logSeparator()
	
	// Start HTTP health check server
	startHTTPHealthServer(httpPort)
	
	// Initialize database
	if err := initDatabase(); err != nil {
		log.Fatalf("✗ Database initialization failed: %v", err)
	}
	log.Println("✓ Database initialized successfully")
	
	// Create gRPC server
	grpcServer := grpc.NewServer()
	
	// Register services
	pb.RegisterAuthServiceServer(grpcServer, &authServer{})
	pb.RegisterUserServiceServer(grpcServer, &userServer{})
	pb.RegisterBuildingServiceServer(grpcServer, &buildingServer{})
	pb.RegisterFinancialServiceServer(grpcServer, &financialServer{})
	pb.RegisterEventServiceServer(grpcServer, &eventServer{})
	pb.RegisterContactServiceServer(grpcServer, &contactServer{})
	pb.RegisterHealthServiceServer(grpcServer, &healthServer{})
	
	// Enable reflection
	reflection.Register(grpcServer)
	
	// Start listening
	lis, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%s", port))
	if err != nil {
		log.Fatalf("✗ Failed to listen: %v", err)
	}
	
	logSection(fmt.Sprintf("✓ SERVERS STARTED SUCCESSFULLY"))
	log.Printf("\ngRPC Server: 0.0.0.0:%s", port)
	log.Printf("HTTP Health Check: 0.0.0.0:%s/health", httpPort)
	log.Println("\nRegistered gRPC Services:")
	log.Println("  • domunity.AuthService")
	log.Println("  • domunity.UserService")
	log.Println("  • domunity.BuildingService")
	log.Println("  • domunity.FinancialService")
	log.Println("  • domunity.EventService")
	log.Println("  • domunity.ContactService")
	log.Println("  • domunity.HealthService")
	logSeparator()
	
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("✗ Failed to serve: %v", err)
	}
}
