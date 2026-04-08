package services

import (
	"context"
	"fmt"

	"github.com/domunity/backend-go/db"
	pb "github.com/domunity/backend-go/proto"
)

type HealthService struct {
	pb.UnimplementedHealthServiceServer
	DB *db.Database
}

func (s *HealthService) Check(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	dbStatus := "healthy"
	if err := s.DB.Pool.Ping(ctx); err != nil {
		dbStatus = "unhealthy"
	}

	return &pb.HealthCheckResponse{
		Healthy:        true,
		Version:        "1.0.0",
		DatabaseStatus: dbStatus,
	}, nil
}

type ContactService struct {
	pb.UnimplementedContactServiceServer
	DB *db.Database
}

func (s *ContactService) SendContactForm(ctx context.Context, req *pb.ContactFormRequest) (*pb.ContactFormResponse, error) {
	_, err := s.DB.Pool.Exec(ctx, `
        INSERT INTO contact_requests (name, phone, email, message, type)
        VALUES ($1, $2, $3, $4, 'contact')
    `, req.Name, req.Phone, req.Email, req.Message)
	if err != nil {
		return &pb.ContactFormResponse{Success: false, Message: err.Error()}, nil
	}
	return &pb.ContactFormResponse{Success: true, Message: "Your message has been sent successfully"}, nil
}

func (s *ContactService) RequestOffer(ctx context.Context, req *pb.OfferRequest) (*pb.OfferResponse, error) {
	msg := fmt.Sprintf("City: %s, Properties: %d, Address: %s, Additional Info: %s", req.City, req.NumProperties, req.Address, req.AdditionalInfo)
	_, err := s.DB.Pool.Exec(ctx, `
        INSERT INTO contact_requests (name, phone, email, message, type)
        VALUES ($1, $2, $3, $4, 'offer')
    `, "", req.Phone, req.Email, msg)
	if err != nil {
		return &pb.OfferResponse{Success: false, Message: err.Error()}, nil
	}
	return &pb.OfferResponse{Success: true, Message: "Your offer request has been received"}, nil
}

func (s *ContactService) RequestPresentation(ctx context.Context, req *pb.PresentationRequest) (*pb.PresentationResponse, error) {
	msg := fmt.Sprintf("Date: %s, Type: %s, Address: %s, Additional Info: %s", req.Date, req.BuildingType, req.Address, req.AdditionalInfo)
	_, err := s.DB.Pool.Exec(ctx, `
        INSERT INTO contact_requests (name, phone, email, message, type)
        VALUES ($1, $2, $3, $4, 'presentation')
    `, "", req.Phone, req.Email, msg)
	if err != nil {
		return &pb.PresentationResponse{Success: false, Message: err.Error()}, nil
	}
	return &pb.PresentationResponse{Success: true, Message: "Your presentation request has been received"}, nil
}
