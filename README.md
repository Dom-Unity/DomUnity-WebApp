# DomUnity - Property Management Platform

![CI Status](https://github.com/YOUR_USERNAME/DomUnity-WebApp/workflows/CI%20-%20Backend%20Tests%20and%20Docker%20Build/badge.svg)

A modern property management platform for Bulgarian residential buildings, featuring a React frontend and multiple gRPC backend options (Python, Go, Node.js).

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Static SPA)  │
└────────┬────────┘
         │ HTTP/gRPC-Web
         │
    ┌────┴─────────────────────┐
    │   Choose ONE Backend:    │
    ├──────────┬───────┬───────┤
    │  Python  │  Go   │Node.js│
    │  gRPC    │ gRPC  │ gRPC  │
    └────┬─────┴───┬───┴───┬───┘
         │         │       │
         └─────────┼───────┘
                   │
         ┌─────────┴─────────┐
         │  PostgreSQL DB    │
         │  (Render.com)     │
         └───────────────────┘
```

## 🚀 Features

### User Features
- 🔐 **Authentication**: Secure JWT-based login/signup with bcrypt password hashing
- 👤 **User Profiles**: Personal information management
- 🏢 **Building Management**: View building details, apartments, entrances
- 💰 **Financial Reports**: Detailed monthly billing and payment tracking
- 📅 **Events**: Community events and announcements
- 📧 **Contact Forms**: Send inquiries, request offers/presentations

### Technical Features
- **gRPC Services**: High-performance RPC communication
- **HTTP Health Checks**: Standard REST endpoint for monitoring (compatible with Render.com)
- **Multiple Backend Options**: Choose Python, Go, or Node.js based on your preferences
- **PostgreSQL Database**: Relational data storage with automatic schema initialization
- **Docker Deployment**: Containerized backends for easy deployment
- **Comprehensive Logging**: Extensive logging in all backends for debugging
- **Frankfurt Region**: Low-latency deployment for Bulgarian users

## 📋 Backend Comparison

| Feature | Python | Go | Node.js |
|---------|--------|-----|---------|
| **Runtime** | Python 3.11 | Go 1.21 | Node 20 |
| **Performance** | Good | Excellent | Very Good |
| **Memory Usage** | Medium | Low | Medium-Low |
| **Startup Time** | Fast | Very Fast | Fast |
| **Dependencies** | grpcio, psycopg2, bcrypt, PyJWT | grpc, lib/pq, bcrypt, jwt | @grpc/grpc-js, pg, bcrypt, jsonwebtoken |
| **Docker Image Size** | ~500MB | ~50MB (multi-stage) | ~200MB |
| **Learning Curve** | Easy | Medium | Easy |
| **Best For** | Rapid development, Python familiarity | Production performance, low resources | JavaScript/TypeScript teams |

**Recommendation**: 
- **Choose Python** if: Your team knows Python, you want fast development
- **Choose Go** if: You need maximum performance and minimal resource usage
- **Choose Node.js** if: Your team is JavaScript-focused or wants unified JS stack

## 🗂️ Database Schema

```sql
-- Users table with authentication
users (id, username, email, password_hash, created_at)

-- User profile information
user_profiles (id, user_id, full_name, phone, building_id, entrance, apartment)

-- Building information
buildings (id, name, address, city, postal_code, total_apartments, year_built)

-- Apartment details
apartments (id, building_id, apartment_number, entrance, floor, area, residents_count)

-- Financial records
financial_records (id, user_id, building_id, apartment_id, month, year, amount, paid, description)

-- Community events
events (id, building_id, title, description, event_date, created_by, created_at)

