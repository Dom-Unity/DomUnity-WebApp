FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git postgresql-client protobuf-dev

# Copy go mod files
COPY backend-go/go.mod backend-go/go.sum ./
RUN go mod download

# Copy proto files and generate code
COPY proto ../proto
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.34.2 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1
ENV PATH="/go/bin:${PATH}"
RUN mkdir -p proto && \
    protoc --go_out=./proto --go_opt=paths=source_relative \
    --go-grpc_out=./proto --go-grpc_opt=paths=source_relative \
    -I../proto ../proto/domunity.proto

# Copy source code (test files excluded via .dockerignore)
COPY backend-go/ .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates postgresql-client

WORKDIR /root/

COPY --from=builder /app/server .

EXPOSE 50051

CMD ["./server"]
