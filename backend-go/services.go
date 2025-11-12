package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ==================== User Service ====================

type userServer struct {
	pb.UnimplementedUserServiceServer
}

func (s *userServer) GetProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.UserProfile, error) {
	log.Printf("GET PROFILE REQUEST for user_id: %s", req.UserId)
	
	var user struct {
		ID        int
		Email     string
		FullName  sql.NullString
		Phone     sql.NullString
		CreatedAt time.Time
	}
	
	err := db.QueryRow(`
		SELECT id, email, full_name, phone, created_at
		FROM users WHERE id = $1
	`, req.UserId).Scan(&user.ID, &user.Email, &user.FullName, &user.Phone, &user.CreatedAt)
	
	if err != nil {
		log.Printf("✗ User not found: %v", err)
		return nil, status.Errorf(codes.NotFound, "User not found")
	}
	
	profile := &pb.UserProfile{
		User: &pb.User{
			Id:        fmt.Sprintf("%d", user.ID),
			Email:     user.Email,
			FullName:  user.FullName.String,
			Phone:     user.Phone.String,
			CreatedAt: user.CreatedAt.Format(time.RFC3339),
		},
	}
	
	// Get apartment and building info
	var apt struct {
		AptID       int
		BuildingID  int
		Number      int
		Floor       sql.NullInt32
		Type        sql.NullString
		Residents   int
		Address     string
		Entrance    sql.NullString
		TotalApts   int
		TotalRes    int
	}
	
	err = db.QueryRow(`
		SELECT a.id, a.building_id, a.number, a.floor, a.type, a.residents,
		       b.address, b.entrance, b.total_apartments, b.total_residents
		FROM apartments a
		JOIN buildings b ON a.building_id = b.id
		WHERE a.user_id = $1
	`, req.UserId).Scan(
		&apt.AptID, &apt.BuildingID, &apt.Number, &apt.Floor, &apt.Type, &apt.Residents,
		&apt.Address, &apt.Entrance, &apt.TotalApts, &apt.TotalRes,
	)
	
	if err == nil {
		profile.Building = &pb.Building{
			Id:              fmt.Sprintf("%d", apt.BuildingID),
			Address:         apt.Address,
			Entrance:        apt.Entrance.String,
			TotalApartments: int32(apt.TotalApts),
			TotalResidents:  int32(apt.TotalRes),
		}
		
		profile.Apartment = &pb.Apartment{
			Id:         fmt.Sprintf("%d", apt.AptID),
			BuildingId: fmt.Sprintf("%d", apt.BuildingID),
			Number:     int32(apt.Number),
			Floor:      int32(apt.Floor.Int32),
			Type:       apt.Type.String,
			Residents:  int32(apt.Residents),
		}
	}
	
	// Get user profile details
	var userProf struct {
		AccountManager  sql.NullString
		Balance         sql.NullFloat64
		ClientNumber    sql.NullString
		ContractEndDate sql.NullTime
	}
	
	err = db.QueryRow(`
		SELECT account_manager, balance, client_number, contract_end_date
		FROM user_profiles WHERE user_id = $1
	`, req.UserId).Scan(&userProf.AccountManager, &userProf.Balance, &userProf.ClientNumber, &userProf.ContractEndDate)
	
	if err == nil {
		profile.AccountManager = userProf.AccountManager.String
		profile.Balance = userProf.Balance.Float64
		profile.ClientNumber = userProf.ClientNumber.String
		if userProf.ContractEndDate.Valid {
			profile.ContractEndDate = userProf.ContractEndDate.Time.Format("2006-01-02")
		}
	}
	
	log.Printf("✓ Profile retrieved for user: %s", user.Email)
	return profile, nil
}

