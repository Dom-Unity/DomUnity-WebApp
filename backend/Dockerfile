# Build stage
FROM rustlang/rust:nightly-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Copy proto files (from root context)
COPY proto ./proto

# Copy manifests
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/build.rs ./

# Copy source tree
COPY backend/src ./src
COPY backend/migrations ./migrations

# Build application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/server /app/server

# Copy migrations from build context
COPY backend/migrations ./migrations

# Expose port
EXPOSE 50051

# Run the binary
CMD ["./server"]
