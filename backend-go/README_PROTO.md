# Go Backend - Proto Generation Note

The Go backend references protobuf-generated code (`pb` package) that is generated during the Docker build process.

## Local Development

If you want to build/run the Go backend locally, you need to generate the proto files first:

```bash
cd backend-go

# Install protoc compiler tools
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate proto files (requires protoc to be installed)
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       -I../proto ../proto/domunity.proto

# Now you can build
go build -v .
```

## CI/CD

The proto files are generated automatically during the Docker build process, so no manual generation is needed for CI/CD.

## Current Status

The `main.go` and `services.go` files have had their proto imports temporarily removed to allow `go mod tidy` to succeed. These will need to be restored once the proto files are properly generated.

To restore, add back:
```go
import (
    pb "github.com/domunity/backend/proto"
)
```