func (s *userServer) UpdateProfile(ctx context.Context, req *pb.UpdateProfileRequest) (*pb.UpdateProfileResponse, error) {
	log.Printf("UPDATE PROFILE REQUEST for user_id: %s", req.UserId)
	
	_, err := db.Exec(`
		UPDATE users 
		SET full_name = $1, phone = $2
		WHERE id = $3
	`, req.FullName, req.Phone, req.UserId)
	
	if err != nil {
		log.Printf("✗ UpdateProfile error: %v", err)
		return &pb.UpdateProfileResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}
	
	log.Printf("✓ Profile updated for user_id: %s", req.UserId)
	return &pb.UpdateProfileResponse{
		Success: true,
		Message: "Profile updated successfully",
	}, nil
}

// ==================== Building Service ====================

type buildingServer struct {
	pb.UnimplementedBuildingServiceServer
}

func (s *buildingServer) GetBuilding(ctx context.Context, req *pb.GetBuildingRequest) (*pb.Building, error) {
	log.Printf("GET BUILDING REQUEST for building_id: %s", req.BuildingId)
	
	var building struct {
		ID              int
		Address         string
		Entrance        sql.NullString
		TotalApartments int
		TotalResidents  int
	}
	
	err := db.QueryRow(`
		SELECT id, address, entrance, total_apartments, total_residents
		FROM buildings WHERE id = $1
	`, req.BuildingId).Scan(
		&building.ID, &building.Address, &building.Entrance,
		&building.TotalApartments, &building.TotalResidents,
	)
	
	if err != nil {
		log.Printf("✗ Building not found: %v", err)
		return nil, status.Errorf(codes.NotFound, "Building not found")
	}
	
	return &pb.Building{
		Id:              fmt.Sprintf("%d", building.ID),
		Address:         building.Address,
		Entrance:        building.Entrance.String,
		TotalApartments: int32(building.TotalApartments),
		TotalResidents:  int32(building.TotalResidents),
	}, nil
}

func (s *buildingServer) ListApartments(ctx context.Context, req *pb.ListApartmentsRequest) (*pb.ListApartmentsResponse, error) {
	log.Printf("LIST APARTMENTS REQUEST for building_id: %s", req.BuildingId)
	
	rows, err := db.Query(`
		SELECT id, building_id, number, floor, type, residents
		FROM apartments 
		WHERE building_id = $1
		ORDER BY number
	`, req.BuildingId)
	
	if err != nil {
		log.Printf("✗ ListApartments error: %v", err)
		return nil, status.Errorf(codes.Internal, "Database error")
	}
	defer rows.Close()
	
	var apartments []*pb.Apartment
	for rows.Next() {
		var apt struct {
			ID         int
			BuildingID int
			Number     int
			Floor      sql.NullInt32
			Type       sql.NullString
			Residents  int
		}
		
		err := rows.Scan(&apt.ID, &apt.BuildingID, &apt.Number, &apt.Floor, &apt.Type, &apt.Residents)
		if err != nil {
			continue
		}
		
		apartments = append(apartments, &pb.Apartment{
			Id:         fmt.Sprintf("%d", apt.ID),
			BuildingId: fmt.Sprintf("%d", apt.BuildingID),
			Number:     int32(apt.Number),
			Floor:      int32(apt.Floor.Int32),
			Type:       apt.Type.String,
			Residents:  int32(apt.Residents),
		})
	}
	
	log.Printf("✓ Retrieved %d apartments", len(apartments))
	return &pb.ListApartmentsResponse{Apartments: apartments}, nil
}

// ==================== Financial Service ====================

type financialServer struct {
	pb.UnimplementedFinancialServiceServer
}

