package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/domunity/backend-go/api"
	"github.com/domunity/backend-go/db"
	pb "github.com/domunity/backend-go/proto"
	"github.com/domunity/backend-go/services"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	database, err := db.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Initialize services
	authService := &services.AuthService{DB: database}
	userService := &services.UserService{DB: database}
	buildingService := &services.BuildingService{DB: database}
	financialService := &services.FinancialService{DB: database}
	eventService := &services.EventService{DB: database}
	contactService := &services.ContactService{DB: database}
	healthService := &services.HealthService{DB: database}

	// Start gRPC server
	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "50051"
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", grpcPort))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterAuthServiceServer(s, authService)
	pb.RegisterUserServiceServer(s, userService)
	pb.RegisterBuildingServiceServer(s, buildingService)
	pb.RegisterFinancialServiceServer(s, financialService)
	pb.RegisterEventServiceServer(s, eventService)
	pb.RegisterContactServiceServer(s, contactService)
	pb.RegisterHealthServiceServer(s, healthService)

	// Register reflection service on gRPC server.
	reflection.Register(s)

	go func() {
		log.Printf("gRPC server listening at %v", lis.Addr())
		if err := s.Serve(lis); err != nil {
			log.Fatalf("failed to serve: %v", err)
		}
	}()

	// Start HTTP REST server
	httpPort := os.Getenv("PORT")
	if httpPort == "" {
		httpPort = "8080"
	}

	apiHandler := &api.APIHandler{
		DB:              database,
		AuthService:     authService,
		UserService:     userService,
		BuildingService: buildingService,
		ContactService:  contactService,
	}

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%s", httpPort),
		Handler: apiHandler,
	}

	go func() {
		log.Printf("HTTP server listening at %v", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("failed to listen and serve: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down servers...")

	s.GracefulStop()
	if err := httpServer.Close(); err != nil {
		log.Fatalf("HTTP server Close: %v", err)
	}

	log.Println("Servers gracefully stopped")
}
