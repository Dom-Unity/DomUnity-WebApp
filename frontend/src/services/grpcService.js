import * as services from '../proto/domunity_grpc_web_pb';

let clients = {};
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'production') {

    const host = process.env.REACT_APP_BACKEND_URL ?
        `https://${process.env.REACT_APP_BACKEND_URL}.onrender.com` : 'http://localhost:50051';
    console.log(host);
    clients = {
        HealthService: new services.HealthServiceClient(host, null, null),
        UserService: new services.UserServiceClient(host, null, null),
        EventService: new services.EventServiceClient(host, null, null),
        AuthService: new services.AuthServiceClient(host, null, null)
    };
} else {
    // Mock response classes
    class MockHealthCheckResponse {
        constructor() {
            this.healthy = Math.random() > 0.1;
            this.version = ['1.0.0', '1.1.0', '2.0.0'][Math.floor(Math.random() * 3)];
            this.database_status = ['connected', 'healthy', 'operational'][Math.floor(Math.random() * 3)];
        }
        getHealthy() { return this.healthy; }
        getVersion() { return this.version; }
        getDatabaseStatus() { return this.database_status; }
        toObject() { return { healthy: this.healthy, version: this.version, database_status: this.database_status }; }
    }

    class MockUser {
        constructor() {
            const users = [
                { id: '123', email: 'john@example.com', full_name: 'John Doe', phone: '+1234567890', created_at: '2023-01-01' },
                { id: '456', email: 'jane@example.com', full_name: 'Jane Smith', phone: '+0987654321', created_at: '2023-02-01' }
            ];
            const u = users[Math.floor(Math.random() * users.length)];
            this.id = u.id;
            this.email = u.email;
            this.full_name = u.full_name;
            this.phone = u.phone;
            this.created_at = u.created_at;
        }
        getId() { return this.id; }
        getEmail() { return this.email; }
        getFullName() { return this.full_name; }
        getPhone() { return this.phone; }
        getCreatedAt() { return this.created_at; }
        toObject() { return { id: this.id, email: this.email, full_name: this.full_name, phone: this.phone, created_at: this.created_at }; }
    }

    class MockBuilding {
        constructor() {
            const buildings = [
                { id: 'b1', address: '123 Main St', entrance: 'A', total_apartments: 50, total_residents: 100 },
                { id: 'b2', address: '456 Oak Ave', entrance: 'B', total_apartments: 30, total_residents: 60 }
            ];
            const b = buildings[Math.floor(Math.random() * buildings.length)];
            this.id = b.id;
            this.address = b.address;
            this.entrance = b.entrance;
            this.total_apartments = b.total_apartments;
            this.total_residents = b.total_residents;
        }
        getId() { return this.id; }
        getAddress() { return this.address; }
        getEntrance() { return this.entrance; }
        getTotalApartments() { return this.total_apartments; }
        getTotalResidents() { return this.total_residents; }
        toObject() { return { id: this.id, address: this.address, entrance: this.entrance, total_apartments: this.total_apartments, total_residents: this.total_residents }; }
    }

    class MockApartment {
        constructor() {
            const apartments = [
                { id: 'a1', building_id: 'b1', number: 101, floor: 1, type: '1BR', residents: 2 },
                { id: 'a2', building_id: 'b1', number: 202, floor: 2, type: '2BR', residents: 4 }
            ];
            const a = apartments[Math.floor(Math.random() * apartments.length)];
            this.id = a.id;
            this.building_id = a.building_id;
            this.number = a.number;
            this.floor = a.floor;
            this.type = a.type;
            this.residents = a.residents;
        }
        getId() { return this.id; }
        getBuildingId() { return this.building_id; }
        getNumber() { return this.number; }
        getFloor() { return this.floor; }
        getType() { return this.type; }
        getResidents() { return this.residents; }
        toObject() { return { id: this.id, building_id: this.building_id, number: this.number, floor: this.floor, type: this.type, residents: this.residents }; }
    }

    class MockLoginResponse {
        constructor() {
            this.success = true;
            this.message = 'Login successful';
            this.access_token = 'mock_access_token_' + Math.random().toString(36).substr(2, 9);
            this.refresh_token = 'mock_refresh_token_' + Math.random().toString(36).substr(2, 9);
            this.user = new MockUser();
        }
        getSuccess() { return this.success; }
        getMessage() { return this.message; }
        getAccessToken() { return this.access_token; }
        getRefreshToken() { return this.refresh_token; }
        getUser() { return this.user; }
        toObject() { return { success: this.success, message: this.message, access_token: this.access_token, refresh_token: this.refresh_token, user: this.user.toObject() }; }
    }

    class MockRegisterResponse {
        constructor() {
            this.success = true;
            this.message = 'Registration successful';
            this.user_id = 'user_' + Math.random().toString(36).substr(2, 9);
        }
        getSuccess() { return this.success; }
        getMessage() { return this.message; }
        getUserId() { return this.user_id; }
        toObject() { return { success: this.success, message: this.message, user_id: this.user_id }; }
    }

    class MockRefreshTokenResponse {
        constructor() {
            this.success = true;
            this.access_token = 'new_mock_access_token_' + Math.random().toString(36).substr(2, 9);
        }
        getSuccess() { return this.success; }
        getAccessToken() { return this.access_token; }
        toObject() { return { success: this.success, access_token: this.access_token }; }
    }

    class MockForgotPasswordResponse {
        constructor() {
            this.success = true;
            this.message = 'Password reset email sent';
        }
        getSuccess() { return this.success; }
        getMessage() { return this.message; }
        toObject() { return { success: this.success, message: this.message }; }
    }

    class MockUserProfile {
        constructor() {
            this.user = new MockUser();
            this.building = new MockBuilding();
            this.apartment = new MockApartment();
            this.account_manager = ['Alice Manager', 'Bob Supervisor'][Math.floor(Math.random() * 2)];
            this.balance = Math.floor(Math.random() * 1000) + 100;
            this.client_number = 'CN' + Math.floor(Math.random() * 10000);
            this.contract_end_date = new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        getUser() { return this.user; }
        getBuilding() { return this.building; }
        getApartment() { return this.apartment; }
        getAccountManager() { return this.account_manager; }
        getBalance() { return this.balance; }
        getClientNumber() { return this.client_number; }
        getContractEndDate() { return this.contract_end_date; }
        toObject() { return { user: this.user.toObject(), building: this.building.toObject(), apartment: this.apartment.toObject(), account_manager: this.account_manager, balance: this.balance, client_number: this.client_number, contract_end_date: this.contract_end_date }; }
    }

    class MockUpdateProfileResponse {
        constructor() {
            this.success = true;
            this.message = 'Profile updated successfully';
        }
        getSuccess() { return this.success; }
        getMessage() { return this.message; }
        toObject() { return { success: this.success, message: this.message }; }
    }

    class MockListApartmentsResponse {
        constructor() {
            this.apartments = [new MockApartment(), new MockApartment()];
        }
        getApartmentsList() { return this.apartments; }
        toObject() { return { apartments: this.apartments.map(a => a.toObject()) }; }
    }

    class MockFinancialReportEntry {
        constructor() {
            this.apartment_number = Math.floor(Math.random() * 500) + 100;
            this.type = ['1BR', '2BR', '3BR'][Math.floor(Math.random() * 3)];
            this.floor = Math.floor(Math.random() * 10) + 1;
            this.client_name = ['John Doe', 'Jane Smith', 'Bob Johnson'][Math.floor(Math.random() * 3)];
            this.residents = Math.floor(Math.random() * 5) + 1;
            this.elevator_gtp = Math.random() * 50;
            this.elevator_electricity = Math.random() * 30;
            this.common_area_electricity = Math.random() * 40;
            this.elevator_maintenance = Math.random() * 20;
            this.management_fee = Math.random() * 100;
            this.repair_fund = Math.random() * 50;
            this.total_due = this.elevator_gtp + this.elevator_electricity + this.common_area_electricity + this.elevator_maintenance + this.management_fee + this.repair_fund;
        }
        getApartmentNumber() { return this.apartment_number; }
        getType() { return this.type; }
        getFloor() { return this.floor; }
        getClientName() { return this.client_name; }
        getResidents() { return this.residents; }
        getElevatorGtp() { return this.elevator_gtp; }
        getElevatorElectricity() { return this.elevator_electricity; }
        getCommonAreaElectricity() { return this.common_area_electricity; }
        getElevatorMaintenance() { return this.elevator_maintenance; }
        getManagementFee() { return this.management_fee; }
        getRepairFund() { return this.repair_fund; }
        getTotalDue() { return this.total_due; }
        toObject() { return { apartment_number: this.apartment_number, type: this.type, floor: this.floor, client_name: this.client_name, residents: this.residents, elevator_gtp: this.elevator_gtp, elevator_electricity: this.elevator_electricity, common_area_electricity: this.common_area_electricity, elevator_maintenance: this.elevator_maintenance, management_fee: this.management_fee, repair_fund: this.repair_fund, total_due: this.total_due }; }
    }

    class MockFinancialReport {
        constructor() {
            this.entries = [new MockFinancialReportEntry(), new MockFinancialReportEntry()];
            this.total_balance = this.entries.reduce((sum, e) => sum + e.total_due, 0);
        }
        getEntriesList() { return this.entries; }
        getTotalBalance() { return this.total_balance; }
        toObject() { return { entries: this.entries.map(e => e.toObject()), total_balance: this.total_balance }; }
    }

    class MockPayment {
        constructor() {
            this.id = 'pay_' + Math.random().toString(36).substr(2, 9);
            this.date = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            this.amount = Math.floor(Math.random() * 500) + 50;
            this.description = ['Monthly fee', 'Repair fund', 'Maintenance'][Math.floor(Math.random() * 3)];
            this.status = ['paid', 'pending', 'overdue'][Math.floor(Math.random() * 3)];
        }
        getId() { return this.id; }
        getDate() { return this.date; }
        getAmount() { return this.amount; }
        getDescription() { return this.description; }
        getStatus() { return this.status; }
        toObject() { return { id: this.id, date: this.date, amount: this.amount, description: this.description, status: this.status }; }
    }

    class MockPaymentHistory {
        constructor() {
            this.payments = [new MockPayment(), new MockPayment(), new MockPayment()];
        }
        getPaymentsList() { return this.payments; }
        toObject() { return { payments: this.payments.map(p => p.toObject()) }; }
    }

    class MockEvent {
        constructor() {
            const events = [
                { id: 'e1', date: '2025-11-14', title: 'Community Meeting', description: 'Monthly meeting', building_id: 'b1' },
                { id: 'e2', date: '2025-11-15', title: 'Maintenance Day', description: 'Scheduled maintenance', building_id: 'b1' }
            ];
            const e = events[Math.floor(Math.random() * events.length)];
            this.id = e.id;
            this.date = e.date;
            this.title = e.title;
            this.description = e.description;
            this.building_id = e.building_id;
        }
        getId() { return this.id; }
        getDate() { return this.date; }
        getTitle() { return this.title; }
        getDescription() { return this.description; }
        getBuildingId() { return this.building_id; }
        toObject() { return { id: this.id, date: this.date, title: this.title, description: this.description, building_id: this.building_id }; }
    }

    class MockListEventsResponse {
        constructor(limit = 10) {
            const num = Math.min(limit, Math.floor(Math.random() * limit) + 1);
            this.events = [];
            for (let i = 0; i < num; i++) {
                this.events.push(new MockEvent());
            }
        }
        getEventsList() { return this.events; }
        toObject() { return { events: this.events.map(e => e.toObject()) }; }
    }

    class MockCreateEventResponse {
        constructor() {
            this.success = true;
            this.message = 'Event created successfully';
            this.event_id = 'event_' + Math.random().toString(36).substr(2, 9);
        }
        getSuccess() { return this.success; }
        getMessage() { return this.message; }
        getEventId() { return this.event_id; }
        toObject() { return { success: this.success, message: this.message, event_id: this.event_id }; }
    }

    class MockContactFormResponse {
        constructor() {
            this.success = true;
            this.message = 'Message sent successfully';
        }
        getSuccess() { return this.success; }
        getMessage() { return this.message; }
        toObject() { return { success: this.success, message: this.message }; }
    }

    class MockOfferResponse {
        constructor() {
            this.success = true;
            this.message = 'Offer request submitted';
        }
        getSuccess() { return this.success; }
        getMessage() { return this.message; }
        toObject() { return { success: this.success, message: this.message }; }
    }

    class MockPresentationResponse {
        constructor() {
            this.success = true;
            this.message = 'Presentation request submitted';
        }
        getSuccess() { return this.success; }
        getMessage() { return this.message; }
        toObject() { return { success: this.success, message: this.message }; }
    }

    // Mock clients
    const mockHealthService = {
        check: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockHealthCheckResponse()), Math.random() * 100 + 50);
            });
        }
    };

    const mockAuthService = {
        login: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockLoginResponse()), Math.random() * 300 + 200);
            });
        },
        register: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockRegisterResponse()), Math.random() * 200 + 100);
            });
        },
        refreshToken: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockRefreshTokenResponse()), Math.random() * 150 + 50);
            });
        },
        forgotPassword: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockForgotPasswordResponse()), Math.random() * 200 + 100);
            });
        }
    };

    const mockUserService = {
        getProfile: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockUserProfile()), Math.random() * 200 + 100);
            });
        },
        updateProfile: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockUpdateProfileResponse()), Math.random() * 150 + 50);
            });
        }
    };

    const mockBuildingService = {
        getBuilding: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockBuilding()), Math.random() * 150 + 50);
            });
        },
        listApartments: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockListApartmentsResponse()), Math.random() * 200 + 100);
            });
        }
    };

    const mockFinancialService = {
        getFinancialReport: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockFinancialReport()), Math.random() * 300 + 200);
            });
        },
        getPaymentHistory: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockPaymentHistory()), Math.random() * 250 + 150);
            });
        }
    };

    const mockEventService = {
        listEvents: (req, metadata) => {
            const limit = req.getLimit ? req.getLimit() : 10;
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockListEventsResponse(limit)), Math.random() * 200 + 100);
            });
        },
        createEvent: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockCreateEventResponse()), Math.random() * 150 + 50);
            });
        }
    };

    const mockContactService = {
        sendContactForm: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockContactFormResponse()), Math.random() * 200 + 100);
            });
        },
        requestOffer: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockOfferResponse()), Math.random() * 150 + 50);
            });
        },
        requestPresentation: (req, metadata) => {
            return new Promise((resolve) => {
                setTimeout(() => resolve(new MockPresentationResponse()), Math.random() * 200 + 100);
            });
        }
    };

    clients = {
        HealthService: mockHealthService,
        AuthService: mockAuthService,
        UserService: mockUserService,
        BuildingService: mockBuildingService,
        FinancialService: mockFinancialService,
        EventService: mockEventService,
        ContactService: mockContactService
    };

}

const grpcService = {
    clients
};

export default grpcService;