func (s *financialServer) GetFinancialReport(ctx context.Context, req *pb.GetFinancialReportRequest) (*pb.FinancialReport, error) {
	log.Printf("GET FINANCIAL REPORT REQUEST for building_id: %s", req.BuildingId)
	
	rows, err := db.Query(`
		SELECT a.number, a.floor, a.type, a.residents, u.full_name,
		       COALESCE(f.elevator_gtp, 0), COALESCE(f.elevator_electricity, 0),
		       COALESCE(f.common_area_electricity, 0), COALESCE(f.elevator_maintenance, 0),
		       COALESCE(f.management_fee, 0), COALESCE(f.repair_fund, 0),
		       COALESCE(f.total_due, 0)
		FROM apartments a
		LEFT JOIN users u ON a.user_id = u.id
		LEFT JOIN financial_records f ON a.id = f.apartment_id
		WHERE a.building_id = $1
		ORDER BY a.number
	`, req.BuildingId)
	
	if err != nil {
		log.Printf("✗ GetFinancialReport error: %v", err)
		return nil, status.Errorf(codes.Internal, "Database error")
	}
	defer rows.Close()
	
	var entries []*pb.FinancialReportEntry
	var totalBalance float64
	
	for rows.Next() {
		var entry struct {
			Number                 int
			Floor                  sql.NullInt32
			Type                   sql.NullString
			Residents              int
			ClientName             sql.NullString
			ElevatorGTP            float64
			ElevatorElectricity    float64
			CommonAreaElectricity  float64
			ElevatorMaintenance    float64
			ManagementFee          float64
			RepairFund             float64
			TotalDue               float64
		}
		
		err := rows.Scan(
			&entry.Number, &entry.Floor, &entry.Type, &entry.Residents, &entry.ClientName,
			&entry.ElevatorGTP, &entry.ElevatorElectricity, &entry.CommonAreaElectricity,
			&entry.ElevatorMaintenance, &entry.ManagementFee, &entry.RepairFund, &entry.TotalDue,
		)
		
		if err != nil {
			continue
		}
		
		totalBalance += entry.TotalDue
		
		clientName := "N/A"
		if entry.ClientName.Valid {
			clientName = entry.ClientName.String
		}
		
		entries = append(entries, &pb.FinancialReportEntry{
			ApartmentNumber:       int32(entry.Number),
			Type:                  entry.Type.String,
			Floor:                 int32(entry.Floor.Int32),
			ClientName:            clientName,
			Residents:             int32(entry.Residents),
			ElevatorGtp:           entry.ElevatorGTP,
			ElevatorElectricity:   entry.ElevatorElectricity,
			CommonAreaElectricity: entry.CommonAreaElectricity,
			ElevatorMaintenance:   entry.ElevatorMaintenance,
			ManagementFee:         entry.ManagementFee,
			RepairFund:            entry.RepairFund,
			TotalDue:              entry.TotalDue,
		})
	}
	
	log.Printf("✓ Retrieved financial report with %d entries", len(entries))
	
	return &pb.FinancialReport{
		Entries:      entries,
		TotalBalance: totalBalance,
	}, nil
}

func (s *financialServer) GetPaymentHistory(ctx context.Context, req *pb.GetPaymentHistoryRequest) (*pb.PaymentHistory, error) {
	log.Printf("GET PAYMENT HISTORY REQUEST for user_id: %s", req.UserId)
	
	// Mock data for now
	return &pb.PaymentHistory{Payments: []*pb.Payment{}}, nil
}

// ==================== Event Service ====================

type eventServer struct {
	pb.UnimplementedEventServiceServer
}

func (s *eventServer) ListEvents(ctx context.Context, req *pb.ListEventsRequest) (*pb.ListEventsResponse, error) {
	log.Printf("LIST EVENTS REQUEST for building_id: %s", req.BuildingId)
	
	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	
	rows, err := db.Query(`
		SELECT id, date, title, description, building_id
		FROM events 
		WHERE building_id = $1
		ORDER BY date DESC
		LIMIT $2
	`, req.BuildingId, limit)
	
	if err != nil {
		log.Printf("✗ ListEvents error: %v", err)
		return nil, status.Errorf(codes.Internal, "Database error")
	}
	defer rows.Close()
	
	var events []*pb.Event
	for rows.Next() {
		var event struct {
			ID          int
			Date        time.Time
			Title       sql.NullString
			Description sql.NullString
			BuildingID  int
		}
		
		err := rows.Scan(&event.ID, &event.Date, &event.Title, &event.Description, &event.BuildingID)
		if err != nil {
			continue
		}
		
		events = append(events, &pb.Event{
			Id:          fmt.Sprintf("%d", event.ID),
			Date:        event.Date.Format("2006-01-02"),
			Title:       event.Title.String,
			Description: event.Description.String,
			BuildingId:  fmt.Sprintf("%d", event.BuildingID),
		})
	}
	
	log.Printf("✓ Retrieved %d events", len(events))
	return &pb.ListEventsResponse{Events: events}, nil
}

