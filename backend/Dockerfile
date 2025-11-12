# --- Build stage ---
FROM rust:bookworm AS builder

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
    libpq5 \
    coreutils \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/server /app/server

# Copy migrations
COPY --from=builder /app/migrations ./migrations

# Create a startup script to handle errors better
RUN echo '#!/bin/sh\n\
set -ex\n\
echo "Starting DomUnity backend..."\n\
echo "PORT=${PORT:-8080}"\n\
echo "RUST_LOG=${RUST_LOG:-info}"\n\
echo "DATABASE_URL is set: $(test -n \"$DATABASE_URL\" && echo yes || echo no)"\n\
ls -lh /app/server || echo "Binary not found!"\n\
echo "Testing binary execution..."\n\
./server --version 2>&1 || echo "Binary test failed with code $?"\n\
echo "Executing server..."\n\
exec ./server\n\
' > /app/start.sh && chmod +x /app/start.sh

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Render sets PORT environment variable dynamically
ENV PORT=8080
ENV RUST_LOG=info

# Expose port (Render will override with $PORT)
EXPOSE 8080

# Run the server via startup script
CMD ["/app/start.sh"]
