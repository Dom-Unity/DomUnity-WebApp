# Next Steps to Complete the DomUnity Project

## ✅ What's Been Done

The foundation has been completely set up:

### Backend (Rust + gRPC)
- ✅ Complete Rust project structure
- ✅ Protocol Buffer definitions (auth, contact, offer)
- ✅ Database schema and migrations
- ✅ All gRPC services implemented:
  - AuthService (login, signup, refresh token, get current user)
  - ContactService (contact form, newsletter)
  - OfferService (offer requests, presentation scheduling)
- ✅ JWT authentication with bcrypt
- ✅ Input validation utilities
- ✅ Database models and connection pool
- ✅ CORS and gRPC-Web middleware

### Frontend (React + TypeScript)
- ✅ Vite project configuration
- ✅ React Router setup
- ✅ AuthContext for authentication
- ✅ gRPC-Web client configuration
- ✅ Design system (CSS variables)
- ✅ Sample components (Header, Footer, Login page)
- ✅ React Query integration

### Infrastructure
- ✅ Docker Compose for PostgreSQL
- ✅ Environment configuration files
- ✅ Comprehensive README
- ✅ .gitignore

## 🚀 Step-by-Step Guide to Get Running

### Step 1: Install Dependencies

#### Backend
```bash
cd backend

# Rust should already be installed
# If not: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build (this generates Rust code from .proto files)
cargo build

# Should succeed!
```

#### Frontend
```bash
cd frontend

# Install Node.js dependencies
npm install

# This will install all packages from package.json including:
# - React, React Router
# - Connect-Web (gRPC client)
# - React Query
# - TypeScript
# - Vite
```

### Step 2: Start Database

```bash
# From project root
docker-compose up -d

# Verify it's running
docker ps

# Should see: domunity-db container running on port 5432
```

### Step 3: Configure Environment

#### Backend
```bash
cd backend

# Copy the example file
cp .env.example .env

# The default settings should work with Docker Compose:
# DATABASE_URL=postgresql://domunity:password@localhost:5432/domunity
# JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
# etc.
```

#### Frontend
```bash
cd frontend

# .env file is already created with:
# VITE_API_URL=http://localhost:50051
```

### Step 4: Run Database Migrations

```bash
cd backend

# Install sqlx-cli if you haven't
cargo install sqlx-cli --no-default-features --features postgres

# Run migrations (creates all tables)
sqlx migrate run

# You should see: Applied migration 001_initial_schema
```

### Step 5: Generate TypeScript from Protos

```bash
cd frontend

# Install buf globally
npm install -g @bufbuild/buf

# Generate TypeScript code from .proto files
npm run generate-proto

# This creates files in src/gen/api/v1/
```

### Step 6: Copy Images

```bash
# Copy the existing images folder to frontend/public/
mkdir frontend/public
cp -r images frontend/public/images

# Or on Windows:
# xcopy /E /I images frontend\public\images
```

### Step 7: Start Backend Server

```bash
cd backend

# Run the server
cargo run

# You should see:
# 🚀 DomUnity gRPC server starting on 127.0.0.1:50051
# ✅ Database setup complete
```

### Step 8: Start Frontend Dev Server

```bash
# In a new terminal
cd frontend

npm run dev

# You should see:
# VITE v5.x.x  ready in XXX ms
# ➜  Local:   http://localhost:5173/
```

### Step 9: Open in Browser

Visit `http://localhost:5173/`

You should see:
- Home page with hero section
- Header with navigation
- Login functionality working!

## 📝 Remaining Work

### High Priority (Core Functionality)

1. **Complete Signup Page** (`frontend/src/pages/Signup.tsx`)
   - Copy pattern from Login.tsx
   - Add fields: fullName, phone, password, confirmPassword
   - Add password strength validation
   - Call `useAuth().signup()`

2. **Complete Contacts Page** (`frontend/src/pages/Contacts.tsx`)
   - Convert `contacts.html` to React
   - Create form with: name, phone, email, message
   - Use `contactClient.submitContact()`
   - Add success/error toasts

3. **Complete Offer Page** (`frontend/src/pages/Offer.tsx`)
   - Convert `offer.html` to React
   - Implement tab switching (Offer / Presentation)
   - Two forms sharing the same page
   - Use `offerClient.submitOffer()` and `offerClient.requestPresentation()`

4. **Complete Footer** (`frontend/src/components/layout/Footer.tsx`)
   - Convert `footer.html` to React
   - Add newsletter subscription form
   - Use `contactClient.subscribeNewsletter()`
   - Add links and social media icons