func (s *eventServer) CreateEvent(ctx context.Context, req *pb.CreateEventRequest) (*pb.CreateEventResponse, error) {
	log.Printf("CREATE EVENT REQUEST for building_id: %s", req.BuildingId)
	
	var eventID int
	err := db.QueryRow(`
		INSERT INTO events (building_id, date, title, description)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, req.BuildingId, req.Date, req.Title, req.Description).Scan(&eventID)
	
	if err != nil {
		log.Printf("✗ CreateEvent error: %v", err)
		return &pb.CreateEventResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}
	
	log.Printf("✓ Event created with ID: %d", eventID)
	
	return &pb.CreateEventResponse{
		Success: true,
		Message: "Event created successfully",
		EventId: fmt.Sprintf("%d", eventID),
	}, nil
}

// ==================== Contact Service ====================

type contactServer struct {
	pb.UnimplementedContactServiceServer
}

func (s *contactServer) SendContactForm(ctx context.Context, req *pb.ContactFormRequest) (*pb.ContactFormResponse, error) {
	log.Printf("CONTACT FORM REQUEST from: %s", req.Email)
	
	_, err := db.Exec(`
		INSERT INTO contact_requests (name, phone, email, message, type)
		VALUES ($1, $2, $3, $4, 'contact')
	`, req.Name, req.Phone, req.Email, req.Message)
	
	if err != nil {
		log.Printf("✗ SendContactForm error: %v", err)
		return &pb.ContactFormResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}
	
	log.Println("✓ Contact form saved")
	
	return &pb.ContactFormResponse{
		Success: true,
		Message: "Your message has been sent successfully",
	}, nil
}

func (s *contactServer) RequestOffer(ctx context.Context, req *pb.OfferRequest) (*pb.OfferResponse, error) {
	log.Printf("OFFER REQUEST from: %s", req.Email)
	
	message := fmt.Sprintf("City: %s, Properties: %d, Address: %s", req.City, req.NumProperties, req.Address)
	
	_, err := db.Exec(`
		INSERT INTO contact_requests (name, phone, email, message, type)
		VALUES ($1, $2, $3, $4, 'offer')
	`, "", req.Phone, req.Email, message)
	
	if err != nil {
		log.Printf("✗ RequestOffer error: %v", err)
		return &pb.OfferResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}
	
	log.Println("✓ Offer request saved")
	
	return &pb.OfferResponse{
		Success: true,
		Message: "Your offer request has been received",
	}, nil
}

func (s *contactServer) RequestPresentation(ctx context.Context, req *pb.PresentationRequest) (*pb.PresentationResponse, error) {
	log.Printf("PRESENTATION REQUEST from: %s", req.Email)
	
	message := fmt.Sprintf("Date: %s, Type: %s, Address: %s", req.Date, req.BuildingType, req.Address)
	
	_, err := db.Exec(`
		INSERT INTO contact_requests (name, phone, email, message, type)
		VALUES ($1, $2, $3, $4, 'presentation')
	`, "", req.Phone, req.Email, message)
	
	if err != nil {
		log.Printf("✗ RequestPresentation error: %v", err)
		return &pb.PresentationResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}
	
	log.Println("✓ Presentation request saved")
	
	return &pb.PresentationResponse{
		Success: true,
		Message: "Your presentation request has been received",
	}, nil
}

// ==================== Health Service ====================

type healthServer struct {
	pb.UnimplementedHealthServiceServer
}

func (s *healthServer) Check(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	log.Println("HEALTH CHECK REQUEST")
	
	dbStatus := "healthy"
	if err := db.Ping(); err != nil {
		dbStatus = "unhealthy"
	}
	
	return &pb.HealthCheckResponse{
		Healthy:        true,
		Version:        version,
		DatabaseStatus: dbStatus,
	}, nil
}
