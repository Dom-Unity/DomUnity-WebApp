package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/domunity/backend-go/db"
	pb "github.com/domunity/backend-go/proto"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	JWTSecret      = []byte("your-secret-key-change-in-production")
	JWTHours       = 24
	JWTRefreshDays = 30
)

type AuthService struct {
	pb.UnimplementedAuthServiceServer
	DB *db.Database
}

func (s *AuthService) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	log.Printf("LOGIN REQUEST for %s", req.Email)

	var user struct {
		ID           int
		Email        string
		PasswordHash string
		FullName     *string
		Phone        *string
		CreatedAt    time.Time
	}

	err := s.DB.Pool.QueryRow(ctx, "SELECT id, email, password_hash, full_name, phone, created_at FROM users WHERE email = $1", req.Email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.Phone, &user.CreatedAt,
	)

	if err != nil {
		log.Printf("User not found: %s", req.Email)
		return &pb.LoginResponse{Success: false, Message: "Invalid email or password"}, nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("Invalid password for: %s", req.Email)
		return &pb.LoginResponse{Success: false, Message: "Invalid email or password"}, nil
	}

	accessToken, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"exp":     time.Now().Add(time.Hour * time.Duration(JWTHours)).Unix(),
	}).SignedString(JWTSecret)

	refreshToken, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().AddDate(0, 0, JWTRefreshDays).Unix(),
	}).SignedString(JWTSecret)

	fullName := ""
	if user.FullName != nil {
		fullName = *user.FullName
	}
	phone := ""
	if user.Phone != nil {
		phone = *user.Phone
	}

	return &pb.LoginResponse{
		Success:      true,
		Message:      "Login successful",
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: &pb.User{
			Id:        fmt.Sprintf("%d", user.ID),
			Email:     user.Email,
			FullName:  fullName,
			Phone:     phone,
			CreatedAt: user.CreatedAt.String(),
		},
	}, nil
}

func (s *AuthService) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	log.Printf("REGISTER REQUEST for %s", req.Email)

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	var id int
	err := s.DB.Pool.QueryRow(ctx, `
        INSERT INTO users (email, password_hash, full_name, phone)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `, req.Email, string(hash), req.FullName, req.Phone).Scan(&id)

	if err != nil {
		log.Printf("Registration error: %v", err)
		return &pb.RegisterResponse{Success: false, Message: fmt.Sprintf("Registration failed: %v", err)}, nil
	}

	return &pb.RegisterResponse{
		Success: true,
		Message: "Registration successful",
		UserId:  fmt.Sprintf("%d", id),
	}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		return JWTSecret, nil
	})

	if err != nil || !token.Valid {
		return &pb.RefreshTokenResponse{Success: false}, nil
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return &pb.RefreshTokenResponse{Success: false}, nil
	}

	userID := int(claims["user_id"].(float64))
	accessToken, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * time.Duration(JWTHours)).Unix(),
	}).SignedString(JWTSecret)

	return &pb.RefreshTokenResponse{
		Success:     true,
		AccessToken: accessToken,
	}, nil
}

func (s *AuthService) ForgotPassword(ctx context.Context, req *pb.ForgotPasswordRequest) (*pb.ForgotPasswordResponse, error) {
	return &pb.ForgotPasswordResponse{
		Success: true,
		Message: "Password reset instructions sent to your email",
	}, nil
}
