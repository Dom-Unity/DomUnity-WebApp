# --- Build stage ---
FROM rust:1.81-bookworm AS builder

WORKDIR /app

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Copy proto files first (from repo root context)
COPY proto ./proto

# Copy Cargo manifests and build.rs
COPY backend/Cargo.toml backend/build.rs ./

# Create a dummy main.rs to cache dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy actual source code
COPY backend/src ./src
COPY backend/migrations ./migrations

# Build the real application
RUN cargo build --release

# --- Runtime stage ---
FROM debian:bookworm-slim

# Create non-root user
RUN useradd -m -u 10001 appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/server /app/server

# Copy migrations
COPY --from=builder /app/migrations ./migrations

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Render sets PORT environment variable dynamically
ENV PORT=8080
ENV RUST_LOG=info

# Expose port (Render will override with $PORT)
EXPOSE 8080

# Health check (optional, Render uses HTTP endpoint)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# Run the server
CMD ["./server"]
