# DomUnity - Property Management Platform

![CI Status](https://github.com/Alex-Tsvetanov/DomUnity-WebApp/workflows/CI%20-%20Backend%20Tests%20and%20Docker%20Build/badge.svg)

A modern property management platform for Bulgarian residential buildings, featuring a React frontend and a backend that serves both a REST/JSON API (used by the frontend) and gRPC. Two interchangeable backend implementations are provided: Python (the deployed default) and Node.js.

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Static SPA)  │
└────────┬────────┘
         │ HTTPS (REST / JSON)
         │
    ┌────┴──────────────────┐
    │  Choose ONE Backend:  │
    ├───────────┬───────────┤
    │  Python   │  Node.js  │
    │ REST+gRPC │ REST+gRPC │
    └─────┬─────┴─────┬─────┘
          │           │
          └─────┬─────┘
                │
      ┌─────────┴─────────┐
      │     MongoDB       │
      │  (e.g. Atlas)     │
      └───────────────────┘
```

> **Note:** The React frontend talks to the backend over the **REST/JSON API** (see the endpoint list below). The backend also exposes the same operations over gRPC, but the frontend does not use gRPC-Web.

## 🚀 Features

### User Features
- 🔐 **Authentication**: Secure JWT-based login/signup with bcrypt password hashing
- 👤 **User Profiles**: Personal information management
- 🏢 **Building Management**: View building details, apartments, entrances
- 💰 **Financial Reports**: Detailed monthly billing and payment tracking
- 📅 **Events**: Community events and announcements
- 📧 **Contact Forms**: Send inquiries, request offers/presentations

### Technical Features
- **REST/JSON API**: The interface the React frontend actually uses
- **gRPC Services**: The same operations are also exposed over gRPC
- **HTTP Health Checks**: `/health` endpoint for monitoring (compatible with Render.com)
- **Two Backend Options**: Python (deployed default) or Node.js — pick one
- **MongoDB Database**: Document storage with automatic index + sample-data initialization
- **Docker Deployment**: Containerized backends for easy deployment
- **Comprehensive Logging**: Extensive logging in both backends for debugging
- **Frankfurt Region**: Low-latency deployment for Bulgarian users

## 📋 Backend Comparison

| Feature | Python | Node.js |
|---------|--------|---------|
| **Runtime** | Python 3.11 | Node 20 |
| **Status** | Deployed default | Drop-in alternative |
| **Dependencies** | grpcio, pymongo, bcrypt, PyJWT | @grpc/grpc-js, mongodb, bcrypt, jsonwebtoken |
| **Docker Image Size** | ~500MB | ~200MB |
| **Best For** | Rapid development, Python familiarity | JavaScript/TypeScript teams |

Both backends expose an identical REST + gRPC surface over the same MongoDB
collections, so the frontend works against either without changes.

> A Go backend is mentioned in some historical notes but is **not** part of this
> repository.

## 🗂️ Database Schema (MongoDB collections)

Documents use Mongo `ObjectId` (`_id`) as identifiers and reference each other by
`ObjectId`. Indexes are created automatically on startup.

```
users               { _id, email (unique), password_hash, full_name, phone, role, is_active, created_at }
user_profiles       { _id, user_id, account_manager, balance, client_number, contract_end_date }
buildings           { _id, address, entrance, total_apartments, total_residents }
apartments          { _id, building_id, number, floor, type, residents, user_id }   # (building_id, number) unique
events              { _id, building_id, date, title, description, created_at }
payments            { _id, user_id, apartment_id, amount, period, status, paid_date, created_at }
maintenance_records { _id, building_id, date, description, cost, status }
financial_records   { _id, apartment_id, period, elevator_gtp, elevator_electricity, ... , total_due }
contact_requests    { _id, name, email, phone, message, type, created_at }
```

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0**: UI framework
- **React Router DOM 6.21.1**: Client-side routing
- **CSS3**: Styling with modern flexbox/grid layouts
- **Bulgarian Language**: Full UI in Bulgarian

### Backend Options

#### Python Backend
- **grpcio**: gRPC framework
- **pymongo**: MongoDB driver
- **bcrypt**: Password hashing
- **PyJWT**: JWT token generation

#### Node.js Backend
- **@grpc/grpc-js**: gRPC framework
- **mongodb**: MongoDB driver
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT tokens

## 🔗 Frontend ↔ Backend Integration

The React frontend calls the backend's REST/JSON API (see [`frontend/src/services/apiService.js`](frontend/src/services/apiService.js)). The endpoints implemented by both backends are:

| Method & path | Purpose | Auth |
|---|---|---|
| `GET /health` | Health check (DB status) | — |
| `POST /api/auth/login` | Login (`{ email, password }`) | — |
| `POST /api/auth/register` | Registration | — |
| `POST /api/auth/refresh` | Refresh access token | — |
| `POST /api/auth/forgot` | Record a password-reset request | — |
| `POST /api/user/password` | Change password (`{ old_password, new_password }`) | Bearer |
| `GET /api/user/profile` | Current user's profile, payments & events | Bearer |
| `GET /api/user/apartment` | Current user's apartment, payments & maintenance | Bearer |
| `GET /api/building/:id/apartments` | Apartments grouped by floor | Bearer |
| `GET /api/building/:id/maintenance` | Building maintenance records | Bearer |
| `GET /api/admin/residents` | All residents (admin role required) | Bearer (admin) |
| `POST /api/payments/pay` | Mark a payment as paid (`{ payment_id }`) | Bearer |
| `POST /api/contact/form` | Contact form | — |
| `POST /api/contact/offer` | Request an offer | — |
| `POST /api/contact/presentation` | Request a presentation | — |

The `:id` path segment for building endpoints may be any value — if it is not a
valid `ObjectId`, the backend resolves the building from the authenticated user's
apartment.

To point the frontend at your backend, set `REACT_APP_BACKEND_URL` to your
backend's Render service name before building (see the Frontend env vars below).

## Setting Up grpc-web (optional)

If you prefer using gRPC in the browser (grpc-web), generate JS client stubs and run a grpc-web proxy (Envoy or the backend's built-in proxy).

1. Install `protoc` and `protoc-gen-grpc-web` on your machine (see https://github.com/grpc/grpc-web for downloads).

2. Generate the JS/TS client stubs from the `proto/domunity.proto` file:

```bash
# from `frontend/` directory
# Two options to generate client code are provided in `frontend/package.json`:

