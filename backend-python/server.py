import os
import sys
import logging
import time
from concurrent import futures
from datetime import datetime, timedelta
import grpc
from grpc_reflection.v1alpha import reflection
import bcrypt
import jwt
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import json

# Configure logging with extensive detail
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)8s] [%(name)20s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Import generated proto files
try:
    import domunity_pb2
    import domunity_pb2_grpc
    logger.info("✓ Proto files imported successfully")
except ImportError as e:
    logger.error(f"✗ Failed to import proto files: {e}")
    logger.error("Make sure to generate proto files first!")
    sys.exit(1)

from db import Database

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

class AuthServicer(domunity_pb2_grpc.AuthServiceServicer):
    def __init__(self, db):
        self.db = db
        logger.info("AuthServicer initialized")
    
    def Login(self, request, context):
        logger.info("=" * 80)
        logger.info("LOGIN REQUEST")
        logger.info(f"Email: {request.email}")
        logger.info("=" * 80)
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute(
                "SELECT * FROM users WHERE email = %s",
                (request.email,)
            )
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"User not found: {request.email}")
                return domunity_pb2.LoginResponse(
                    success=False,
                    message="Invalid email or password"
                )
            
            # Verify password
            if bcrypt.checkpw(request.password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                # Generate tokens
                access_token = jwt.encode({
                    'user_id': user['id'],
                    'email': user['email'],
                    'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                refresh_token = jwt.encode({
                    'user_id': user['id'],
                    'exp': datetime.utcnow() + timedelta(days=30)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                logger.info(f"✓ Login successful for user: {user['email']}")
                
                return domunity_pb2.LoginResponse(
                    success=True,
                    message="Login successful",
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user=domunity_pb2.User(
                        id=str(user['id']),
                        email=user['email'],
                        full_name=user['full_name'] or '',
                        phone=user['phone'] or '',
                        created_at=str(user['created_at'])
                    )
                )
            else:
                logger.warning(f"Invalid password for user: {request.email}")
                return domunity_pb2.LoginResponse(
                    success=False,
                    message="Invalid email or password"
                )
                
        except Exception as e:
            logger.error(f"✗ Login error: {e}", exc_info=True)
            return domunity_pb2.LoginResponse(
                success=False,
                message=f"Login failed: {str(e)}"
            )
    
    def Register(self, request, context):
        logger.info("=" * 80)
        logger.info("REGISTER REQUEST")
        logger.info(f"Email: {request.email}")
        logger.info(f"Full name: {request.full_name}")
        logger.info("=" * 80)
        
        try:
            # Hash password
            password_hash = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt())
            
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO users (email, password_hash, full_name, phone)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (request.email, password_hash.decode('utf-8'), request.full_name, request.phone))
            
            user_id = cursor.fetchone()['id']
            self.db.commit()
            
            logger.info(f"✓ User registered successfully: {request.email} (ID: {user_id})")
            
            return domunity_pb2.RegisterResponse(
                success=True,
                message="Registration successful",
                user_id=str(user_id)
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"✗ Registration error: {e}", exc_info=True)
            return domunity_pb2.RegisterResponse(
                success=False,
                message=f"Registration failed: {str(e)}"
            )
    
    def RefreshToken(self, request, context):
        logger.info("REFRESH TOKEN REQUEST")
        
        try:
            payload = jwt.decode(request.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            
            access_token = jwt.encode({
                'user_id': payload['user_id'],
                'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
            }, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            logger.info(f"✓ Token refreshed for user_id: {payload['user_id']}")
            
            return domunity_pb2.RefreshTokenResponse(
                success=True,
                access_token=access_token
            )
            
        except Exception as e:
            logger.error(f"✗ Token refresh error: {e}")
            return domunity_pb2.RefreshTokenResponse(success=False)
    
    def ForgotPassword(self, request, context):
        logger.info(f"FORGOT PASSWORD REQUEST for: {request.email}")
        
        # In production, send password reset email
        return domunity_pb2.ForgotPasswordResponse(
            success=True,
            message="Password reset instructions sent to your email"
        )

class UserServicer(domunity_pb2_grpc.UserServiceServicer):
    def __init__(self, db):
        self.db = db
        logger.info("UserServicer initialized")
    
    def GetProfile(self, request, context):
        logger.info(f"GET PROFILE REQUEST for user_id: {request.user_id}")
        
        try:
            cursor = self.db.get_cursor()
            
            # Get user
            cursor.execute("SELECT * FROM users WHERE id = %s", (int(request.user_id),))
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"User not found: {request.user_id}")
                context.abort(grpc.StatusCode.NOT_FOUND, "User not found")
            
            # Get user's apartment and building
            cursor.execute("""
                SELECT a.*, b.*
                FROM apartments a
                JOIN buildings b ON a.building_id = b.id
                WHERE a.user_id = %s
            """, (int(request.user_id),))
            
            apartment_building = cursor.fetchone()
            
            # Get user profile
            cursor.execute("SELECT * FROM user_profiles WHERE user_id = %s", (int(request.user_id),))
            profile = cursor.fetchone()
            
            building = None
            apartment = None
            account_manager = ""
            balance = 0.0
            client_number = ""
            contract_end_date = ""
            
            if apartment_building:
                building = domunity_pb2.Building(
                    id=str(apartment_building['id']),
                    address=apartment_building['address'],
                    entrance=apartment_building['entrance'] or '',
                    total_apartments=apartment_building['total_apartments'],
                    total_residents=apartment_building['total_residents']
                )
                
                apartment = domunity_pb2.Apartment(
                    id=str(apartment_building['apartment_id']),
                    building_id=str(apartment_building['building_id']),
                    number=apartment_building['number'],
                    floor=apartment_building['floor'] or 0,
                    type=apartment_building['type'] or '',
                    residents=apartment_building['residents']
                )
            
            if profile:
                account_manager = profile['account_manager'] or ''
                balance = float(profile['balance']) if profile['balance'] else 0.0
                client_number = profile['client_number'] or ''
                contract_end_date = str(profile['contract_end_date']) if profile['contract_end_date'] else ''
            
            logger.info(f"✓ Profile retrieved for user: {user['email']}")
            
            return domunity_pb2.UserProfile(
                user=domunity_pb2.User(
                    id=str(user['id']),
                    email=user['email'],
                    full_name=user['full_name'] or '',
                    phone=user['phone'] or '',
                    created_at=str(user['created_at'])
                ),
                building=building,
                apartment=apartment,
                account_manager=account_manager,
                balance=balance,
                client_number=client_number,
                contract_end_date=contract_end_date
            )
            
        except Exception as e:
            logger.error(f"✗ GetProfile error: {e}", exc_info=True)
            context.abort(grpc.StatusCode.INTERNAL, str(e))
    
    def UpdateProfile(self, request, context):
        logger.info(f"UPDATE PROFILE REQUEST for user_id: {request.user_id}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                UPDATE users 
                SET full_name = %s, phone = %s
                WHERE id = %s
            """, (request.full_name, request.phone, int(request.user_id)))
            
            self.db.commit()
            logger.info(f"✓ Profile updated for user_id: {request.user_id}")
            
            return domunity_pb2.UpdateProfileResponse(
                success=True,
                message="Profile updated successfully"
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"✗ UpdateProfile error: {e}", exc_info=True)
            return domunity_pb2.UpdateProfileResponse(
                success=False,
                message=str(e)
            )

class BuildingServicer(domunity_pb2_grpc.BuildingServiceServicer):
    def __init__(self, db):
        self.db = db
        logger.info("BuildingServicer initialized")
    
    def GetBuilding(self, request, context):
        logger.info(f"GET BUILDING REQUEST for building_id: {request.building_id}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("SELECT * FROM buildings WHERE id = %s", (int(request.building_id),))
            building = cursor.fetchone()
            
            if not building:
                context.abort(grpc.StatusCode.NOT_FOUND, "Building not found")
            
            return domunity_pb2.Building(
                id=str(building['id']),
                address=building['address'],
                entrance=building['entrance'] or '',
                total_apartments=building['total_apartments'],
                total_residents=building['total_residents']
            )
            
        except Exception as e:
            logger.error(f"✗ GetBuilding error: {e}", exc_info=True)
            context.abort(grpc.StatusCode.INTERNAL, str(e))
    
    def ListApartments(self, request, context):
        logger.info(f"LIST APARTMENTS REQUEST for building_id: {request.building_id}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute(
                "SELECT * FROM apartments WHERE building_id = %s ORDER BY number",
                (int(request.building_id),)
            )
            
            apartments = []
            for apt in cursor.fetchall():
                apartments.append(domunity_pb2.Apartment(
                    id=str(apt['id']),
                    building_id=str(apt['building_id']),
                    number=apt['number'],
                    floor=apt['floor'] or 0,
                    type=apt['type'] or '',
                    residents=apt['residents']
                ))
            
            logger.info(f"✓ Retrieved {len(apartments)} apartments")
            return domunity_pb2.ListApartmentsResponse(apartments=apartments)
            
        except Exception as e:
            logger.error(f"✗ ListApartments error: {e}", exc_info=True)
            context.abort(grpc.StatusCode.INTERNAL, str(e))

class FinancialServicer(domunity_pb2_grpc.FinancialServiceServicer):
    def __init__(self, db):
        self.db = db
        logger.info("FinancialServicer initialized")
    
    def GetFinancialReport(self, request, context):
        logger.info(f"GET FINANCIAL REPORT REQUEST for building_id: {request.building_id}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                SELECT a.*, u.full_name, f.*
                FROM apartments a
                LEFT JOIN users u ON a.user_id = u.id
                LEFT JOIN financial_records f ON a.id = f.apartment_id
                WHERE a.building_id = %s
                ORDER BY a.number
            """, (int(request.building_id),))
            
            entries = []
            total = 0.0
            
            for row in cursor.fetchall():
                total_due = float(row.get('total_due', 0) or 0)
                total += total_due
                
                entries.append(domunity_pb2.FinancialReportEntry(
                    apartment_number=row['number'],
                    type=row['type'] or 'Апартамент',
                    floor=row['floor'] or 0,
                    client_name=row['full_name'] or 'N/A',
                    residents=row['residents'],
                    elevator_gtp=float(row.get('elevator_gtp', 0) or 0),
                    elevator_electricity=float(row.get('elevator_electricity', 0) or 0),
                    common_area_electricity=float(row.get('common_area_electricity', 0) or 0),
                    elevator_maintenance=float(row.get('elevator_maintenance', 0) or 0),
                    management_fee=float(row.get('management_fee', 0) or 0),
                    repair_fund=float(row.get('repair_fund', 0) or 0),
                    total_due=total_due
                ))
            
            logger.info(f"✓ Retrieved financial report with {len(entries)} entries")
            
            return domunity_pb2.FinancialReport(
                entries=entries,
                total_balance=total
            )
            
        except Exception as e:
            logger.error(f"✗ GetFinancialReport error: {e}", exc_info=True)
            context.abort(grpc.StatusCode.INTERNAL, str(e))
    
    def GetPaymentHistory(self, request, context):
        logger.info(f"GET PAYMENT HISTORY REQUEST for user_id: {request.user_id}")
        
        # Mock data for now - in production, would query payments table
        return domunity_pb2.PaymentHistory(payments=[])

class EventServicer(domunity_pb2_grpc.EventServiceServicer):
    def __init__(self, db):
        self.db = db
        logger.info("EventServicer initialized")
    
    def ListEvents(self, request, context):
        logger.info(f"LIST EVENTS REQUEST for building_id: {request.building_id}")
        
        try:
            cursor = self.db.get_cursor()
            limit = request.limit if request.limit > 0 else 10
            
            cursor.execute("""
                SELECT * FROM events 
                WHERE building_id = %s 
                ORDER BY date DESC 
                LIMIT %s
            """, (int(request.building_id), limit))
            
            events = []
            for event in cursor.fetchall():
                events.append(domunity_pb2.Event(
                    id=str(event['id']),
                    date=str(event['date']),
                    title=event['title'] or '',
                    description=event['description'] or '',
                    building_id=str(event['building_id'])
                ))
            
            logger.info(f"✓ Retrieved {len(events)} events")
            return domunity_pb2.ListEventsResponse(events=events)
            
        except Exception as e:
            logger.error(f"✗ ListEvents error: {e}", exc_info=True)
            context.abort(grpc.StatusCode.INTERNAL, str(e))
    
    def CreateEvent(self, request, context):
        logger.info(f"CREATE EVENT REQUEST for building_id: {request.building_id}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO events (building_id, date, title, description)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (int(request.building_id), request.date, request.title, request.description))
            
            event_id = cursor.fetchone()['id']
            self.db.commit()
            
            logger.info(f"✓ Event created with ID: {event_id}")
            
            return domunity_pb2.CreateEventResponse(
                success=True,
                message="Event created successfully",
                event_id=str(event_id)
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"✗ CreateEvent error: {e}", exc_info=True)
            return domunity_pb2.CreateEventResponse(
                success=False,
                message=str(e)
            )

class ContactServicer(domunity_pb2_grpc.ContactServiceServicer):
    def __init__(self, db):
        self.db = db
        logger.info("ContactServicer initialized")
    
    def SendContactForm(self, request, context):
        logger.info(f"CONTACT FORM REQUEST from: {request.email}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES (%s, %s, %s, %s, 'contact')
            """, (request.name, request.phone, request.email, request.message))
            
            self.db.commit()
            logger.info("✓ Contact form saved")
            
            return domunity_pb2.ContactFormResponse(
                success=True,
                message="Your message has been sent successfully"
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"✗ SendContactForm error: {e}", exc_info=True)
            return domunity_pb2.ContactFormResponse(
                success=False,
                message=str(e)
            )
    
    def RequestOffer(self, request, context):
        logger.info(f"OFFER REQUEST from: {request.email}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES (%s, %s, %s, %s, 'offer')
            """, ('', request.phone, request.email, 
                  f"City: {request.city}, Properties: {request.num_properties}, Address: {request.address}", ))
            
            self.db.commit()
            logger.info("✓ Offer request saved")
            
            return domunity_pb2.OfferResponse(
                success=True,
                message="Your offer request has been received"
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"✗ RequestOffer error: {e}", exc_info=True)
            return domunity_pb2.OfferResponse(
                success=False,
                message=str(e)
            )
    
    def RequestPresentation(self, request, context):
        logger.info(f"PRESENTATION REQUEST from: {request.email}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES (%s, %s, %s, %s, 'presentation')
            """, ('', request.phone, request.email,
                  f"Date: {request.date}, Type: {request.building_type}, Address: {request.address}",))
            
            self.db.commit()
            logger.info("✓ Presentation request saved")
            
            return domunity_pb2.PresentationResponse(
                success=True,
                message="Your presentation request has been received"
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"✗ RequestPresentation error: {e}", exc_info=True)
            return domunity_pb2.PresentationResponse(
                success=False,
                message=str(e)
            )

class HealthServicer(domunity_pb2_grpc.HealthServiceServicer):
    def __init__(self, db):
        self.db = db
        logger.info("HealthServicer initialized")
    
    def Check(self, request, context):
        logger.debug("HEALTH CHECK REQUEST")
        
        db_status = "healthy"
        try:
            cursor = self.db.get_cursor()
            cursor.execute("SELECT 1")
        except:
            db_status = "unhealthy"
        
        return domunity_pb2.HealthCheckResponse(
            healthy=True,
            version="1.0.0",
            database_status=db_status
        )

# ==================== HTTP Health Check Server ====================

class HealthCheckHandler(BaseHTTPRequestHandler):
    """Simple HTTP handler for health checks (for Render.com)"""
    
    def log_message(self, format, *args):
        """Suppress default HTTP server logging"""
        pass
    
    def do_GET(self):
        """Handle GET requests to /health"""
        if self.path == '/health':
            try:
                # Try to connect to database
                db = Database()
                db_status = "connected"
                db.close()
                status_code = 200
            except Exception as e:
                logger.error(f"Health check database error: {e}")
                db_status = f"error: {str(e)}"
                status_code = 503
            
            # Send HTTP response
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = {
                'status': 'healthy' if status_code == 200 else 'unhealthy',
                'database': db_status,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'service': 'domunity-backend-python',
                'version': '1.0.0'
            }
            
            self.wfile.write(json.dumps(response).encode())
            logger.debug(f"Health check: {status_code} - {db_status}")
        else:
            # 404 for other paths
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())

def start_http_health_server(port=8080):
    """Start HTTP server for health checks in a separate thread"""
    server = HTTPServer(('0.0.0.0', port), HealthCheckHandler)
    logger.info(f"✓ HTTP health check server started on port {port}")
    logger.info(f"  Health endpoint: http://0.0.0.0:{port}/health")
    
    # Run in daemon thread so it stops when main thread stops
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

def serve():
    logger.info("=" * 80)
    logger.info("DOMUNITY gRPC SERVER (Python)")
    logger.info("=" * 80)
    logger.info(f"Starting at {datetime.now()}")
    logger.info(f"Python version: {sys.version}")
    
    # Log environment variables
    logger.info("\nEnvironment Configuration:")
    logger.info(f"  DATABASE_URL: {'SET' if os.getenv('DATABASE_URL') else 'NOT SET'}")
    logger.info(f"  JWT_SECRET: {'SET' if os.getenv('JWT_SECRET') else 'USING DEFAULT'}")
    logger.info(f"  GRPC_PORT: {os.getenv('PORT', '50051')}")
    logger.info(f"  HTTP_PORT: {os.getenv('HTTP_PORT', '8080')}")
    logger.info("=" * 80)
    
    # Start HTTP health check server
    http_port = int(os.getenv('HTTP_PORT', '8080'))
    http_server = start_http_health_server(http_port)
    
    # Initialize database
    try:
        db = Database()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        sys.exit(1)
    
    # Create gRPC server
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    
    # Add servicers
    domunity_pb2_grpc.add_AuthServiceServicer_to_server(AuthServicer(db), server)
    domunity_pb2_grpc.add_UserServiceServicer_to_server(UserServicer(db), server)
    domunity_pb2_grpc.add_BuildingServiceServicer_to_server(BuildingServicer(db), server)
    domunity_pb2_grpc.add_FinancialServiceServicer_to_server(FinancialServicer(db), server)
    domunity_pb2_grpc.add_EventServiceServicer_to_server(EventServicer(db), server)
    domunity_pb2_grpc.add_ContactServiceServicer_to_server(ContactServicer(db), server)
    domunity_pb2_grpc.add_HealthServiceServicer_to_server(HealthServicer(db), server)
    
    # Enable reflection
    SERVICE_NAMES = (
        domunity_pb2.DESCRIPTOR.services_by_name['AuthService'].full_name,
        domunity_pb2.DESCRIPTOR.services_by_name['UserService'].full_name,
        domunity_pb2.DESCRIPTOR.services_by_name['BuildingService'].full_name,
        domunity_pb2.DESCRIPTOR.services_by_name['FinancialService'].full_name,
        domunity_pb2.DESCRIPTOR.services_by_name['EventService'].full_name,
        domunity_pb2.DESCRIPTOR.services_by_name['ContactService'].full_name,
        domunity_pb2.DESCRIPTOR.services_by_name['HealthService'].full_name,
        reflection.SERVICE_NAME,
    )
    reflection.enable_server_reflection(SERVICE_NAMES, server)
    
    # Start server
    port = os.getenv('PORT', '50051')
    server.add_insecure_port(f'0.0.0.0:{port}')
    server.start()
    
    logger.info("=" * 80)
    logger.info(f"✓ SERVERS STARTED SUCCESSFULLY")
    logger.info("=" * 80)
    logger.info(f"\ngRPC Server: 0.0.0.0:{port}")
    logger.info(f"HTTP Health Check: 0.0.0.0:{http_port}/health")
    logger.info("\nRegistered gRPC Services:")
    for service_name in SERVICE_NAMES:
        if service_name != reflection.SERVICE_NAME:
            logger.info(f"  • {service_name}")
    logger.info("=" * 80)
    
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        logger.info("\n" + "=" * 80)
        logger.info("Shutting down server...")
        logger.info("=" * 80)
        server.stop(0)
        db.close()

if __name__ == '__main__':
    serve()