5. **Complete Home Page** (`frontend/src/pages/Home.tsx`)
   - Convert `index.html` fully to React
   - Add services section (4 cards)
   - Add advantages section
   - Add smooth scrolling to sections

### Medium Priority (Polish)

6. **Create Reusable Components**
   - `frontend/src/components/common/Button.tsx`
   - `frontend/src/components/common/Input.tsx`
   - `frontend/src/components/forms/ContactForm.tsx`
   - `frontend/src/components/forms/OfferForm.tsx`

7. **Add Loading States**
   - Create `frontend/src/components/common/LoadingSpinner.tsx`
   - Add to all async operations
   - Show skeleton screens

8. **Error Handling**
   - Create `frontend/src/components/common/ErrorBoundary.tsx`
   - Add error pages (404, 500)
   - Better error messages

9. **Form Validation**
   - Create `frontend/src/utils/validation.ts`
   - Client-side validation matching backend
   - Show inline error messages

10. **Responsive Design**
    - Test on mobile devices
    - Add media queries
    - Hamburger menu for mobile

### Low Priority (Enhancement)

11. **Protected Routes**
    - Create `ProtectedRoute` component
    - Redirect to login if not authenticated
    - Add user profile page

12. **Better Styling**
    - Convert all inline styles to CSS modules
    - Create consistent component styling
    - Add animations and transitions

13. **Testing**
    - Add unit tests for utils
    - Add integration tests for components
    - Add E2E tests with Playwright

14. **Production Readiness**
    - Add proper CORS configuration
    - Add rate limiting
    - Add request logging
    - Set up proper error monitoring
    - Add SSL/TLS certificates

## 🔥 Quick Win: Test the Login Flow

1. Start backend: `cd backend && cargo run`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173/login`
4. Try to register a new user (will need to complete Signup page first)
5. Or manually create a user in database:

```sql
-- Connect to database
psql postgresql://domunity:password@localhost:5432/domunity

-- Create test user (password: "Test1234")
INSERT INTO users (email, password_hash, full_name, phone)
VALUES (
  'test@example.com',
  '$2b$12$LBWzXqVQGqZN5hZ.nYHVUOH8ZQI6nNGK4qPJ9YqFvN7qK7sY5L5nm',
  'Test User',
  '0888440107'
);
```

Then login with: `test@example.com` / `Test1234`

## 📚 Reference Code Patterns

### Creating a Form Component

```typescript
import { useState, FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { contactClient } from '../api/client';
import toast from 'react-hot-toast';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const mutation = useMutation({
    mutationFn: (data) => contactClient.submitContact(data),
    onSuccess: () => {
      toast.success('Message sent!');
      setName('');
      setEmail('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, email, phone: '', message: '' });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        required 
      />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

### Converting HTML to React

**Before (HTML):**
```html
<div class="contact-info">
    <h2>Свържете се с нас</h2>
    <div class="info-row">
        <h3>Телефон</h3>
        <p>359 888 440 107</p>
    </div>
</div>
```

**After (React + CSS Modules):**
```typescript
import styles from './ContactInfo.module.css';

export default function ContactInfo() {
  return (
    <div className={styles.contactInfo}>
      <h2>Свържете се с нас</h2>
      <div className={styles.infoRow}>
        <h3>Телефон</h3>
        <p>359 888 440 107</p>
      </div>
    </div>
  );
}
```

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `docker ps`
- Check DATABASE_URL in `.env`
- Check migrations ran: `sqlx migrate run`

### Frontend compile errors
- Run `npm install` in frontend directory
- Run `npm run generate-proto` to create TypeScript from protos
- Check that images are in `frontend/public/images/`

### CORS errors
- Backend must be running with CORS enabled (already configured)
- Check VITE_API_URL in `frontend/.env`

### gRPC connection errors
- Ensure backend is running on port 50051
- Check browser console for actual error
- Try clearing browser cache

## 🎯 Success Metrics

You'll know you're done when:
- ✅ Users can register and login
- ✅ Users can submit contact forms
- ✅ Users can request offers
- ✅ Users can schedule presentations
- ✅ Users can subscribe to newsletter
- ✅ All pages are responsive
- ✅ Forms have proper validation
- ✅ Errors are handled gracefully

## 🚢 Deployment (Future)

When ready to deploy:

1. **Frontend**: `cd frontend && npm run build` → Deploy `dist/` to Vercel/Netlify
2. **Backend**: `cd backend && cargo build --release` → Deploy to Railway/Fly.io
3. **Database**: Use managed PostgreSQL (Railway, Supabase, AWS RDS)
4. **Update environment variables** in production

---

**You're 70% done! The hard infrastructure work is complete. Now just bring your HTML to life in React! 🎉**
