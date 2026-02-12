package services

import (
	"context"
	"fmt"
	"strconv"

	"github.com/domunity/backend-go/db"
	pb "github.com/domunity/backend-go/proto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UserService struct {
	pb.UnimplementedUserServiceServer
	DB *db.Database
}

func (s *UserService) GetProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.UserProfile, error) {
	userID, err := strconv.Atoi(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "Invalid user ID")
	}

	var user struct {
		ID        int
		Email     string
		FullName  *string
		Phone     *string
		CreatedAt interface{}
	}

	err = s.DB.Pool.QueryRow(ctx, "SELECT id, email, full_name, phone, created_at FROM users WHERE id = $1", userID).Scan(
		&user.ID, &user.Email, &user.FullName, &user.Phone, &user.CreatedAt,
	)

	if err != nil {
		return nil, status.Error(codes.NotFound, "User not found")
	}

	var building pb.Building
	var apartment pb.Apartment
	err = s.DB.Pool.QueryRow(ctx, `
        SELECT b.id, b.address, b.entrance, b.total_apartments, b.total_residents,
               a.id, a.building_id, a.number, a.floor, a.type, a.residents
        FROM apartments a
        JOIN buildings b ON a.building_id = b.id
        WHERE a.user_id = $1
    `, userID).Scan(
		&building.Id, &building.Address, &building.Entrance, &building.TotalApartments, &building.TotalResidents,
		&apartment.Id, &apartment.BuildingId, &apartment.Number, &apartment.Floor, &apartment.Type, &apartment.Residents,
	)

	hasApartment := err == nil

	var profile struct {
		AccountManager *string
		Balance        float64
		ClientNumber   *string
		EndDate        interface{}
	}

	err = s.DB.Pool.QueryRow(ctx, "SELECT account_manager, balance, client_number, contract_end_date FROM user_profiles WHERE user_id = $1", userID).Scan(
		&profile.AccountManager, &profile.Balance, &profile.ClientNumber, &profile.EndDate,
	)

	res := &pb.UserProfile{
		User: &pb.User{
			Id:        fmt.Sprintf("%d", user.ID),
			Email:     user.Email,
			FullName:  getString(user.FullName),
			Phone:     getString(user.Phone),
			CreatedAt: fmt.Sprintf("%v", user.CreatedAt),
		},
		AccountManager:  getString(profile.AccountManager),
		Balance:         profile.Balance,
		ClientNumber:    getString(profile.ClientNumber),
		ContractEndDate: fmt.Sprintf("%v", profile.EndDate),
	}

	if hasApartment {
		res.Building = &building
		res.Apartment = &apartment
	}

	return res, nil
}

func (s *UserService) UpdateProfile(ctx context.Context, req *pb.UpdateProfileRequest) (*pb.UpdateProfileResponse, error) {
	userID, err := strconv.Atoi(req.UserId)
	if err != nil {
		return &pb.UpdateProfileResponse{Success: false, Message: "Invalid user ID"}, nil
	}

	_, err = s.DB.Pool.Exec(ctx, "UPDATE users SET full_name = $1, phone = $2 WHERE id = $3", req.FullName, req.Phone, userID)
	if err != nil {
		return &pb.UpdateProfileResponse{Success: false, Message: err.Error()}, nil
	}

	return &pb.UpdateProfileResponse{Success: true, Message: "Profile updated successfully"}, nil
}

func getString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