-- Contact form submissions
contact_requests (id, name, email, phone, message, request_type, created_at)
```

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0**: UI framework
- **React Router DOM 6.21.1**: Client-side routing
- **CSS3**: Styling with modern flexbox/grid layouts
- **Bulgarian Language**: Full UI in Bulgarian

### Backend Options

#### Python Backend
- **grpcio 1.60.0**: gRPC framework
- **psycopg2-binary 2.9.9**: PostgreSQL driver
- **bcrypt 4.1.2**: Password hashing
- **PyJWT 2.8.0**: JWT token generation

#### Go Backend
- **google.golang.org/grpc 1.60.1**: gRPC framework
- **github.com/lib/pq 1.10.9**: PostgreSQL driver
- **golang.org/x/crypto/bcrypt**: Password hashing
- **github.com/golang-jwt/jwt/v5**: JWT tokens

#### Node.js Backend
- **@grpc/grpc-js 1.9.14**: gRPC framework
- **pg 8.11.3**: PostgreSQL client
- **bcrypt 5.1.1**: Password hashing
- **jsonwebtoken 9.0.2**: JWT tokens

### Database
- **PostgreSQL 15**: Relational database on Render.com free tier

## 📦 Project Structure

```
UI/
├── proto/
│   └── domunity.proto              # gRPC service definitions
├── backend-python/
│   ├── server.py                   # Main gRPC server
│   ├── db.py                       # Database operations
│   ├── Dockerfile                  # Container image
│   ├── requirements.txt            # Python dependencies
│   ├── generate_proto.sh           # Proto compilation script
│   └── .env.example                # Environment template
├── backend-go/
│   ├── main.go                     # Entry point & auth service
│   ├── services.go                 # Other gRPC services
│   ├── Dockerfile                  # Multi-stage build
│   ├── go.mod                      # Go dependencies
│   └── .env.example                # Environment template
├── backend-nodejs/
│   ├── server.js                   # Main gRPC server
│   ├── db.js                       # Database operations
│   ├── Dockerfile                  # Container image
│   ├── package.json                # Node dependencies
│   └── .env.example                # Environment template
├── frontend/
│   ├── public/
│   │   └── index.html              # HTML template
│   ├── src/
│   │   ├── App.js                  # Main app & routing
│   │   ├── components/             # Reusable components
│   │   │   ├── Header.js           # Navigation header
│   │   │   └── Footer.js           # Site footer
│   │   └── pages/                  # Page components
│   │       ├── Home.js             # Landing page
│   │       ├── Login.js            # Login form
│   │       ├── Signup.js           # Registration form
│   │       ├── Profile.js          # User dashboard
│   │       ├── Contacts.js         # Contact form
│   │       └── Offer.js            # Offer request
│   └── package.json                # Frontend dependencies
├── render.yaml                     # Render.com deployment config
├── README.md                       # This file
├── QUICKSTART.md                   # Fast deployment guide
└── DEPLOYMENT.md                   # Detailed deployment docs
```

## 🔧 Environment Variables

### Backend Environment Variables (All backends use same variables)

```bash
# Database Connection (provided by Render.com automatically)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Secret (generate a random string)
JWT_SECRET=your-secret-key-here

# Server Configuration
GRPC_PORT=50051              # gRPC server port
HTTP_PORT=8080               # HTTP/REST port (for health checks)
```

### Frontend Environment Variables

```bash
# Backend URL (provided by Render.com via fromService)
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

## 🧪 Testing & Continuous Integration

This project includes comprehensive CI/CD with GitHub Actions that runs:
- ✅ **Unit Tests** for all three backends
- ✅ **Integration Tests** with PostgreSQL
- ✅ **Docker Build Verification** for all images
- ✅ **Frontend Build Tests**
- ✅ **Render.yaml Configuration Validation**
- ✅ **Security Scanning** with Trivy

### Running Tests Locally

```bash
# Run all tests
./run-tests.sh

# Or test individual backends
cd backend-python && pytest -v
cd backend-nodejs && npm test
cd backend-go && go test -v ./...

# Test Docker builds
./test-docker-builds.sh
```

See [CI_SETUP.md](./CI_SETUP.md) for detailed testing documentation.

## 🚀 Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute deployment guide.

## 📚 Detailed Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions.

## 🔍 gRPC Services

