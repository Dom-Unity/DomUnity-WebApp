import os
import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from datetime import datetime
import bcrypt

logger = logging.getLogger(__name__)

class DatabaseAddress:
    """Helper to represent a database address similar to how it was used before"""
    def __init__(self, db):
        self.db = db
        
    def __getitem__(self, name):
        return self.db[name]

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        self.connect()
        
    def connect(self):
        """Connect to MongoDB database with comprehensive logging"""
        try:
            mongodb_uri = os.getenv('MONGODB_URI')
            # Fallback to DATABASE_URL if MONGODB_URI is not set yet but has a mongo scheme
            if not mongodb_uri:
                fallback_url = os.getenv('DATABASE_URL')
                if fallback_url and fallback_url.startswith('mongodb'):
                    mongodb_uri = fallback_url
            
            logger.info("=" * 80)
            logger.info("MONGODB CONNECTION ATTEMPT")
            logger.info("=" * 80)
            logger.info(f"MongoDB URI present: {bool(mongodb_uri)}")
            
            if mongodb_uri:
                # Log the URI (obscure password)
                obscured_uri = self._obscure_password(mongodb_uri)
                logger.info(f"MongoDB URI (obscured): {obscured_uri}")
            else:
                logger.error("MONGODB_URI environment variable not set!")
                raise ValueError("MONGODB_URI not configured")
            
            self.client = MongoClient(mongodb_uri)
            # Trigger connection
            self.client.admin.command('ping')
            
            # Get database name from URI or use default
            try:
                db_name = self.client.get_database().name
            except Exception:
                db_name = 'domunity'
            
            self.db = self.client[db_name]
            
            logger.info(f"✓ Database connection established successfully to: {db_name}")
            logger.info("=" * 80)
            
            # Initialize schema (indexes)
            self._init_schema()
            
        except Exception as e:
            logger.error("=" * 80)
            logger.error("DATABASE CONNECTION FAILED")
            logger.error("=" * 80)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            logger.error("=" * 80)
            raise
    
    def _obscure_password(self, uri):
        """Obscure password in connection string for logging"""
        try:
            if '@' in uri and ':' in uri:
                parts = uri.split('@')
                before_at = parts[0]
                after_at = '@'.join(parts[1:])
                
                if '://' in before_at:
                    protocol, credentials = before_at.split('://', 1)
                    if ':' in credentials:
                        username, _ = credentials.split(':', 1)
                        return f"{protocol}://{username}:****@{after_at}"
            return uri
        except:
            return "****"
    
    def _init_schema(self):
        """Initialize MongoDB indexes with logging"""
        logger.info("Initializing database indexes...")
        
        try:
            # Users indexes
            self.db.users.create_index([("email", ASCENDING)], unique=True)
            
            # Buildings indexes
            self.db.buildings.create_index([("address", ASCENDING)])
            
            # Apartments indexes
            self.db.apartments.create_index([("building_id", ASCENDING)])
            self.db.apartments.create_index([("user_id", ASCENDING)])
            self.db.apartments.create_index([("building_id", ASCENDING), ("number", ASCENDING)])
            
            # Events indexes
            self.db.events.create_index([("building_id", ASCENDING), ("date", DESCENDING)])
            
            # Financial records indexes
            self.db.financial_records.create_index([("apartment_id", ASCENDING), ("period", ASCENDING)])
            
            # User profiles indexes
            self.db.user_profiles.create_index([("user_id", ASCENDING)], unique=True)
            
            # Payments indexes
            self.db.payments.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
            self.db.payments.create_index([("apartment_id", ASCENDING)])
            
            # Maintenance records indexes
            self.db.maintenance_records.create_index([("building_id", ASCENDING), ("date", DESCENDING)])
            
            logger.info("✓ Database indexes initialized successfully")
            
            # Insert sample data if collections are empty
            self._insert_sample_data()
            
        except Exception as e:
            logger.error(f"Index initialization failed: {e}")
            raise
    
    def _insert_sample_data(self):
        """Insert sample data for testing into MongoDB"""
        try:
            if self.db.buildings.count_documents({}) == 0:
                logger.info("Inserting sample data into MongoDB...")
                
                # Insert sample building
                building = {
                    "address": "ж.к. Младост 3, бл. 325",
                    "entrance": "Б",
                    "total_apartments": 24,
                    "total_residents": 38
                }
                building_id = self.db.buildings.insert_one(building).inserted_id
                
                # Insert sample test users
                users_data = [
                    ('ivan.ivanov@example.com', 'Иван Иванов', '+359 888 123 456', 'user', True),
                    ('m.georgieva@example.com', 'Мария Георгиева', '+359 888 234 567', 'user', True),
                    ('petar.petrov@example.com', 'Петър Петров', '+359 888 345 678', 'user', False),
                    ('admin@domunity.bg', 'Админ ДомУнити', '+359 888 000 000', 'admin', True),
                ]
                
                user_ids = []
                for email, name, phone, role, is_active in users_data:
                    password_hash = bcrypt.hashpw('test123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    user = {
                        "email": email,
                        "password_hash": password_hash,
                        "full_name": name,
                        "phone": phone,
                        "role": role,
                        "is_active": is_active,
                        "created_at": datetime.utcnow()
                    }
                    u_id = self.db.users.insert_one(user).inserted_id
                    user_ids.append(u_id)
                
                # Insert apartments
                apartments_data = [
                    (25, 5, 3, user_ids[0]), # Ivan
                    (26, 5, 2, user_ids[1]), # Maria
                    (27, 5, 4, user_ids[2]), # Petar
                    (22, 4, 2, None),
                    (23, 4, 3, None),
                    (24, 4, 2, None),
                ]
                
                apartment_ids = []
                for number, floor, residents, uid in apartments_data:
                    apt = {
                        "building_id": building_id,
                        "number": number,
                        "floor": floor,
                        "type": "Апартамент",
                        "residents": residents,
                        "user_id": uid
                    }
                    a_id = self.db.apartments.insert_one(apt).inserted_id
                    apartment_ids.append(a_id)
                
                # Insert user profiles
                profiles_data = [
                    (user_ids[0], 'Мария Петрова', 0.00, '12356787'),
                    (user_ids[1], 'Мария Петрова', -10.00, '98765432'),
                    (user_ids[2], 'Мария Петрова', 0.00, '55555555'),
                ]
                for uid, manager, balance, client_num in profiles_data:
                    profile = {
                        "user_id": uid,
                        "account_manager": manager,
                        "balance": balance,
                        "client_number": client_num,
                        "contract_end_date": datetime(2026, 12, 31)
                    }
                    self.db.user_profiles.insert_one(profile)
                
                # Insert sample payments
                payments_data = [
                    (user_ids[0], apartment_ids[0], 30.00, 'Ноември 2025', 'pending', None),
                    (user_ids[0], apartment_ids[0], 40.00, 'Октомври 2025', 'paid', datetime(2025, 10, 15)),
                    (user_ids[0], apartment_ids[0], 30.00, 'Септември 2025', 'paid', datetime(2025, 9, 12)),
                    (user_ids[1], apartment_ids[1], 25.00, 'Ноември 2025', 'pending', None),
                    (user_ids[1], apartment_ids[1], 25.00, 'Октомври 2025', 'paid', datetime(2025, 10, 20)),
                    (user_ids[2], apartment_ids[2], 35.00, 'Ноември 2025', 'overdue', None),
                    (user_ids[2], apartment_ids[2], 35.00, 'Октомври 2025', 'overdue', None),
                ]
                for uid, apt_id, amount, period, status, paid_date in payments_data:
                    payment = {
                        "user_id": uid,
                        "apartment_id": apt_id,
                        "amount": amount,
                        "period": period,
                        "status": status,
                        "paid_date": paid_date,
                        "created_at": datetime.utcnow()
                    }
                    self.db.payments.insert_one(payment)
                
                # Insert sample events
                events = [
                    {"building_id": building_id, "date": datetime(2025, 11, 5), "title": "Планирана профилактика", "description": "Планирана профилактика на асансьора от 10:00 до 13:00 ч."},
                    {"building_id": building_id, "date": datetime(2025, 11, 2), "title": "Общо събрание", "description": "Общо събрание на вход Б – от 19:00 ч. във входното фоайе."},
                    {"building_id": building_id, "date": datetime(2025, 10, 28), "title": "Напомняне за такса", "description": "Изпратено напомняне за месечна такса за поддръжка."}
                ]
                self.db.events.insert_many(events)
                
                # Insert maintenance records
                maintenance = [
                    {"building_id": building_id, "date": datetime(2025, 2, 5), "description": "Почистване и дезинфекция на входа", "cost": 20.00, "status": "completed"},
                    {"building_id": building_id, "date": datetime(2025, 3, 18), "description": "Профилактика на асансьора", "cost": 60.00, "status": "planned"},
                    {"building_id": building_id, "date": datetime(2025, 1, 15), "description": "Смяна на осветление в стълбището", "cost": 35.00, "status": "completed"}
                ]
                self.db.maintenance_records.insert_many(maintenance)
                
                logger.info("✓ Sample data inserted successfully into MongoDB")
                
        except Exception as e:
            logger.warning(f"Sample data insertion failed: {e}")

    def get_collection(self, name):
        """Get MongoDB collection"""
        return self.db[name]
    
    def commit(self):
        """No-op for MongoDB (unless using sessions)"""
        pass
    
    def rollback(self):
        """No-op for MongoDB (unless using sessions)"""
        pass
    
    def close(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    def get_db(self):
        """Return the database object"""
        return self.db
