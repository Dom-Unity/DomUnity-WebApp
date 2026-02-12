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

type FinancialService struct {
	pb.UnimplementedFinancialServiceServer
	DB *db.Database
}

func (s *FinancialService) GetFinancialReport(ctx context.Context, req *pb.GetFinancialReportRequest) (*pb.FinancialReport, error) {
	buildingID, err := strconv.Atoi(req.BuildingId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "Invalid building ID")
	}

	rows, err := s.DB.Pool.Query(ctx, `
        SELECT a.number, a.type, a.floor, u.full_name, a.residents,
               f.elevator_gtp, f.elevator_electricity, f.common_area_electricity,
               f.elevator_maintenance, f.management_fee, f.repair_fund, f.total_due
        FROM apartments a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN financial_records f ON a.id = f.apartment_id
        WHERE a.building_id = $1
        ORDER BY a.number
    `, buildingID)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	defer rows.Close()

	var entries []*pb.FinancialReportEntry
	var totalBalance float64
	for rows.Next() {
		var entry pb.FinancialReportEntry
		var fullName *string
		var aptType *string
		if err := rows.Scan(
			&entry.ApartmentNumber, &aptType, &entry.Floor, &fullName, &entry.Residents,
			&entry.ElevatorGtp, &entry.ElevatorElectricity, &entry.CommonAreaElectricity,
			&entry.ElevatorMaintenance, &entry.ManagementFee, &entry.RepairFund, &entry.TotalDue,
		); err != nil {
			return nil, status.Error(codes.Internal, err.Error())
		}
		entry.Type = getString(aptType)
		if entry.Type == "" {
			entry.Type = "Апартамент"
		}
		entry.ClientName = getString(fullName)
		if entry.ClientName == "" {
			entry.ClientName = "N/A"
		}
		entries = append(entries, &entry)
		totalBalance += entry.TotalDue
	}

	return &pb.FinancialReport{Entries: entries, TotalBalance: totalBalance}, nil
}

func (s *FinancialService) GetPaymentHistory(ctx context.Context, req *pb.GetPaymentHistoryRequest) (*pb.PaymentHistory, error) {
	return &pb.PaymentHistory{Payments: []*pb.Payment{}}, nil
}

type EventService struct {
	pb.UnimplementedEventServiceServer
	DB *db.Database
}

func (s *EventService) ListEvents(ctx context.Context, req *pb.ListEventsRequest) (*pb.ListEventsResponse, error) {
	buildingID, err := strconv.Atoi(req.BuildingId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "Invalid building ID")
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}

	rows, err := s.DB.Pool.Query(ctx, "SELECT id, date, title, description, building_id FROM events WHERE building_id = $1 ORDER BY date DESC LIMIT $2", buildingID, limit)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	defer rows.Close()

	var events []*pb.Event
	for rows.Next() {
		var e pb.Event
		var desc *string
		var title *string
		var date interface{}
		if err := rows.Scan(&e.Id, &date, &title, &desc, &e.BuildingId); err != nil {
			return nil, status.Error(codes.Internal, err.Error())
		}
		e.Date = fmt.Sprintf("%v", date)
		e.Title = getString(title)
		e.Description = getString(desc)
		events = append(events, &e)
	}

	return &pb.ListEventsResponse{Events: events}, nil
}

func (s *EventService) CreateEvent(ctx context.Context, req *pb.CreateEventRequest) (*pb.CreateEventResponse, error) {
	buildingID, err := strconv.Atoi(req.BuildingId)
	if err != nil {
		return &pb.CreateEventResponse{Success: false, Message: "Invalid building ID"}, nil
	}

	var id int
	err = s.DB.Pool.QueryRow(ctx, `
        INSERT INTO events (building_id, date, title, description)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `, buildingID, req.Date, req.Title, req.Description).Scan(&id)
	if err != nil {
		return &pb.CreateEventResponse{Success: false, Message: err.Error()}, nil
	}

	return &pb.CreateEventResponse{Success: true, Message: "Event created successfully", EventId: fmt.Sprintf("%d", id)}, nil
}
