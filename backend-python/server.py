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

# ==================== HTTP REST API Server ====================

class APIHandler(BaseHTTPRequestHandler):
    """HTTP handler for REST API endpoints and health checks"""
    
    # Class-level references to servicers (set in serve())
    auth_servicer = None
    user_servicer = None
    contact_servicer = None
    db = None
    
    def log_message(self, format, *args):
        """Suppress default HTTP server logging"""
        pass
    
    def _send_json_response(self, status_code, data):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def _read_json_body(self):
        """Read and parse JSON body from request"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length)
            return json.loads(body.decode('utf-8'))
        return {}
    
    def _get_user_id_from_token(self):
        """Extract user ID from Authorization header"""
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                return payload.get('user_id')
            except Exception as e:
                logger.warning(f"Token decode failed: {e}")
        return None
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self._handle_health()
        elif self.path == '/api/user/profile':
            self._handle_get_profile()
        elif self.path == '/api/user/apartment':
            self._handle_get_apartment()
        elif self.path == '/api/admin/residents':
            self._handle_get_residents()
        elif self.path.startswith('/api/building/') and '/apartments' in self.path:
            self._handle_get_building_apartments()
        elif self.path.startswith('/api/building/') and '/maintenance' in self.path:
            self._handle_get_maintenance()
        else:
            self._send_json_response(404, {'error': 'Not found'})
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            if self.path == '/api/auth/login':
                self._handle_login()
            elif self.path == '/api/auth/register':
                self._handle_register()
            elif self.path == '/api/auth/refresh':
                self._handle_refresh_token()
            elif self.path == '/api/contact/form':
                self._handle_contact_form()
            elif self.path == '/api/contact/offer':
                self._handle_offer()
            elif self.path == '/api/contact/presentation':
                self._handle_presentation()
            else:
                self._send_json_response(404, {'error': 'Not found'})
        except Exception as e:
            logger.error(f"API error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})
    
    def _handle_health(self):
        """Health check endpoint"""
        try:
            db_status = "connected"
            cursor = self.db.get_cursor()
            cursor.execute("SELECT 1")
        except Exception as e:
            logger.error(f"Health check database error: {e}")
            db_status = f"error: {str(e)}"
        
        self._send_json_response(200, {
            'status': 'healthy',
            'database': db_status,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'service': 'domunity-backend-python',
            'version': '1.0.0'
        })
    
    def _handle_login(self):
        """Handle login request"""
        data = self._read_json_body()
        logger.info(f"API: Login request for {data.get('email')}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute(
                "SELECT * FROM users WHERE email = %s",
                (data.get('email'),)
            )
            user = cursor.fetchone()
            
            if not user:
                self._send_json_response(401, {'success': False, 'message': 'Invalid email or password'})
                return
            
            if bcrypt.checkpw(data.get('password', '').encode('utf-8'), user['password_hash'].encode('utf-8')):
                access_token = jwt.encode({
                    'user_id': user['id'],
                    'email': user['email'],
                    'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                refresh_token = jwt.encode({
                    'user_id': user['id'],
                    'exp': datetime.utcnow() + timedelta(days=30)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                logger.info(f"✓ API: Login successful for {user['email']}")
                self._send_json_response(200, {
                    'success': True,
                    'message': 'Login successful',
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': {
                        'id': str(user['id']),
                        'email': user['email'],
                        'full_name': user['full_name'] or '',
                        'phone': user['phone'] or ''
                    }
                })
            else:
                self._send_json_response(401, {'success': False, 'message': 'Invalid email or password'})
        except Exception as e:
            logger.error(f"API Login error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})
    
    def _handle_register(self):
        """Handle registration request"""
        data = self._read_json_body()
        logger.info(f"API: Register request for {data.get('email')}")
        
        try:
            password_hash = bcrypt.hashpw(data.get('password', '').encode('utf-8'), bcrypt.gensalt())
            
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO users (email, password_hash, full_name, phone)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (data.get('email'), password_hash.decode('utf-8'), data.get('full_name', ''), data.get('phone', '')))
            
            user_id = cursor.fetchone()['id']
            self.db.commit()
            
            logger.info(f"✓ API: User registered with ID {user_id}")
            self._send_json_response(201, {
                'success': True,
                'message': 'Registration successful',
                'user_id': str(user_id)
            })
        except Exception as e:
            self.db.rollback()
            logger.error(f"API Register error: {e}", exc_info=True)
            if 'unique constraint' in str(e).lower() or 'duplicate key' in str(e).lower():
                self._send_json_response(400, {'success': False, 'message': 'Email already registered'})
            else:
                self._send_json_response(500, {'success': False, 'message': str(e)})
    
    def _handle_refresh_token(self):
        """Handle token refresh request"""
        data = self._read_json_body()
        
        try:
            payload = jwt.decode(data.get('refresh_token', ''), JWT_SECRET, algorithms=[JWT_ALGORITHM])
            
            access_token = jwt.encode({
                'user_id': payload['user_id'],
                'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
            }, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            self._send_json_response(200, {'success': True, 'access_token': access_token})
        except Exception as e:
            logger.error(f"API Refresh token error: {e}")
            self._send_json_response(401, {'success': False, 'message': 'Invalid refresh token'})
    
    def _handle_get_profile(self):
        """Handle get profile request"""
        user_id = self._get_user_id_from_token()
        
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        
        try:
            cursor = self.db.get_cursor()
            
            # Get user
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user:
                self._send_json_response(404, {'error': 'User not found'})
                return
            
            # Get apartment and building
            cursor.execute("""
                SELECT a.id as apartment_id, a.number, a.floor, a.type, a.residents,
                       b.id as building_id, b.address, b.entrance, b.total_apartments, b.total_residents
                FROM apartments a
                JOIN buildings b ON a.building_id = b.id
                WHERE a.user_id = %s
            """, (user_id,))
            apartment_building = cursor.fetchone()
            
            # Get user profile
            cursor.execute("SELECT * FROM user_profiles WHERE user_id = %s", (user_id,))
            profile = cursor.fetchone()
            
            response = {
                'user': {
                    'id': str(user['id']),
                    'email': user['email'],
                    'full_name': user['full_name'] or '',
                    'phone': user['phone'] or ''
                }
            }
            
            if apartment_building:
                response['building'] = {
                    'id': str(apartment_building['building_id']),
                    'address': apartment_building['address'],
                    'entrance': apartment_building['entrance'] or '',
                    'total_apartments': apartment_building['total_apartments'],
                    'total_residents': apartment_building['total_residents']
                }
                response['apartment'] = {
                    'id': str(apartment_building['apartment_id']),
                    'number': apartment_building['number'],
                    'floor': apartment_building['floor'] or 0,
                    'type': apartment_building['type'] or '',
                    'residents': apartment_building['residents']
                }
                
                # Get events for the building
                cursor.execute("""
                    SELECT date, title, description 
                    FROM events 
                    WHERE building_id = %s 
                    ORDER BY date DESC 
                    LIMIT 10
                """, (apartment_building['building_id'],))
                events = []
                for event in cursor.fetchall():
                    events.append({
                        'date': event['date'].strftime('%d.%m.%Y') if event['date'] else '',
                        'text': event['description'] or event['title'] or ''
                    })
                response['events'] = events
            
            if profile:
                response['account_manager'] = profile['account_manager'] or ''
                response['balance'] = float(profile['balance']) if profile['balance'] else 0.0
                response['client_number'] = profile['client_number'] or ''
                response['contract_end_date'] = str(profile['contract_end_date']) if profile['contract_end_date'] else ''
            
            # Get payments for user
            cursor.execute("""
                SELECT amount, period, status, paid_date 
                FROM payments 
                WHERE user_id = %s 
                ORDER BY created_at DESC
            """, (user_id,))
            payments = []
            total_pending = 0.0
            total_overdue = 0.0
            yearly_total = 0.0
            last_payment = None
            
            for payment in cursor.fetchall():
                amount = float(payment['amount'])
                payments.append({
                    'period': payment['period'],
                    'amount': f"{amount:.2f} лв.",
                    'status': payment['status'],
                    'paid_date': payment['paid_date'].strftime('%d.%m.%Y') if payment['paid_date'] else None
                })
                
                yearly_total += amount
                
                if payment['status'] == 'pending':
                    total_pending += amount
                elif payment['status'] == 'overdue':
                    total_overdue += amount
                
                # Track last paid payment
                if payment['status'] == 'paid' and payment['paid_date'] and last_payment is None:
                    last_payment = {
                        'date': payment['paid_date'].strftime('%d.%m.%Y'),
                        'amount': f"{amount:.2f} лв."
                    }
            
            response['payments'] = payments
            response['last_payment'] = last_payment
            response['financial_summary'] = {
                'current_month_debt': f"{total_pending:.2f} лв.",
                'overdue_amount': f"{total_overdue:.2f} лв.",
                'yearly_total': f"{yearly_total:.2f} лв."
            }
            
            self._send_json_response(200, response)
        except Exception as e:
            logger.error(f"API GetProfile error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})
    
    def _handle_contact_form(self):
        """Handle contact form submission"""
        data = self._read_json_body()
        logger.info(f"API: Contact form from {data.get('email')}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES (%s, %s, %s, %s, 'contact')
            """, (data.get('name'), data.get('phone'), data.get('email'), data.get('message')))
            
            self.db.commit()
            logger.info("✓ API: Contact form saved")
            self._send_json_response(200, {'success': True, 'message': 'Your message has been sent successfully'})
        except Exception as e:
            self.db.rollback()
            logger.error(f"API Contact form error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})
    
    def _handle_offer(self):
        """Handle offer request"""
        data = self._read_json_body()
        logger.info(f"API: Offer request from {data.get('email')}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES (%s, %s, %s, %s, 'offer')
            """, ('', data.get('phone'), data.get('email'),
                  f"City: {data.get('city')}, Properties: {data.get('num_properties')}, Address: {data.get('address')}, Info: {data.get('additional_info', '')}"))
            
            self.db.commit()
            logger.info("✓ API: Offer request saved")
            self._send_json_response(200, {'success': True, 'message': 'Your offer request has been received'})
        except Exception as e:
            self.db.rollback()
            logger.error(f"API Offer error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})
    
    def _handle_presentation(self):
        """Handle presentation request"""
        data = self._read_json_body()
        logger.info(f"API: Presentation request from {data.get('email')}")
        
        try:
            cursor = self.db.get_cursor()
            cursor.execute("""
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES (%s, %s, %s, %s, 'presentation')
            """, ('', data.get('phone'), data.get('email'),
                  f"Date: {data.get('date')}, Type: {data.get('building_type')}, Address: {data.get('address')}, Info: {data.get('additional_info', '')}"))
            
            self.db.commit()
            logger.info("✓ API: Presentation request saved")
            self._send_json_response(200, {'success': True, 'message': 'Your presentation request has been received'})
        except Exception as e:
            self.db.rollback()
            logger.error(f"API Presentation error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})
    
    def _handle_get_residents(self):
        """Handle get all residents (admin endpoint)"""
        user_id = self._get_user_id_from_token()
        
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        
        try:
            cursor = self.db.get_cursor()
            
            # Get all users with their apartment/building/profile info
            cursor.execute("""
                SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_active,
                       a.number as apartment_number, a.residents,
                       b.address as building, b.entrance,
                       up.client_number, up.balance
                FROM users u
                LEFT JOIN apartments a ON a.user_id = u.id
                LEFT JOIN buildings b ON a.building_id = b.id
                LEFT JOIN user_profiles up ON up.user_id = u.id
                ORDER BY u.id
            """)
            
            residents = []
            for row in cursor.fetchall():
                # Calculate total debt from payments
                cursor.execute("""
                    SELECT COALESCE(SUM(amount), 0) as total_debt
                    FROM payments
                    WHERE user_id = %s AND status IN ('pending', 'overdue')
                """, (row['id'],))
                debt_result = cursor.fetchone()
                
                residents.append({
                    'id': row['id'],
                    'name': row['full_name'] or '',
                    'email': row['email'],
                    'building': row['building'] or '',
                    'entrance': row['entrance'] or '',
                    'apartment': str(row['apartment_number']) if row['apartment_number'] else '',
                    'clientNumber': row['client_number'] or '',
                    'residentsCount': row['residents'] or 0,
                    'balance': float(row['balance']) if row['balance'] else 0.0,
                    'totalDebt': float(debt_result['total_debt']),
                    'role': row['role'] or 'user',
                    'isActive': row['is_active'] if row['is_active'] is not None else True,
                })
            
            self._send_json_response(200, {'residents': residents})
        except Exception as e:
            logger.error(f"API GetResidents error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})
    
    def _handle_get_apartment(self):
        """Handle get user's apartment details with payments and maintenance"""
        user_id = self._get_user_id_from_token()
        
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        
        try:
            cursor = self.db.get_cursor()
            
            # Get apartment and building info
            cursor.execute("""
                SELECT a.id as apartment_id, a.number, a.floor, a.type, a.residents,
                       b.id as building_id, b.address, b.entrance,
                       up.balance, up.client_number
                FROM apartments a
                JOIN buildings b ON a.building_id = b.id
                LEFT JOIN user_profiles up ON up.user_id = a.user_id
                WHERE a.user_id = %s
            """, (user_id,))
            apt_data = cursor.fetchone()
            
            if not apt_data:
                self._send_json_response(404, {'error': 'No apartment found for user'})
                return
            
            # Get payments for this user
            cursor.execute("""
                SELECT amount, period, status, paid_date, created_at
                FROM payments
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))
            
            payments = []
            for p in cursor.fetchall():
                # Parse period into month/year
                period_parts = p['period'].split(' ') if p['period'] else ['', '']
                payments.append({
                    'month': period_parts[0] if len(period_parts) > 0 else '',
                    'year': int(period_parts[1]) if len(period_parts) > 1 and period_parts[1].isdigit() else 2025,
                    'fee': float(p['amount']),
                    'repair': 0.0,
                    'fund': 0.0,
                    'extra': 0.0,
                    'status': p['status'],
                    'paidAt': p['paid_date'].strftime('%d.%m.%Y') if p['paid_date'] else None,
                })
            
            # Get maintenance records for the building
            cursor.execute("""
                SELECT date, description, cost, status
                FROM maintenance_records
                WHERE building_id = %s
                ORDER BY date DESC
            """, (apt_data['building_id'],))
            
            maintenance = []
            for m in cursor.fetchall():
                maintenance.append({
                    'date': m['date'].strftime('%d.%m.%Y') if m['date'] else '',
                    'description': m['description'] or '',
                    'cost': f"{float(m['cost']):.2f} лв." if m['cost'] else '0.00 лв.',
                    'status': m['status'] or 'planned',
                })
            
            response = {
                'apartmentInfo': {
                    'building': apt_data['address'],
                    'entrance': apt_data['entrance'] or '',
                    'number': str(apt_data['number']),
                    'residents': apt_data['residents'] or 0,
                    'balance': float(apt_data['balance']) if apt_data['balance'] else 0.0,
                    'clientNumber': apt_data['client_number'] or '',
                },
                'payments': payments,
                'maintenance': maintenance,
            }
            
            self._send_json_response(200, response)
        except Exception as e:
            logger.error(f"API GetApartment error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})
    
    def _handle_get_building_apartments(self):
        """Handle get all apartments in a building (for Entrance page)"""
        user_id = self._get_user_id_from_token()
        
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        
        try:
            # Extract building ID from path: /api/building/{id}/apartments
            parts = self.path.split('/')
            building_id = int(parts[3]) if len(parts) > 3 else None
            
            if not building_id:
                # Get building from user's apartment
                cursor = self.db.get_cursor()
                cursor.execute("""
                    SELECT b.id FROM apartments a
                    JOIN buildings b ON a.building_id = b.id
                    WHERE a.user_id = %s
                """, (user_id,))
                result = cursor.fetchone()
                if result:
                    building_id = result['id']
                else:
                    self._send_json_response(404, {'error': 'No building found'})
                    return
            
            cursor = self.db.get_cursor()
            
            # Get building info
            cursor.execute("SELECT address, entrance FROM buildings WHERE id = %s", (building_id,))
            building = cursor.fetchone()
            
            # Get all apartments with their payment status
            cursor.execute("""
                SELECT a.number, a.floor, a.residents, u.full_name,
                       COALESCE((
                           SELECT SUM(amount) FROM payments 
                           WHERE apartment_id = a.id AND status IN ('pending', 'overdue')
                       ), 0) as amount_due,
                       CASE 
                           WHEN EXISTS(SELECT 1 FROM payments WHERE apartment_id = a.id AND status = 'overdue') THEN 'overdue'
                           WHEN EXISTS(SELECT 1 FROM payments WHERE apartment_id = a.id AND status = 'pending') THEN 'pending'
                           ELSE 'paid'
                       END as status
                FROM apartments a
                LEFT JOIN users u ON a.user_id = u.id
                WHERE a.building_id = %s
                ORDER BY a.floor DESC, a.number
            """, (building_id,))
            
            # Group by floor
            floors_dict = {}
            for apt in cursor.fetchall():
                floor_num = apt['floor'] or 1
                if floor_num not in floors_dict:
                    floors_dict[floor_num] = []
                floors_dict[floor_num].append({
                    'number': apt['number'],
                    'family': apt['full_name'].split(' ')[0] + 'и' if apt['full_name'] else 'Неизвестни',
                    'amount': float(apt['amount_due']),
                    'status': apt['status'],
                })
            
            floors = [{'floor': f, 'apartments': apts} for f, apts in sorted(floors_dict.items(), reverse=True)]
            
            response = {
                'building': {
                    'address': building['address'] if building else '',
                    'entrance': building['entrance'] if building else '',
                },
                'floors': floors,
            }
            
            self._send_json_response(200, response)
        except Exception as e:
            logger.error(f"API GetBuildingApartments error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})
    
    def _handle_get_maintenance(self):
        """Handle get maintenance records for a building"""
        user_id = self._get_user_id_from_token()
        
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        
        try:
            # Extract building ID from path
            parts = self.path.split('/')
            building_id = int(parts[3]) if len(parts) > 3 else None
            
            if not building_id:
                self._send_json_response(400, {'error': 'Building ID required'})
                return
            
            cursor = self.db.get_cursor()
            cursor.execute("""
                SELECT date, description, cost, status
                FROM maintenance_records
                WHERE building_id = %s
                ORDER BY date DESC
            """, (building_id,))
            
            maintenance = []
            for m in cursor.fetchall():
                maintenance.append({
                    'date': m['date'].strftime('%d.%m.%Y') if m['date'] else '',
                    'description': m['description'] or '',
                    'cost': f"{float(m['cost']):.2f} лв." if m['cost'] else '0.00 лв.',
                    'status': m['status'] or 'planned',
                })
            
            self._send_json_response(200, {'maintenance': maintenance})
        except Exception as e:
            logger.error(f"API GetMaintenance error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})


def start_http_api_server(port, db):
    """Start HTTP API server in a separate thread"""
    APIHandler.db = db
    server = HTTPServer(('0.0.0.0', port), APIHandler)
    logger.info(f"✓ HTTP REST API server started on port {port}")
    logger.info(f"  Health endpoint: http://0.0.0.0:{port}/health")
    logger.info(f"  API endpoints: http://0.0.0.0:{port}/api/*")
    
    # Run in daemon thread so it stops when main thread stops
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

def serve():
    logger.info("=" * 80)
    logger.info("DOMUNITY gRPC + REST API SERVER (Python)")
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
    
    # Initialize database FIRST (needed for both HTTP API and gRPC)
    try:
        db = Database()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        sys.exit(1)
    
    # Start HTTP REST API server
    http_port = int(os.getenv('HTTP_PORT', '8080'))
    http_server = start_http_api_server(http_port, db)
    
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
    logger.info(f"HTTP REST API: 0.0.0.0:{http_port}/api/*")
    logger.info(f"Health Check: 0.0.0.0:{http_port}/health")
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
