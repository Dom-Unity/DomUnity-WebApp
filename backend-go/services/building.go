package services

import (
	"context"
	"strconv"

	"github.com/domunity/backend-go/db"
	pb "github.com/domunity/backend-go/proto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type BuildingService struct {
	pb.UnimplementedBuildingServiceServer
	DB *db.Database
}

func (s *BuildingService) GetBuilding(ctx context.Context, req *pb.GetBuildingRequest) (*pb.Building, error) {
	buildingID, err := strconv.Atoi(req.BuildingId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "Invalid building ID")
	}

	var b pb.Building
	err = s.DB.Pool.QueryRow(ctx, "SELECT id, address, entrance, total_apartments, total_residents FROM buildings WHERE id = $1", buildingID).Scan(
		&b.Id, &b.Address, &b.Entrance, &b.TotalApartments, &b.TotalResidents,
	)
	if err != nil {
		return nil, status.Error(codes.NotFound, "Building not found")
	}

	return &b, nil
}

func (s *BuildingService) ListApartments(ctx context.Context, req *pb.ListApartmentsRequest) (*pb.ListApartmentsResponse, error) {
	buildingID, err := strconv.Atoi(req.BuildingId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "Invalid building ID")
	}

	rows, err := s.DB.Pool.Query(ctx, "SELECT id, building_id, number, floor, type, residents FROM apartments WHERE building_id = $1 ORDER BY number", buildingID)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	defer rows.Close()

	var apartments []*pb.Apartment
	for rows.Next() {
		var a pb.Apartment
		if err := rows.Scan(&a.Id, &a.BuildingId, &a.Number, &a.Floor, &a.Type, &a.Residents); err != nil {
			return nil, status.Error(codes.Internal, err.Error())
		}
		apartments = append(apartments, &a)
	}

	return &pb.ListApartmentsResponse{Apartments: apartments}, nil
}
