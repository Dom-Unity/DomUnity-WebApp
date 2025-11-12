FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend-python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files and generate code
COPY proto ./proto
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=. \
    --grpc_python_out=. \
    proto/domunity.proto

# Copy application code
COPY backend-python/ .

# Expose gRPC port and HTTP port for health checks
EXPOSE 50051 8080

# Run the server
CMD ["python", "server.py"]
