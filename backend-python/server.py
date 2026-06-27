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
import secrets
from urllib.parse import urlparse, parse_qs
from bson import ObjectId

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

# Issue / maintenance report statuses
ISSUE_STATUSES = ['new', 'under_review', 'in_progress', 'completed']

# Online meeting providers
MEETING_PROVIDERS = ['jitsi', 'zoom', 'meet', 'teams', 'other']

# Allowed CORS origin (default '*' for development)
CORS_ORIGIN = os.getenv('CORS_ORIGIN', '*')

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
            user = self.db.db.users.find_one({"email": request.email})
            
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
                    'user_id': str(user['_id']),
                    'email': user['email'],
                    'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                refresh_token = jwt.encode({
                    'user_id': str(user['_id']),
                    'exp': datetime.utcnow() + timedelta(days=30)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                logger.info(f"✓ Login successful for user: {user['email']}")
                
                return domunity_pb2.LoginResponse(
                    success=True,
                    message="Login successful",
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user=domunity_pb2.User(
                        id=str(user['_id']),
                        email=user['email'],
                        full_name=user['full_name'] or '',
                        phone=user['phone'] or '',
                        created_at=str(user.get('created_at', ''))
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
            
            result = self.db.db.users.insert_one({
                "email": request.email,
                "password_hash": password_hash.decode('utf-8'),
                "full_name": request.full_name,
                "phone": request.phone,
                "role": "user",
                "is_active": True,
                "created_at": datetime.utcnow()
            })
            
            user_id = result.inserted_id
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
            # Get user
            user = self.db.db.users.find_one({"_id": ObjectId(request.user_id)})
            
            if not user:
                logger.warning(f"User not found: {request.user_id}")
                context.abort(grpc.StatusCode.NOT_FOUND, "User not found")
            
            # Get user's apartment and building
            apartment_doc = self.db.db.apartments.find_one({"user_id": ObjectId(request.user_id)})
            
            building_doc = None
            if apartment_doc:
                building_doc = self.db.db.buildings.find_one({"_id": apartment_doc['building_id']})
            
            apartment_building = None
            if apartment_doc and building_doc:
                # Merge for compatibility with existing logic if needed, 
                # but we'll manually map below anyway
                apartment_building = {**apartment_doc, **building_doc}
                apartment_building['id'] = building_doc['_id']
                apartment_building['apartment_id'] = apartment_doc['_id']
            
            # Get user profile
            profile = self.db.db.user_profiles.find_one({"user_id": ObjectId(request.user_id)})
            
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
                    id=str(user['_id']),
                    email=user['email'],
                    full_name=user['full_name'] or '',
                    phone=user['phone'] or '',
                    created_at=str(user.get('created_at', ''))
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
            self.db.db.users.update_one(
                {"_id": ObjectId(request.user_id)},
                {"$set": {"full_name": request.full_name, "phone": request.phone}}
            )
            
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
            building = self.db.db.buildings.find_one({"_id": ObjectId(request.building_id)})
            
            if not building:
                context.abort(grpc.StatusCode.NOT_FOUND, "Building not found")
            
            return domunity_pb2.Building(
                id=str(building['_id']),
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
            apartments_cursor = self.db.db.apartments.find(
                {"building_id": ObjectId(request.building_id)}
            ).sort("number", 1)
            
            apartments = []
            for apt in apartments_cursor:
                apartments.append(domunity_pb2.Apartment(
                    id=str(apt['_id']),
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
            pipeline = [
                {"$match": {"building_id": ObjectId(request.building_id)}},
                {"$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user_data"
                }},
                {"$unwind": {"path": "$user_data", "preserveNullAndEmptyArrays": True}},
                {"$lookup": {
                    "from": "financial_records",
                    "localField": "_id",
                    "foreignField": "apartment_id",
                    "as": "financial_data"
                }},
                {"$unwind": {"path": "$financial_data", "preserveNullAndEmptyArrays": True}},
                {"$sort": {"number": 1}}
            ]
            
            cursor_results = self.db.db.apartments.aggregate(pipeline)
            
            entries = []
            total = 0.0
            
            for row in cursor_results:
                user_data = row.get('user_data', {})
                financial_data = row.get('financial_data', {})
                total_due = float(financial_data.get('total_due', 0) or 0)
                total += total_due
                
                entries.append(domunity_pb2.FinancialReportEntry(
                    apartment_number=row['number'],
                    type=row['type'] or 'Апартамент',
                    floor=row['floor'] or 0,
                    client_name=user_data.get('full_name', 'N/A'),
                    residents=row['residents'],
                    elevator_gtp=float(financial_data.get('elevator_gtp', 0) or 0),
                    elevator_electricity=float(financial_data.get('elevator_electricity', 0) or 0),
                    common_area_electricity=float(financial_data.get('common_area_electricity', 0) or 0),
                    elevator_maintenance=float(financial_data.get('elevator_maintenance', 0) or 0),
                    management_fee=float(financial_data.get('management_fee', 0) or 0),
                    repair_fund=float(financial_data.get('repair_fund', 0) or 0),
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
            limit = request.limit if request.limit > 0 else 10

            events_cursor = self.db.db.events.find(
                {"building_id": ObjectId(request.building_id)}
            ).sort("date", -1).limit(limit)
            
            events = []
            for event in events_cursor:
                events.append(domunity_pb2.Event(
                    id=str(event['_id']),
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
            result = self.db.db.events.insert_one({
                "building_id": ObjectId(request.building_id),
                "date": datetime.strptime(request.date, '%Y-%m-%d') if '-' in request.date else datetime.utcnow(),
                "title": request.title,
                "description": request.description,
                "created_at": datetime.utcnow()
            })
            
            event_id = result.inserted_id
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
            self.db.db.contact_requests.insert_one({
                "name": request.name,
                "phone": request.phone,
                "email": request.email,
                "message": request.message,
                "type": "contact",
                "created_at": datetime.utcnow()
            })
            
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
            self.db.db.contact_requests.insert_one({
                "name": "",
                "phone": request.phone,
                "email": request.email,
                "message": f"City: {request.city}, Properties: {request.num_properties}, Address: {request.address}",
                "type": "offer",
                "created_at": datetime.utcnow()
            })
            
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
            self.db.db.contact_requests.insert_one({
                "name": "",
                "phone": request.phone,
                "email": request.email,
                "message": f"Date: {request.date}, Type: {request.building_type}, Address: {request.address}",
                "type": "presentation",
                "created_at": datetime.utcnow()
            })
            
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
            self.db.client.admin.command('ping')
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
        self.send_header('Access-Control-Allow-Origin', CORS_ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Access-Control-Max-Age', '3600')
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

    def _require_admin(self):
        """Return the requesting user document if they are an admin, else send 401/403 and return None."""
        user_id = self._get_user_id_from_token()
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return None
        try:
            requester = self.db.db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            requester = None
        if not requester or requester.get('role') != 'admin':
            self._send_json_response(403, {'error': 'Forbidden'})
            return None
        return requester

    def _require_staff(self):
        """Return the requesting user if they are staff (admin or manager), else send 401/403 and return None."""
        user_id = self._get_user_id_from_token()
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return None
        try:
            requester = self.db.db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            requester = None
        if not requester or requester.get('role') not in ('admin', 'manager'):
            self._send_json_response(403, {'error': 'Forbidden'})
            return None
        return requester

    def _resolve_building_id(self, raw, user_id):
        """Resolve a building ObjectId from a path segment.

        Falls back to the requesting user's apartment building when the segment is
        missing or not a valid ObjectId (e.g. a legacy numeric id sent by the client).
        """
        if raw:
            try:
                return ObjectId(raw)
            except Exception:
                logger.info(f"Building id '{raw}' is not a valid ObjectId; using user's building")
        apt = self.db.db.apartments.find_one({"user_id": ObjectId(user_id)})
        return apt['building_id'] if apt else None
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        logger.info(f"API: Received OPTIONS request for {self.path}")
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', CORS_ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Access-Control-Max-Age', '3600')
        self.send_header('Content-Length', '0')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self._handle_health()
        elif self.path == '/api/user/profile':
            self._handle_get_profile()
        elif self.path == '/api/user/apartment':
            self._handle_get_apartment()
        elif self.path == '/api/issues':
            self._handle_get_my_issues()
        elif self.path == '/api/meetings':
            self._handle_get_meetings()
        elif self.path.split('?')[0] == '/api/admin/issues':
            self._handle_get_admin_issues()
        elif self.path == '/api/admin/residents':
            self._handle_get_residents()
        elif self.path == '/api/admin/entrances':
            self._handle_get_entrances()
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
            elif self.path == '/api/auth/forgot':
                self._handle_forgot_password()
            elif self.path == '/api/user/password':
                self._handle_change_password()
            elif self.path == '/api/payments/pay':
                self._handle_pay()
            elif self.path == '/api/issues':
                self._handle_create_issue()
            elif self.path.startswith('/api/issues/') and self.path.endswith('/reply'):
                self._handle_reply_issue()
            elif self.path == '/api/admin/meetings':
                self._handle_create_meeting()
            elif self.path == '/api/admin/entrances':
                self._handle_create_entrance()
            elif self.path == '/api/admin/residents':
                self._handle_create_resident()
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

    def do_PUT(self):
        """Handle PUT requests"""
        try:
            if self.path.startswith('/api/admin/issues/') and self.path.endswith('/status'):
                self._handle_update_issue_status()
            elif self.path.startswith('/api/admin/entrances/'):
                self._handle_update_entrance()
            elif self.path.startswith('/api/admin/residents/'):
                self._handle_update_resident()
            else:
                self._send_json_response(404, {'error': 'Not found'})
        except Exception as e:
            logger.error(f"API error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})

    def do_DELETE(self):
        """Handle DELETE requests"""
        try:
            if self.path.startswith('/api/admin/meetings/'):
                self._handle_delete_meeting()
            else:
                self._send_json_response(404, {'error': 'Not found'})
        except Exception as e:
            logger.error(f"API error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})

    def _handle_health(self):
        """Health check endpoint"""
        try:
            db_status = "connected"
            self.db.client.admin.command('ping')
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
            user = self.db.db.users.find_one({"email": data.get('email')})
            
            if not user:
                self._send_json_response(401, {'success': False, 'message': 'Invalid email or password'})
                return
            
            if bcrypt.checkpw(data.get('password', '').encode('utf-8'), user['password_hash'].encode('utf-8')):
                if user.get('is_active') is False:
                    self._send_json_response(403, {'success': False, 'message': 'This account has been deactivated'})
                    return

                access_token = jwt.encode({
                    'user_id': str(user['_id']),
                    'email': user['email'],
                    'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                refresh_token = jwt.encode({
                    'user_id': str(user['_id']),
                    'exp': datetime.utcnow() + timedelta(days=30)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                logger.info(f"✓ API: Login successful for {user['email']}")
                self._send_json_response(200, {
                    'success': True,
                    'message': 'Login successful',
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': {
                        'id': str(user['_id']),
                        'email': user['email'],
                        'full_name': user['full_name'] or '',
                        'phone': user['phone'] or '',
                        'role': user.get('role', 'user')
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
            
            result = self.db.db.users.insert_one({
                "email": data.get('email'),
                "password_hash": password_hash.decode('utf-8'),
                "full_name": data.get('full_name', ''),
                "phone": data.get('phone', ''),
                "role": "user",
                "is_active": True,
                "created_at": datetime.utcnow()
            })
            
            user_id = result.inserted_id
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

    def _handle_forgot_password(self):
        """Record a password reset request so an admin can follow up."""
        data = self._read_json_body()
        logger.info(f"API: Password reset request from {data.get('email')}")

        try:
            self.db.db.contact_requests.insert_one({
                "name": data.get('name', ''),
                "phone": "",
                "email": data.get('email', ''),
                "message": "Password reset request",
                "type": "password_reset",
                "created_at": datetime.utcnow()
            })
            self.db.commit()
            logger.info("✓ API: Password reset request saved")
            self._send_json_response(200, {
                'success': True,
                'message': 'Password reset request received'
            })
        except Exception as e:
            self.db.rollback()
            logger.error(f"API Forgot password error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_change_password(self):
        """Change the authenticated user's password after verifying the current one."""
        user_id = self._get_user_id_from_token()
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return

        data = self._read_json_body()
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')

        if not new_password or len(new_password) < 6:
            self._send_json_response(400, {
                'success': False,
                'message': 'New password must be at least 6 characters'
            })
            return

        try:
            user = self.db.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                self._send_json_response(404, {'success': False, 'message': 'User not found'})
                return

            if not bcrypt.checkpw(old_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                self._send_json_response(400, {
                    'success': False,
                    'message': 'Current password is incorrect'
                })
                return

            new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            self.db.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"password_hash": new_hash}}
            )
            self.db.commit()
            logger.info(f"✓ API: Password changed for user_id {user_id}")
            self._send_json_response(200, {'success': True, 'message': 'Password changed successfully'})
        except Exception as e:
            self.db.rollback()
            logger.error(f"API ChangePassword error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_pay(self):
        """Mark one of the authenticated user's payments as paid."""
        user_id = self._get_user_id_from_token()
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return

        data = self._read_json_body()
        payment_id = data.get('payment_id')
        if not payment_id:
            self._send_json_response(400, {'success': False, 'message': 'payment_id is required'})
            return

        try:
            result = self.db.db.payments.update_one(
                {"_id": ObjectId(payment_id), "user_id": ObjectId(user_id)},
                {"$set": {"status": "paid", "paid_date": datetime.utcnow()}}
            )

            if result.matched_count == 0:
                self._send_json_response(404, {'success': False, 'message': 'Payment not found'})
                return

            self.db.commit()
            logger.info(f"✓ API: Payment {payment_id} marked as paid")
            self._send_json_response(200, {'success': True, 'message': 'Payment marked as paid'})
        except Exception as e:
            self.db.rollback()
            logger.error(f"API Pay error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_get_profile(self):
        """Handle get profile request"""
        user_id = self._get_user_id_from_token()
        
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        
        try:
            user = self.db.db.users.find_one({"_id": ObjectId(user_id)})
            
            if not user:
                self._send_json_response(404, {'error': 'User not found'})
                return
            
            # Get apartment and building
            apartment_doc = self.db.db.apartments.find_one({"user_id": ObjectId(user_id)})
            
            building_doc = None
            if apartment_doc:
                building_doc = self.db.db.buildings.find_one({"_id": apartment_doc['building_id']})
            
            apartment_building = None
            if apartment_doc and building_doc:
                apartment_building = {**apartment_doc, **building_doc}
                apartment_building['apartment_id'] = apartment_doc['_id']
                apartment_building['building_id'] = building_doc['_id']
            
            # Get user profile
            profile = self.db.db.user_profiles.find_one({"user_id": ObjectId(user_id)})
            
            response = {
                'user': {
                    'id': str(user['_id']),
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
                events_cursor = self.db.db.events.find(
                    {"building_id": apartment_building['building_id']}
                ).sort("date", -1).limit(10)
                events = []
                for event in events_cursor:
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
            payments_cursor = self.db.db.payments.find(
                {"user_id": ObjectId(user_id)}
            ).sort("created_at", -1)
            payments = []
            total_pending = 0.0
            total_overdue = 0.0
            yearly_total = 0.0
            last_payment = None
            
            for payment in payments_cursor:
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
            self.db.db.contact_requests.insert_one({
                "name": data.get('name'),
                "phone": data.get('phone'),
                "email": data.get('email'),
                "message": data.get('message'),
                "type": "contact",
                "created_at": datetime.utcnow()
            })
            
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
            self.db.db.contact_requests.insert_one({
                "name": "",
                "phone": data.get('phone'),
                "email": data.get('email'),
                "message": f"City: {data.get('city')}, Properties: {data.get('num_properties')}, Address: {data.get('address')}, Info: {data.get('additional_info', '')}",
                "type": "offer",
                "created_at": datetime.utcnow()
            })
            
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
            self.db.db.contact_requests.insert_one({
                "name": "",
                "phone": data.get('phone'),
                "email": data.get('email'),
                "message": f"Date: {data.get('date')}, Type: {data.get('building_type')}, Address: {data.get('address')}, Info: {data.get('additional_info', '')}",
                "type": "presentation",
                "created_at": datetime.utcnow()
            })
            
            self.db.commit()
            logger.info("✓ API: Presentation request saved")
            self._send_json_response(200, {'success': True, 'message': 'Your presentation request has been received'})
        except Exception as e:
            self.db.rollback()
            logger.error(f"API Presentation error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})
    
    def _handle_get_residents(self):
        """Handle get all residents (admin endpoint)"""
        if not self._require_admin():
            return

        try:
            pipeline = [
                {"$lookup": {
                    "from": "apartments",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "apartment_data"
                }},
                {"$unwind": {"path": "$apartment_data", "preserveNullAndEmptyArrays": True}},
                {"$lookup": {
                    "from": "buildings",
                    "localField": "apartment_data.building_id",
                    "foreignField": "_id",
                    "as": "building_data"
                }},
                {"$unwind": {"path": "$building_data", "preserveNullAndEmptyArrays": True}},
                {"$lookup": {
                    "from": "entrances",
                    "localField": "apartment_data.entrance_id",
                    "foreignField": "_id",
                    "as": "entrance_data"
                }},
                {"$unwind": {"path": "$entrance_data", "preserveNullAndEmptyArrays": True}},
                {"$lookup": {
                    "from": "user_profiles",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "profile_data"
                }},
                {"$unwind": {"path": "$profile_data", "preserveNullAndEmptyArrays": True}},
                {"$sort": {"_id": 1}}
            ]
            
            residents_cursor = self.db.db.users.aggregate(pipeline)
            
            residents = []
            for row in residents_cursor:
                # Calculate total debt from payments
                debt_agg = self.db.db.payments.aggregate([
                    {"$match": {"user_id": row['_id'], "status": {"$in": ["pending", "overdue"]}}},
                    {"$group": {"_id": None, "total_debt": {"$sum": "$amount"}}}
                ])
                debt_result = next(debt_agg, {"total_debt": 0.0})
                
                residents.append({
                    'id': str(row['_id']),
                    'name': row.get('full_name', ''),
                    'email': row['email'],
                    'building': row.get('building_data', {}).get('address', ''),
                    'entrance': row.get('entrance_data', {}).get('label')
                        or row.get('building_data', {}).get('entrance', ''),
                    'apartment': str(row.get('apartment_data', {}).get('number', '')),
                    'clientNumber': row.get('profile_data', {}).get('client_number', ''),
                    'residentsCount': row.get('apartment_data', {}).get('residents', 0),
                    'balance': float(row.get('profile_data', {}).get('balance', 0.0)),
                    'totalDebt': float(debt_result['total_debt']),
                    'role': row.get('role', 'user'),
                    'isActive': row.get('is_active', True),
                })
            
            self._send_json_response(200, {'residents': residents})
        except Exception as e:
            logger.error(f"API GetResidents error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})

    # ---- Admin: entrances & residents ----

    def _apartment_payment_summary(self, payments):
        amount_due = sum(p['amount'] for p in (payments or []) if p.get('status') in ['pending', 'overdue'])
        status = 'paid'
        if any(p.get('status') == 'overdue' for p in (payments or [])):
            status = 'overdue'
        elif any(p.get('status') == 'pending' for p in (payments or [])):
            status = 'pending'
        return amount_due, status

    def _build_entrance_view(self, entrance):
        building = self.db.db.buildings.find_one({"_id": entrance['building_id']})
        per_floor = entrance.get('apartments_per_floor') or 1

        apts = self.db.db.apartments.aggregate([
            {"$match": {"entrance_id": entrance['_id']}},
            {"$lookup": {"from": "users", "localField": "user_id", "foreignField": "_id", "as": "user"}},
            {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {"from": "user_profiles", "localField": "user_id", "foreignField": "user_id", "as": "profile"}},
            {"$unwind": {"path": "$profile", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {"from": "payments", "localField": "_id", "foreignField": "apartment_id", "as": "payments"}},
            {"$sort": {"number": 1}}
        ])

        floors_map = {}
        for apt in apts:
            amount_due, status = self._apartment_payment_summary(apt.get('payments', []))
            family = (apt.get('user', {}) or {}).get('full_name') or apt.get('owner_name') or 'Неизвестни'
            floor = apt.get('floor') or 1
            floors_map.setdefault(floor, []).append({
                'id': str(apt['_id']),
                'number': apt['number'],
                'family': family,
                'amount': float(amount_due),
                'status': status,
                'residents': apt.get('residents', 0),
                'email': (apt.get('user', {}) or {}).get('email', ''),
                'clientNumber': (apt.get('profile', {}) or {}).get('client_number', ''),
            })

        floors = [{'floor': f, 'apartments': a} for f, a in sorted(floors_map.items(), reverse=True)]
        apartment_layout = ",".join(str(i + 1) for i in range(per_floor))

        return {
            'id': str(entrance['_id']),
            'building': building['address'] if building else '',
            'address': building['address'] if building else '',
            'entrance': entrance.get('label', ''),
            'floorsCount': entrance.get('floors_count') or len(floors) or 1,
            'apartmentsPerFloor': per_floor,
            'apartmentLayout': apartment_layout,
            'floors': floors,
        }

    def _upsert_building_by_address(self, address, entrance_label):
        existing = self.db.db.buildings.find_one({"address": address})
        if existing:
            return existing['_id']
        return self.db.db.buildings.insert_one({
            "address": address,
            "entrance": entrance_label or '',
            "total_apartments": 0,
            "total_residents": 0,
            "created_at": datetime.utcnow()
        }).inserted_id

    def _resolve_apartment(self, building_address, entrance_label, apartment_number):
        building = self.db.db.buildings.find_one({"address": building_address})
        if not building:
            return None
        entrance = self.db.db.entrances.find_one({"building_id": building['_id'], "label": entrance_label})
        if not entrance:
            return None
        try:
            number = int(apartment_number)
        except (TypeError, ValueError):
            return None
        return self.db.db.apartments.find_one({"entrance_id": entrance['_id'], "number": number})

    def _map_role(self, role):
        """Map a UI role label to an internal role; None when not provided
        (callers preserve the existing role in that case)."""
        if role in (None, ''):
            return None
        r = str(role).lower()
        if r in ('admin', 'админ'):
            return 'admin'
        if r in ('manager', 'домоуправител'):
            return 'manager'
        return 'user'

    def _handle_get_entrances(self):
        if not self._require_admin():
            return
        try:
            entrances = list(self.db.db.entrances.find({}).sort("_id", 1))
            views = [self._build_entrance_view(e) for e in entrances]
            self._send_json_response(200, {'entrances': views})
        except Exception as e:
            logger.error(f"API GetEntrances error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})

    def _handle_create_entrance(self):
        if not self._require_admin():
            return
        data = self._read_json_body()
        address = (data.get('address') or data.get('building') or '').strip()
        label = (data.get('entrance') or '').strip()
        floors_count = max(1, int(data.get('floorsCount') or 1))
        per_floor = max(1, int(data.get('apartmentsPerFloor') or 1))

        if not address or not label:
            self._send_json_response(400, {'success': False, 'message': 'Building address and entrance label are required'})
            return

        try:
            building_id = self._upsert_building_by_address(address, label)

            if self.db.db.entrances.find_one({"building_id": building_id, "label": label}):
                self._send_json_response(409, {'success': False, 'message': 'This entrance already exists for the building'})
                return

            entrance_id = self.db.db.entrances.insert_one({
                "building_id": building_id,
                "label": label,
                "floors_count": floors_count,
                "apartments_per_floor": per_floor,
                "created_at": datetime.utcnow()
            }).inserted_id

            total = floors_count * per_floor
            docs = []
            for n in range(1, total + 1):
                docs.append({
                    "building_id": building_id,
                    "entrance_id": entrance_id,
                    "number": n,
                    "floor": -(-n // per_floor),  # ceil division
                    "type": "Апартамент",
                    "residents": 0,
                    "owner_name": "",
                    "user_id": None
                })
            if docs:
                self.db.db.apartments.insert_many(docs)

            entrance = self.db.db.entrances.find_one({"_id": entrance_id})
            self._send_json_response(201, {'success': True, 'message': 'Entrance created', 'entrance': self._build_entrance_view(entrance)})
        except Exception as e:
            logger.error(f"API CreateEntrance error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_update_entrance(self):
        if not self._require_admin():
            return
        parts = self.path.split('?')[0].split('/')  # /api/admin/entrances/:id
        raw_id = parts[4] if len(parts) > 4 else None
        data = self._read_json_body()

        try:
            _id = ObjectId(raw_id)
        except Exception:
            self._send_json_response(400, {'success': False, 'message': 'Invalid entrance id'})
            return

        try:
            entrance = self.db.db.entrances.find_one({"_id": _id})
            if not entrance:
                self._send_json_response(404, {'success': False, 'message': 'Entrance not found'})
                return

            label = (data.get('entrance') or entrance.get('label') or '').strip()
            floors_count = max(1, int(data.get('floorsCount') or entrance.get('floors_count') or 1))
            per_floor = max(1, int(data.get('apartmentsPerFloor') or entrance.get('apartments_per_floor') or 1))
            address = (data.get('address') or data.get('building') or '').strip()

            self.db.db.entrances.update_one(
                {"_id": _id},
                {"$set": {"label": label, "floors_count": floors_count, "apartments_per_floor": per_floor}}
            )
            if address:
                self.db.db.buildings.update_one({"_id": entrance['building_id']}, {"$set": {"address": address}})

            # Reconcile apartments: keep/refloor 1..total, add missing, delete extras (preserves filled data by number)
            total = floors_count * per_floor
            for n in range(1, total + 1):
                self.db.db.apartments.update_one(
                    {"entrance_id": _id, "number": n},
                    {
                        "$set": {"floor": -(-n // per_floor), "building_id": entrance['building_id']},
                        "$setOnInsert": {"type": "Апартамент", "residents": 0, "owner_name": "", "user_id": None}
                    },
                    upsert=True
                )
            self.db.db.apartments.delete_many({"entrance_id": _id, "number": {"$gt": total}})

            updated = self.db.db.entrances.find_one({"_id": _id})
            self._send_json_response(200, {'success': True, 'message': 'Entrance updated', 'entrance': self._build_entrance_view(updated)})
        except Exception as e:
            logger.error(f"API UpdateEntrance error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_create_resident(self):
        if not self._require_admin():
            return
        data = self._read_json_body()

        apartment = self._resolve_apartment(data.get('building'), data.get('entrance'), data.get('apartment'))
        if not apartment:
            self._send_json_response(404, {'success': False, 'message': 'Apartment not found for the given building/entrance/number'})
            return

        try:
            user_id = None
            temp_password = None
            email = (data.get('email') or '').strip()

            if email:
                existing = self.db.db.users.find_one({"email": email})
                if existing:
                    user_id = existing['_id']
                    self.db.db.users.update_one({"_id": user_id}, {"$set": {
                        "full_name": data.get('name') or existing.get('full_name', ''),
                        "role": self._map_role(data.get('role')) or existing.get('role', 'user'),
                        "is_active": bool(data.get('isActive', True)),
                    }})
                else:
                    password = data.get('password')
                    if not password:
                        password = secrets.token_urlsafe(9)
                        temp_password = password
                    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    user_id = self.db.db.users.insert_one({
                        "email": email,
                        "password_hash": password_hash,
                        "full_name": data.get('name') or '',
                        "phone": data.get('phone') or '',
                        "role": self._map_role(data.get('role')) or 'user',
                        "is_active": bool(data.get('isActive', True)),
                        "created_at": datetime.utcnow()
                    }).inserted_id

                self.db.db.user_profiles.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {"balance": float(data.get('balance') or 0), "client_number": data.get('clientNumber') or ''},
                        "$setOnInsert": {"account_manager": '', "contract_end_date": None}
                    },
                    upsert=True
                )

            self.db.db.apartments.update_one(
                {"_id": apartment['_id']},
                {"$set": {
                    "user_id": user_id,
                    "residents": int(data.get('residentsCount') or 0),
                    "owner_name": data.get('name') or ''
                }}
            )

            self._send_json_response(201, {
                'success': True,
                'message': 'Resident saved',
                'user_id': str(user_id) if user_id else None,
                'apartment_id': str(apartment['_id']),
                'temp_password': temp_password
            })
        except Exception as e:
            logger.error(f"API CreateResident error: {e}", exc_info=True)
            msg = str(e)
            if 'duplicate key' in msg.lower():
                self._send_json_response(400, {'success': False, 'message': 'Email already registered'})
            else:
                self._send_json_response(500, {'success': False, 'message': msg})

    def _handle_update_resident(self):
        if not self._require_admin():
            return
        parts = self.path.split('?')[0].split('/')  # /api/admin/residents/:id
        raw_id = parts[4] if len(parts) > 4 else None
        data = self._read_json_body()

        try:
            user_id = ObjectId(raw_id)
        except Exception:
            self._send_json_response(400, {'success': False, 'message': 'Invalid resident id'})
            return

        try:
            user = self.db.db.users.find_one({"_id": user_id})
            if not user:
                self._send_json_response(404, {'success': False, 'message': 'Resident not found'})
                return

            self.db.db.users.update_one({"_id": user_id}, {"$set": {
                "full_name": data.get('name') if data.get('name') is not None else user.get('full_name'),
                "role": self._map_role(data.get('role')) or user.get('role', 'user'),
                "is_active": bool(data.get('isActive', user.get('is_active', True))),
            }})

            self.db.db.user_profiles.update_one(
                {"user_id": user_id},
                {
                    "$set": {"balance": float(data.get('balance') or 0), "client_number": data.get('clientNumber') or ''},
                    "$setOnInsert": {"account_manager": '', "contract_end_date": None}
                },
                upsert=True
            )

            if data.get('building') and data.get('entrance') and data.get('apartment'):
                apartment = self._resolve_apartment(data.get('building'), data.get('entrance'), data.get('apartment'))
                if apartment:
                    self.db.db.apartments.update_many(
                        {"user_id": user_id, "_id": {"$ne": apartment['_id']}},
                        {"$set": {"user_id": None}}
                    )
                    self.db.db.apartments.update_one(
                        {"_id": apartment['_id']},
                        {"$set": {"user_id": user_id, "residents": int(data.get('residentsCount') or 0), "owner_name": data.get('name') or ''}}
                    )

            self._send_json_response(200, {'success': True, 'message': 'Resident updated'})
        except Exception as e:
            logger.error(f"API UpdateResident error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    # ---- Issues & maintenance reports ----

    def _issue_view(self, issue, resident=None, location=None):
        view = {
            'id': str(issue['_id']),
            'title': issue.get('title', ''),
            'description': issue.get('description', ''),
            'category': issue.get('category', 'other'),
            'status': issue.get('status', 'new'),
            'replies': [{
                'author_name': r.get('author_name', ''),
                'author_role': r.get('author_role', 'user'),
                'message': r.get('message', ''),
                'created_at': r['created_at'].isoformat() if r.get('created_at') else ''
            } for r in issue.get('replies', [])],
            'created_at': issue['created_at'].isoformat() if issue.get('created_at') else '',
            'updated_at': issue['updated_at'].isoformat() if issue.get('updated_at') else '',
        }
        if resident is not None:
            view['resident_name'] = resident.get('full_name') or resident.get('email') or ''
            view['resident_email'] = resident.get('email', '')
        if location is not None:
            view['building'] = location.get('building', '')
            view['entrance'] = location.get('entrance', '')
            view['apartment'] = location.get('apartment', '')
        return view

    def _handle_create_issue(self):
        user_id = self._get_user_id_from_token()
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return

        data = self._read_json_body()
        title = (data.get('title') or '').strip()
        description = (data.get('description') or '').strip()
        if not title:
            self._send_json_response(400, {'success': False, 'message': 'Title is required'})
            return

        try:
            apt = self.db.db.apartments.find_one({"user_id": ObjectId(user_id)})
            now = datetime.utcnow()
            result = self.db.db.issues.insert_one({
                "user_id": ObjectId(user_id),
                "building_id": apt.get('building_id') if apt else None,
                "entrance_id": apt.get('entrance_id') if apt else None,
                "apartment_id": apt.get('_id') if apt else None,
                "title": title,
                "description": description,
                "category": data.get('category') or 'other',
                "status": "new",
                "replies": [],
                "created_at": now,
                "updated_at": now
            })
            self._send_json_response(201, {'success': True, 'message': 'Issue submitted', 'id': str(result.inserted_id)})
        except Exception as e:
            logger.error(f"API CreateIssue error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_get_my_issues(self):
        user_id = self._get_user_id_from_token()
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        try:
            docs = self.db.db.issues.find({"user_id": ObjectId(user_id)}).sort("created_at", -1)
            self._send_json_response(200, {'issues': [self._issue_view(d) for d in docs]})
        except Exception as e:
            logger.error(f"API GetMyIssues error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})

    def _handle_reply_issue(self):
        user_id = self._get_user_id_from_token()
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return

        parts = self.path.split('?')[0].split('/')  # /api/issues/:id/reply
        try:
            issue_id = ObjectId(parts[3])
        except Exception:
            self._send_json_response(400, {'success': False, 'message': 'Invalid issue id'})
            return

        data = self._read_json_body()
        message = (data.get('message') or '').strip()
        if not message:
            self._send_json_response(400, {'success': False, 'message': 'Message is required'})
            return

        try:
            issue = self.db.db.issues.find_one({"_id": issue_id})
            if not issue:
                self._send_json_response(404, {'success': False, 'message': 'Issue not found'})
                return

            me = self.db.db.users.find_one({"_id": ObjectId(user_id)})
            is_owner = issue.get('user_id') is not None and str(issue['user_id']) == user_id
            is_staff = me is not None and me.get('role') in ('admin', 'manager')
            if not is_owner and not is_staff:
                self._send_json_response(403, {'error': 'Forbidden'})
                return

            self.db.db.issues.update_one(
                {"_id": issue_id},
                {
                    "$push": {"replies": {
                        "author_id": ObjectId(user_id),
                        "author_role": me.get('role', 'user') if me else 'user',
                        "author_name": (me.get('full_name') or me.get('email')) if me else '',
                        "message": message,
                        "created_at": datetime.utcnow()
                    }},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            self._send_json_response(200, {'success': True, 'message': 'Reply added'})
        except Exception as e:
            logger.error(f"API ReplyIssue error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_get_admin_issues(self):
        if not self._require_staff():
            return
        try:
            query = parse_qs(urlparse(self.path).query)
            status_filter = query.get('status', [None])[0]

            pipeline = []
            if status_filter in ISSUE_STATUSES:
                pipeline.append({"$match": {"status": status_filter}})
            pipeline += [
                {"$sort": {"created_at": -1}},
                {"$lookup": {"from": "users", "localField": "user_id", "foreignField": "_id", "as": "resident"}},
                {"$unwind": {"path": "$resident", "preserveNullAndEmptyArrays": True}},
                {"$lookup": {"from": "buildings", "localField": "building_id", "foreignField": "_id", "as": "b"}},
                {"$unwind": {"path": "$b", "preserveNullAndEmptyArrays": True}},
                {"$lookup": {"from": "entrances", "localField": "entrance_id", "foreignField": "_id", "as": "e"}},
                {"$unwind": {"path": "$e", "preserveNullAndEmptyArrays": True}},
                {"$lookup": {"from": "apartments", "localField": "apartment_id", "foreignField": "_id", "as": "a"}},
                {"$unwind": {"path": "$a", "preserveNullAndEmptyArrays": True}},
            ]
            rows = self.db.db.issues.aggregate(pipeline)
            issues = []
            for d in rows:
                location = {
                    'building': d.get('b', {}).get('address', '') if d.get('b') else '',
                    'entrance': d.get('e', {}).get('label', '') if d.get('e') else '',
                    'apartment': str(d.get('a', {}).get('number', '')) if d.get('a') else '',
                }
                issues.append(self._issue_view(d, resident=d.get('resident') or {}, location=location))
            self._send_json_response(200, {'issues': issues})
        except Exception as e:
            logger.error(f"API GetAdminIssues error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})

    def _handle_update_issue_status(self):
        if not self._require_staff():
            return
        parts = self.path.split('?')[0].split('/')  # /api/admin/issues/:id/status
        try:
            issue_id = ObjectId(parts[4])
        except Exception:
            self._send_json_response(400, {'success': False, 'message': 'Invalid issue id'})
            return

        data = self._read_json_body()
        if data.get('status') not in ISSUE_STATUSES:
            self._send_json_response(400, {'success': False, 'message': 'Invalid status'})
            return

        try:
            result = self.db.db.issues.update_one(
                {"_id": issue_id},
                {"$set": {"status": data['status'], "updated_at": datetime.utcnow()}}
            )
            if result.matched_count == 0:
                self._send_json_response(404, {'success': False, 'message': 'Issue not found'})
                return
            self._send_json_response(200, {'success': True, 'message': 'Status updated'})
        except Exception as e:
            logger.error(f"API UpdateIssueStatus error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    # ---- Meetings & online sessions ----

    def _meeting_view(self, m):
        return {
            'id': str(m['_id']),
            'title': m.get('title', ''),
            'description': m.get('description', ''),
            'agenda': m.get('agenda', ''),
            'date': m['date'].isoformat() if m.get('date') else '',
            'location': m.get('location', ''),
            'online_provider': m.get('online_provider', ''),
            'online_url': m.get('online_url', ''),
            'created_at': m['created_at'].isoformat() if m.get('created_at') else '',
        }

    def _handle_get_meetings(self):
        user_id = self._get_user_id_from_token()
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        try:
            docs = self.db.db.meetings.find({}).sort("date", -1)
            self._send_json_response(200, {'meetings': [self._meeting_view(m) for m in docs]})
        except Exception as e:
            logger.error(f"API GetMeetings error: {e}", exc_info=True)
            self._send_json_response(500, {'error': str(e)})

    def _handle_create_meeting(self):
        staff = self._require_staff()
        if not staff:
            return

        data = self._read_json_body()
        title = (data.get('title') or '').strip()
        if not title:
            self._send_json_response(400, {'success': False, 'message': 'Title is required'})
            return

        provider = data.get('online_provider') if data.get('online_provider') in MEETING_PROVIDERS else 'other'
        url = (data.get('online_url') or '').strip()
        if provider == 'jitsi' and not url:
            url = f"https://meet.jit.si/DomUnity-{secrets.token_hex(6)}"

        date = None
        if data.get('date'):
            try:
                date = datetime.fromisoformat(str(data['date']).replace('Z', '+00:00'))
            except (ValueError, TypeError):
                date = None

        try:
            apt = self.db.db.apartments.find_one({"user_id": staff['_id']})
            result = self.db.db.meetings.insert_one({
                "building_id": apt.get('building_id') if apt else None,
                "entrance_id": apt.get('entrance_id') if apt else None,
                "title": title,
                "description": data.get('description') or '',
                "agenda": data.get('agenda') or '',
                "date": date,
                "location": data.get('location') or '',
                "online_provider": provider,
                "online_url": url,
                "created_at": datetime.utcnow()
            })
            created = self.db.db.meetings.find_one({"_id": result.inserted_id})
            self._send_json_response(201, {
                'success': True,
                'id': str(result.inserted_id),
                'meeting': self._meeting_view(created)
            })
        except Exception as e:
            logger.error(f"API CreateMeeting error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_delete_meeting(self):
        if not self._require_staff():
            return
        parts = self.path.split('?')[0].split('/')  # /api/admin/meetings/:id
        try:
            meeting_id = ObjectId(parts[4])
        except Exception:
            self._send_json_response(400, {'success': False, 'message': 'Invalid meeting id'})
            return
        try:
            result = self.db.db.meetings.delete_one({"_id": meeting_id})
            if result.deleted_count == 0:
                self._send_json_response(404, {'success': False, 'message': 'Meeting not found'})
                return
            self._send_json_response(200, {'success': True, 'message': 'Meeting deleted'})
        except Exception as e:
            logger.error(f"API DeleteMeeting error: {e}", exc_info=True)
            self._send_json_response(500, {'success': False, 'message': str(e)})

    def _handle_get_apartment(self):
        """Handle get user's apartment details with payments and maintenance"""
        user_id = self._get_user_id_from_token()
        
        if not user_id:
            self._send_json_response(401, {'error': 'Unauthorized'})
            return
        
        try:
            # Get apartment and building info (None when the user has no apartment)
            apt_data = next(self.db.db.apartments.aggregate([
                {"$match": {"user_id": ObjectId(user_id)}},
                {"$lookup": {
                    "from": "buildings",
                    "localField": "building_id",
                    "foreignField": "_id",
                    "as": "building"
                }},
                {"$unwind": "$building"},
                {"$lookup": {
                    "from": "user_profiles",
                    "localField": "user_id",
                    "foreignField": "user_id",
                    "as": "profile"
                }},
                {"$unwind": {"path": "$profile", "preserveNullAndEmptyArrays": True}}
            ]), None)

            if not apt_data:
                self._send_json_response(404, {'error': 'No apartment found for user'})
                return
            
            # Get payments for this user
            payments_cursor = self.db.db.payments.find(
                {"user_id": ObjectId(user_id)}
            ).sort("created_at", -1)
            
            payments = []
            for p in payments_cursor:
                # Parse period into month/year
                period_parts = p['period'].split(' ') if p['period'] else ['', '']
                payments.append({
                    'id': str(p['_id']),
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
            maintenance_cursor = self.db.db.maintenance_records.find(
                {"building_id": apt_data['building']['_id']}
            ).sort("date", -1)
            
            maintenance = []
            for m in maintenance_cursor:
                maintenance.append({
                    'date': m['date'].strftime('%d.%m.%Y') if m['date'] else '',
                    'description': m['description'] or '',
                    'cost': f"{float(m['cost']):.2f} лв." if m['cost'] else '0.00 лв.',
                    'status': m['status'] or 'planned',
                })
            
            response = {
                'apartmentInfo': {
                    'building': apt_data['building']['address'],
                    'entrance': apt_data['building'].get('entrance', ''),
                    'number': str(apt_data['number']),
                    'residents': apt_data.get('residents', 0),
                    'balance': float(apt_data.get('profile', {}).get('balance', 0.0)),
                    'clientNumber': apt_data.get('profile', {}).get('client_number', ''),
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
            raw_building_id = parts[3] if len(parts) > 3 else None
            building_id = self._resolve_building_id(raw_building_id, user_id)

            if not building_id:
                self._send_json_response(404, {'error': 'No building found'})
                return

            # Get building info
            building = self.db.db.buildings.find_one({"_id": building_id})

            # Scope to the requesting user's entrance when we can determine it.
            own_apt = self.db.db.apartments.find_one({"user_id": ObjectId(user_id)})
            entrance_id = own_apt.get('entrance_id') if own_apt else None
            entrance = self.db.db.entrances.find_one({"_id": entrance_id}) if entrance_id else None
            match = {"entrance_id": entrance_id} if entrance_id else {"building_id": building_id}

            # Get all apartments with their payment status
            pipeline = [
                {"$match": match},
                {"$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user"
                }},
                {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
                {"$lookup": {
                    "from": "payments",
                    "localField": "_id",
                    "foreignField": "apartment_id",
                    "as": "payments"
                }},
                {"$sort": {"floor": -1, "number": 1}}
            ]

            apt_cursor = self.db.db.apartments.aggregate(pipeline)
            
            # Group by floor
            floors_dict = {}
            for apt in apt_cursor:
                # Calculate amount_due and status from the joined payments
                payments = apt.get('payments', [])
                amount_due = sum(p['amount'] for p in payments if p['status'] in ['pending', 'overdue'])
                
                status = 'paid'
                if any(p['status'] == 'overdue' for p in payments):
                    status = 'overdue'
                elif any(p['status'] == 'pending' for p in payments):
                    status = 'pending'
                
                floor_num = apt.get('floor') or 1
                if floor_num not in floors_dict:
                    floors_dict[floor_num] = []
                
                full_name = apt.get('user', {}).get('full_name', '') or apt.get('owner_name', '')
                floors_dict[floor_num].append({
                    'number': apt['number'],
                    'family': full_name.split(' ')[0] + 'и' if full_name else 'Неизвестни',
                    'amount': float(amount_due),
                    'status': status,
                })

            floors = [{'floor': f, 'apartments': apts} for f, apts in sorted(floors_dict.items(), reverse=True)]

            response = {
                'building': {
                    'address': building['address'] if building else '',
                    'entrance': (entrance.get('label') if entrance else None)
                        or (building['entrance'] if building else ''),
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
            raw_building_id = parts[3] if len(parts) > 3 else None
            building_id = self._resolve_building_id(raw_building_id, user_id)

            if not building_id:
                self._send_json_response(400, {'error': 'Building ID required'})
                return

            maintenance_cursor = self.db.db.maintenance_records.find(
                {"building_id": building_id}
            ).sort("date", -1)
            
            maintenance = []
            for m in maintenance_cursor:
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
    _mongo_set = bool(os.getenv('MONGODB_URI')) or (os.getenv('DATABASE_URL', '').startswith('mongodb'))
    logger.info(f"  MONGODB_URI: {'SET' if _mongo_set else 'NOT SET'}")
    logger.info(f"  JWT_SECRET: {'SET' if os.getenv('JWT_SECRET') else 'USING DEFAULT'}")
    logger.info(f"  GRPC_PORT: {os.getenv('GRPC_PORT', '50051')}")
    logger.info(f"  HTTP_PORT: {os.getenv('PORT', '8080')}")
    logger.info("=" * 80)

    # Never run in production with the hardcoded fallback secret.
    if not os.getenv('JWT_SECRET'):
        is_production = bool(os.getenv('RENDER')) or os.getenv('ENV') == 'production' or os.getenv('NODE_ENV') == 'production'
        if is_production:
            logger.error("✗ JWT_SECRET is not set — refusing to start in production.")
            sys.exit(1)
        logger.warning("⚠ JWT_SECRET not set — using an insecure development default. Do NOT use in production.")
    
    # Initialize database FIRST (needed for both HTTP API and gRPC)
    try:
        db = Database()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        sys.exit(1)
    
    # Start HTTP REST API server
    http_port = int(os.getenv('HTTP_PORT', os.getenv('PORT', '8080')))
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
    grpc_port = os.getenv('GRPC_PORT', '50051')
    server.add_insecure_port(f'0.0.0.0:{grpc_port}')
    server.start()
    
    logger.info("=" * 80)
    logger.info(f"✓ SERVERS STARTED SUCCESSFULLY")
    logger.info("=" * 80)
    logger.info(f"\ngRPC Server: 0.0.0.0:{grpc_port}")
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