# `pbjs` (protobufjs) – generates a static JS module useful for runtime-only parsing/encoding
#    (you already have a `generate-proto` script that runs `pbjs`). Example:
npm run generate-proto
```

3. The command outputs JS files into `src/proto/`. The app tries to load these generated files at runtime; after generation, the `grpcService` wrapper will use grpc-web automatically.

4. Configure your backend (or Envoy) to accept grpc-web requests and forward them to the gRPC server. Set `REACT_APP_GRPC_HOST` to the grpc-web endpoint (e.g. `https://api.example.com`).

Note: grpc-web requires an HTTP/1.1 compatible proxy such as Envoy or a backend that supports grpc-web.

### Database
- **MongoDB**: Document database (e.g. MongoDB Atlas free tier). Not provisioned by Render — set `MONGODB_URI` as a secret.

## 📦 Project Structure

```
DomUnity-WebApp/
├── proto/
│   └── domunity.proto              # gRPC service definitions
├── backend-python/                 # Deployed default (REST + gRPC, MongoDB)
│   ├── server.py                   # gRPC servicers + REST API handler
│   ├── db.py                       # MongoDB connection, indexes, sample data
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── generate_proto.sh
│   ├── test_unit.py / test_integration.py
│   └── .env.example
├── backend-nodejs/                 # Drop-in alternative (REST + gRPC, MongoDB)
│   ├── server.js                   # gRPC servicers + REST API
│   ├── db.js                       # MongoDB connection, indexes, sample data
│   ├── Dockerfile
│   ├── package.json
│   ├── test/                       # Jest unit & integration tests
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx                 # Main app & routing
│   │   ├── components/             # Header, Footer
│   │   ├── pages/                  # Home, Login, Signup, Profile, Apartment, …
│   │   └── services/apiService.js  # REST client
│   └── package.json
├── render.yaml                     # Render.com deployment config
├── README.md                       # This file
├── QUICKSTART.md                   # Fast deployment guide
└── DEPLOYMENT.md                   # Detailed deployment docs
```

