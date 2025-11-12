FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache postgresql-client

# Copy package files
COPY backend-nodejs/package*.json ./
RUN npm install --omit=dev

# Install grpc tools for proto generation
RUN npm install -g grpc-tools

# Copy proto files and generate code
COPY proto ../proto
RUN mkdir -p proto
RUN grpc_tools_node_protoc \
    --js_out=import_style=commonjs,binary:./proto \
    --grpc_out=grpc_js:./proto \
    -I ../proto \
    ../proto/domunity.proto

# Copy application code
COPY backend-nodejs/ .

# Expose gRPC port
EXPOSE 50051

# Run the server
CMD ["node", "server.js"]
