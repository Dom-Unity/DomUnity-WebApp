# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install protoc if needed, but since we are copying generated files, not strictly necessary
# unless we want to generate them inside the container.

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final stage
FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/main .
# Copy .env.example as .env if needed, but usually passed via environment variables
COPY .env.example .env

EXPOSE 8080 50051

CMD ["./main"]
