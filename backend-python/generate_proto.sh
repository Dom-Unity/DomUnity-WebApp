#!/bin/bash

echo "Generating Python gRPC code from proto files..."
python -m grpc_tools.protoc \
    -I../proto \
    --python_out=. \
    --grpc_python_out=. \
    ../proto/domunity.proto

echo "Proto files generated successfully!"
echo "Files created:"
echo "  - domunity_pb2.py"
echo "  - domunity_pb2_grpc.py"