### AuthService
- `Login(LoginRequest) → LoginResponse`: Authenticate user
- `Register(RegisterRequest) → RegisterResponse`: Create new account
- `RefreshToken(RefreshTokenRequest) → RefreshTokenResponse`: Renew JWT
- `ForgotPassword(ForgotPasswordRequest) → ForgotPasswordResponse`: Password reset

### UserService
- `GetProfile(GetProfileRequest) → UserProfile`: Fetch user profile
- `UpdateProfile(UpdateProfileRequest) → UserProfile`: Update profile info

### BuildingService
- `GetBuilding(GetBuildingRequest) → Building`: Get building details
- `ListApartments(ListApartmentsRequest) → ListApartmentsResponse`: List all apartments
- `GetApartment(GetApartmentRequest) → Apartment`: Get specific apartment

### FinancialService
- `GetFinancialReport(FinancialReportRequest) → FinancialReportResponse`: Monthly billing

### EventService
- `ListEvents(ListEventsRequest) → ListEventsResponse`: Get community events
- `CreateEvent(CreateEventRequest) → Event`: Post new event

### ContactService
- `SendContactForm(ContactFormRequest) → ContactFormResponse`: Submit contact form
- `RequestOffer(OfferRequest) → OfferResponse`: Request service offer
- `RequestPresentation(PresentationRequest) → PresentationResponse`: Request demo

### HealthService
- `Check(HealthCheckRequest) → HealthCheckResponse`: Service health status

## 🐛 Debugging & Logging

All backends include extensive logging:

```
================================================================================
STARTING DOMUNITY GRPC SERVER
================================================================================
[TIMESTAMP] Database connection established
[TIMESTAMP] Schema initialized successfully
[TIMESTAMP] gRPC server started on port 50051
================================================================================
```

**Log Locations**:
- **Development**: stdout/stderr (visible in `docker logs`)
- **Render.com**: Available in the Logs tab of each service

**Common Issues**:
1. **Database Connection Fails**: Check `DATABASE_URL` environment variable
2. **Frontend Can't Connect**: Verify `REACT_APP_BACKEND_URL` is set correctly
3. **Proto Compilation Errors**: Ensure `protoc` is installed in Docker image

## ⚠️ Known Limitations

1. **fromService.property.host**: Returns only the hostname (e.g., `domunity-backend-python-hegi`) without `.onrender.com`. The frontend needs to append the full domain or use Render's internal networking.

2. **Free Tier Sleep**: Render.com free tier services sleep after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up.

3. **gRPC-Web**: Currently not implemented. Frontend uses HTTP/JSON endpoints that wrap gRPC calls. For native gRPC-Web, add Envoy proxy.

## 📈 Scaling Considerations

- **Horizontal Scaling**: All backends are stateless and can scale horizontally
- **Database Connection Pooling**: Configured in all backends (max 10 connections)
- **Caching**: Consider adding Redis for session storage and caching
- **CDN**: Frontend static assets can be served via CDN

## 🔒 Security

- ✅ **Password Hashing**: bcrypt with salt rounds (12)
- ✅ **JWT Tokens**: HS256 algorithm, 24-hour expiration
- ✅ **SQL Injection Prevention**: Parameterized queries in all backends
- ✅ **HTTPS**: Enforced by Render.com
- ⚠️ **CORS**: Configure based on your domain requirements
- ⚠️ **Rate Limiting**: Not implemented (add nginx or middleware)

## 🤝 Contributing

1. Choose your preferred backend (Python/Go/Node.js)
2. Make changes to the relevant backend directory
3. Test locally with Docker
4. Update proto file if adding new services
5. Regenerate proto bindings: `./generate_proto.sh`
6. Update frontend to consume new endpoints

## 📝 License

See [LICENSE](./LICENSE) file for details.

## 📞 Support

For issues or questions:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
- Review Render.com logs for error messages
- Verify environment variables are set correctly

---

**Built for Bulgarian property management communities** 🇧🇬