## 🔧 Environment Variables

### Backend Environment Variables (both backends use the same variables)

```bash
# MongoDB connection string (set as a secret on Render).
# Backends also accept DATABASE_URL if it begins with "mongodb".
MONGODB_URI=mongodb+srv://user:password@cluster/domunity

# JWT Secret (generate a random string)
JWT_SECRET=your-secret-key-here

# Server Configuration
GRPC_PORT=50051              # gRPC server port
HTTP_PORT=8080               # HTTP/REST port (health checks + API)
PORT=8080                    # Render injects PORT; used as HTTP port fallback
```

### Frontend Environment Variables

```bash
# Render backend service NAME (the frontend builds https://<name>.onrender.com)
REACT_APP_BACKEND_URL=domunity-backend-python
```

## 🧪 Testing & Continuous Integration

This project includes CI/CD with GitHub Actions that runs:
- ✅ **Unit Tests** for both backends
- ✅ **Integration Tests** against MongoDB
- ✅ **Docker Build Verification** for both images
- ✅ **Frontend Build Tests**
- ✅ **Render.yaml Configuration Validation**
- ✅ **Security Scanning** with Trivy

### Running Tests Locally

```bash
# Run all tests
./run-tests.sh

# Or test individual backends (integration tests need a local MongoDB)
cd backend-python && pytest -v        # uses TEST_MONGODB_URI (default mongodb://localhost:27017/domunity_test)
cd backend-nodejs && npm test         # uses TEST_MONGODB_URI

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
1. **Database Connection Fails**: Check the `MONGODB_URI` environment variable
2. **Frontend Can't Connect**: Verify `REACT_APP_BACKEND_URL` is set correctly
3. **Proto Compilation Errors**: Ensure `protoc` is installed in Docker image

## ⚠️ Known Limitations

1. **fromService.property.host**: Returns only the hostname (e.g., `domunity-backend-python-hegi`) without `.onrender.com`. The frontend appends `.onrender.com` (see `apiService.js`).

2. **Free Tier Sleep**: Render.com free tier services sleep after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up.

3. **gRPC-Web**: Not used by the frontend. The frontend talks to the REST/JSON API; gRPC is available for other clients but has no browser gRPC-Web proxy.

## 📈 Scaling Considerations

- **Horizontal Scaling**: Both backends are stateless and can scale horizontally
- **Caching**: Consider adding Redis for session storage and caching
- **CDN**: Frontend static assets can be served via CDN

## 🔒 Security

- ✅ **Password Hashing**: bcrypt
- ✅ **JWT Tokens**: HS256 algorithm, 24-hour access tokens
- ✅ **NoSQL Injection Prevention**: Queries use typed `ObjectId`/field filters, not string concatenation
- ✅ **Admin Authorization**: `/api/admin/residents` requires a user whose `role` is `admin`
- ✅ **HTTPS**: Enforced by Render.com
- ⚠️ **CORS**: Currently open (`Access-Control-Allow-Origin: *`) — restrict to your domain for production
- ⚠️ **Rate Limiting**: Not implemented (add a proxy or middleware)

## 🤝 Contributing

1. Choose your preferred backend (Python or Node.js)
2. Make changes to the relevant backend directory — keep the REST contract in sync between both
3. Test locally (a local MongoDB is needed for integration tests)
4. Update `proto/domunity.proto` if adding new gRPC services
5. Update `frontend/src/services/apiService.js` to consume new endpoints

## 📝 License

See [LICENSE](./LICENSE) file for details.

## 📞 Support

For issues or questions:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
- Review Render.com logs for error messages
- Verify environment variables are set correctly

---

**Built for Bulgarian property management communities** 🇧🇬
