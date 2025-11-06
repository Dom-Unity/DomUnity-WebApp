# DomUnity - Full Stack Application

Modern property management platform built with **React** frontend, **Rust** gRPC backend, and **PostgreSQL** database.

## 🏗️ Tech Stack

### Backend
- **Rust** with **Tonic** (gRPC framework)
- **PostgreSQL** database
- **SQLx** for database operations
- **JWT** authentication with bcrypt
- **Protocol Buffers** for API definitions

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast development
- **Connect-Web** (gRPC-Web client)
- **React Router** for navigation
- **React Query** for state management
- **CSS Modules** for styling

## 📁 Project Structure

```
UI/
├── backend/                 # Rust gRPC server
│   ├── src/
│   │   ├── main.rs
│   │   ├── services/        # gRPC service implementations
│   │   ├── db/              # Database models & pool
│   │   └── utils/           # JWT, password, validation
│   ├── migrations/          # SQL migrations
│   ├── Cargo.toml
│   └── build.rs
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── api/             # gRPC clients
│   │   ├── context/         # React contexts
│   │   ├── gen/             # Generated TypeScript from protos
│   │   └── styles/          # CSS files
│   ├── package.json
│   └── vite.config.ts
├── proto/                   # Protocol Buffer definitions
│   └── api/v1/
│       ├── auth.proto
│       ├── contact.proto
│       └── offer.proto
└── docker-compose.yml       # PostgreSQL setup
```

## 🚀 Getting Started

### Prerequisites

- **Rust** (1.70+): Install from [rustup.rs](https://rustup.rs/)
- **Node.js** (18+): Install from [nodejs.org](https://nodejs.org/)
- **PostgreSQL** (14+): Or use Docker Compose
- **Protocol Buffers Compiler**: `brew install protobuf` (macOS) or download from [GitHub](https://github.com/protocolbuffers/protobuf/releases)

### 1. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# Create docker-compose.yml in project root (see below)
docker-compose up -d
```

#### Option B: Local PostgreSQL

```bash
# Create database
createdb domunity

# Or using psql
psql postgres
CREATE DATABASE domunity;
```

### 2. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/domunity

# Build the project (this will generate Rust code from .proto files)
cargo build

# Run migrations
cargo install sqlx-cli --no-default-features --features postgres
sqlx database create
sqlx migrate run

# Run the server
cargo run

# Server will start on http://localhost:50051
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# The proto files need to be compiled to TypeScript
# Install buf CLI globally
npm install -g @bufbuild/buf

# Generate TypeScript code from proto files
npm run generate-proto

# Start development server
npm run dev

# Frontend will start on http://localhost:5173
```

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://domunity:password@localhost:5432/domunity
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
RUST_LOG=info,domunity_backend=debug
SERVER_HOST=127.0.0.1
SERVER_PORT=50051
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:50051
```

## 🐳 Docker Compose Configuration

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: domunity-db
    environment:
      POSTGRES_USER: domunity
      POSTGRES_PASSWORD: password
      POSTGRES_DB: domunity
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U domunity"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## 🔧 Development Workflow

### Backend Development

```bash
cd backend

# Run in watch mode (requires cargo-watch)
cargo install cargo-watch
cargo watch -x run

# Run tests
cargo test

# Format code
cargo fmt

# Lint
cargo clippy
```

### Frontend Development

```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Regenerate proto files after changes
npm run generate-proto
```

## 📋 API Documentation

### Authentication
- `Login(LoginRequest)` - User login
- `Signup(SignupRequest)` - User registration  
- `RefreshToken(RefreshTokenRequest)` - Refresh access token
- `GetCurrentUser()` - Get logged-in user info

### Contact
- `SubmitContact(ContactRequest)` - Submit contact form
- `SubscribeNewsletter(NewsletterRequest)` - Subscribe to newsletter

### Offers
- `SubmitOffer(OfferRequest)` - Request a property management offer
- `RequestPresentation(PresentationRequest)` - Schedule a presentation

## 🔒 Security Features

- ✅ Bcrypt password hashing
- ✅ JWT token authentication  
- ✅ HTTPS/TLS support
- ✅ CORS configuration
- ✅ Input validation (client & server)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Password strength requirements

## 📱 Features

### Completed
- ✅ User authentication (login/signup)
- ✅ Contact form submission
- ✅ Offer request system
- ✅ Presentation scheduling
- ✅ Newsletter subscription
- ✅ Responsive design system
- ✅ Form validation
- ✅ Error handling

### To Complete (Next Steps)

1. **Copy images folder** from root to `frontend/public/images/`
2. **Create React components** from existing HTML:
   - Header component
   - Footer component
   - Home page
   - Login/Signup pages
   - Contact page
   - Offer page
3. **Add routing** with React Router
4. **Style components** using CSS modules
5. **Connect forms** to gRPC backend
6. **Add loading states** and error boundaries
7. **Implement protected routes**

## 🎨 Design System

Colors defined in `frontend/src/styles/variables.css`:
- Primary: `#2f5233`
- Secondary: `#88ae8d`
- Accent: `#c8f5ce`
- Light backgrounds: `#d6f5d0`, `#eaffea`

## 🧪 Testing

### Backend Tests
```bash
cd backend
cargo test
```

### Frontend Tests  
```bash
cd frontend
npm test
```

## 📦 Production Deployment

### Backend
```bash
cd backend
cargo build --release
./target/release/server
```

### Frontend
```bash
cd frontend
npm run build
# Serve the dist/ folder with any static host
```

### Deploy Options
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Backend**: Railway, Fly.io, AWS ECS, Google Cloud Run
- **Database**: AWS RDS, Supabase, Railway

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linters
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file

## 🆘 Troubleshooting

### "Cannot connect to database"
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Verify database exists: `psql -l`

### "Proto generation failed"
- Install buf: `npm install -g @bufbuild/buf`
- Check proto files syntax
- Run `buf build` in proto directory

### "CORS errors in browser"
- Ensure backend SERVER is configured with correct FRONTEND_URL
- Check browser console for exact error
- Verify gRPC-Web layer is enabled in backend

## 📞 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ using Rust, React, and gRPC**
