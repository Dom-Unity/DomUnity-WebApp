import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.conn = None
        self.connect()
        
    def connect(self):
        """Connect to PostgreSQL database with comprehensive logging"""
        try:
            database_url = os.getenv('DATABASE_URL')
            logger.info("=" * 80)
            logger.info("DATABASE CONNECTION ATTEMPT")
            logger.info("=" * 80)
            logger.info(f"Database URL present: {bool(database_url)}")
            
            if database_url:
                # Log the database URL (obscure password)
                obscured_url = self._obscure_password(database_url)
                logger.info(f"Database URL (obscured): {obscured_url}")
            else:
                logger.error("DATABASE_URL environment variable not set!")
                raise ValueError("DATABASE_URL not configured")
            
            self.conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
            self.conn.autocommit = False
            
            logger.info("✓ Database connection established successfully")
            logger.info("=" * 80)
            
            # Initialize schema
            self._init_schema()
            
        except Exception as e:
            logger.error("=" * 80)
            logger.error("DATABASE CONNECTION FAILED")
            logger.error("=" * 80)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            logger.error("=" * 80)
            raise
    
    def _obscure_password(self, url):
        """Obscure password in connection string for logging"""
        try:
            if '@' in url and ':' in url:
                parts = url.split('@')
                before_at = parts[0]
                after_at = '@'.join(parts[1:])
                
                if '://' in before_at:
                    protocol, credentials = before_at.split('://', 1)
                    if ':' in credentials:
                        username, _ = credentials.split(':', 1)
                        return f"{protocol}://{username}:****@{after_at}"
            return url
        except:
            return "****"
    
    def _init_schema(self):
        """Initialize database schema with logging"""
        logger.info("Initializing database schema...")
        
        try:
            cursor = self.conn.cursor()
            
            # Users table
            logger.info("Creating users table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    phone VARCHAR(50),
                    role VARCHAR(50) DEFAULT 'user',
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Add role and is_active columns if they don't exist (for existing tables)
            cursor.execute("""
                DO $$ BEGIN
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
                EXCEPTION WHEN others THEN NULL;
                END $$;
            """)
            
            # Buildings table
            logger.info("Creating buildings table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS buildings (
                    id SERIAL PRIMARY KEY,
                    address VARCHAR(500) NOT NULL,
                    entrance VARCHAR(10),
                    total_apartments INTEGER DEFAULT 0,
                    total_residents INTEGER DEFAULT 0
                )
            """)
            
            # Apartments table
            logger.info("Creating apartments table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS apartments (
                    id SERIAL PRIMARY KEY,
                    building_id INTEGER REFERENCES buildings(id),
                    number INTEGER NOT NULL,
                    floor INTEGER,
                    type VARCHAR(50),
                    residents INTEGER DEFAULT 0,
                    user_id INTEGER REFERENCES users(id)
                )
            """)
            
            # Events table
            logger.info("Creating events table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    building_id INTEGER REFERENCES buildings(id),
                    date DATE NOT NULL,
                    title VARCHAR(500),
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Financial records table
            logger.info("Creating financial_records table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS financial_records (
                    id SERIAL PRIMARY KEY,
                    apartment_id INTEGER REFERENCES apartments(id),
                    period VARCHAR(20),
                    elevator_gtp DECIMAL(10, 2) DEFAULT 0,
                    elevator_electricity DECIMAL(10, 2) DEFAULT 0,
                    common_area_electricity DECIMAL(10, 2) DEFAULT 0,
                    elevator_maintenance DECIMAL(10, 2) DEFAULT 0,
                    management_fee DECIMAL(10, 2) DEFAULT 0,
                    repair_fund DECIMAL(10, 2) DEFAULT 0,
                    total_due DECIMAL(10, 2) DEFAULT 0
                )
            """)
            
            # Contact requests table
            logger.info("Creating contact_requests table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS contact_requests (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255),
                    phone VARCHAR(50),
                    email VARCHAR(255),
                    message TEXT,
                    type VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # User profiles table
            logger.info("Creating user_profiles table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE REFERENCES users(id),
                    account_manager VARCHAR(255),
                    balance DECIMAL(10, 2) DEFAULT 0,
                    client_number VARCHAR(50),
                    contract_end_date DATE
                )
            """)
            
            # Payments table
            logger.info("Creating payments table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    apartment_id INTEGER REFERENCES apartments(id),
                    amount DECIMAL(10, 2) NOT NULL,
                    period VARCHAR(50) NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    paid_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Maintenance records table
            logger.info("Creating maintenance_records table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS maintenance_records (
                    id SERIAL PRIMARY KEY,
                    building_id INTEGER REFERENCES buildings(id),
                    date DATE NOT NULL,
                    description TEXT,
                    cost DECIMAL(10, 2) DEFAULT 0,
                    status VARCHAR(20) DEFAULT 'planned',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            self.conn.commit()
            logger.info("✓ Database schema initialized successfully")
            
            # Insert sample data if tables are empty
            self._insert_sample_data()
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Schema initialization failed: {e}")
            raise
    
    def _insert_sample_data(self):
        """Insert sample data for testing"""
        try:
            cursor = self.conn.cursor()
            
            # Check if we already have data
            cursor.execute("SELECT COUNT(*) as count FROM buildings")
            result = cursor.fetchone()
            
            if result['count'] == 0:
                logger.info("Inserting sample data...")
                import bcrypt
                
                # Insert sample building
                cursor.execute("""
                    INSERT INTO buildings (address, entrance, total_apartments, total_residents)
                    VALUES ('ж.к. Младост 3, бл. 325', 'Б', 24, 38)
                    RETURNING id
                """)
                building_id = cursor.fetchone()['id']
                
                # Insert sample test users with different roles
                users_data = [
                    ('ivan.ivanov@example.com', 'Иван Иванов', '+359 888 123 456', 'user', True),
                    ('m.georgieva@example.com', 'Мария Георгиева', '+359 888 234 567', 'user', True),
                    ('petar.petrov@example.com', 'Петър Петров', '+359 888 345 678', 'user', False),
                    ('admin@domunity.bg', 'Админ ДомУнити', '+359 888 000 000', 'admin', True),
                ]
                
                user_ids = []
                for email, name, phone, role, is_active in users_data:
                    password_hash = bcrypt.hashpw('test123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    cursor.execute("""
                        INSERT INTO users (email, password_hash, full_name, phone, role, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (email, password_hash, name, phone, role, is_active))
                    user_ids.append(cursor.fetchone()['id'])
                
                # Insert apartments and link to users
                apartments_data = [
                    (25, 5, 3, user_ids[0]),  # Иван Иванов
                    (26, 5, 2, user_ids[1]),  # Мария Георгиева
                    (27, 5, 4, user_ids[2]),  # Петър Петров
                    (22, 4, 2, None),
                    (23, 4, 3, None),
                    (24, 4, 2, None),
                ]
                
                apartment_ids = []
                for number, floor, residents, uid in apartments_data:
                    cursor.execute("""
                        INSERT INTO apartments (building_id, number, floor, type, residents, user_id)
                        VALUES (%s, %s, %s, 'Апартамент', %s, %s)
                        RETURNING id
                    """, (building_id, number, floor, residents, uid))
                    apartment_ids.append(cursor.fetchone()['id'])
                
                # Insert user profiles
                profiles_data = [
                    (user_ids[0], 'Мария Петрова', 0.00, '12356787'),
                    (user_ids[1], 'Мария Петрова', -10.00, '98765432'),
                    (user_ids[2], 'Мария Петрова', 0.00, '55555555'),
                ]
                for uid, manager, balance, client_num in profiles_data:
                    cursor.execute("""
                        INSERT INTO user_profiles (user_id, account_manager, balance, client_number, contract_end_date)
                        VALUES (%s, %s, %s, %s, '2026-12-31')
                    """, (uid, manager, balance, client_num))
                
                # Insert sample payments for multiple users
                payments_data = [
                    # User 1 (Ivan) - some paid, some pending
                    (user_ids[0], apartment_ids[0], 30.00, 'Ноември 2025', 'pending', None),
                    (user_ids[0], apartment_ids[0], 40.00, 'Октомври 2025', 'paid', '2025-10-15'),
                    (user_ids[0], apartment_ids[0], 30.00, 'Септември 2025', 'paid', '2025-09-12'),
                    # User 2 (Maria) - some pending
                    (user_ids[1], apartment_ids[1], 25.00, 'Ноември 2025', 'pending', None),
                    (user_ids[1], apartment_ids[1], 25.00, 'Октомври 2025', 'paid', '2025-10-20'),
                    # User 3 (Petar) - overdue
                    (user_ids[2], apartment_ids[2], 35.00, 'Ноември 2025', 'overdue', None),
                    (user_ids[2], apartment_ids[2], 35.00, 'Октомври 2025', 'overdue', None),
                ]
                for uid, apt_id, amount, period, status, paid_date in payments_data:
                    cursor.execute("""
                        INSERT INTO payments (user_id, apartment_id, amount, period, status, paid_date)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (uid, apt_id, amount, period, status, paid_date))
                
                # Insert sample events
                cursor.execute("""
                    INSERT INTO events (building_id, date, title, description)
                    VALUES 
                        (%s, '2025-11-05', 'Планирана профилактика', 'Планирана профилактика на асансьора от 10:00 до 13:00 ч.'),
                        (%s, '2025-11-02', 'Общо събрание', 'Общо събрание на вход Б – от 19:00 ч. във входното фоайе.'),
                        (%s, '2025-10-28', 'Напомняне за такса', 'Изпратено напомняне за месечна такса за поддръжка.')
                """, (building_id, building_id, building_id))
                
                # Insert sample maintenance records
                cursor.execute("""
                    INSERT INTO maintenance_records (building_id, date, description, cost, status)
                    VALUES 
                        (%s, '2025-02-05', 'Почистване и дезинфекция на входа', 20.00, 'completed'),
                        (%s, '2025-03-18', 'Профилактика на асансьора', 60.00, 'planned'),
                        (%s, '2025-01-15', 'Смяна на осветление в стълбището', 35.00, 'completed')
                """, (building_id, building_id, building_id))
                
                self.conn.commit()
                logger.info("✓ Sample data inserted successfully")
                
        except Exception as e:
            self.conn.rollback()
            logger.warning(f"Sample data insertion failed (this may be normal): {e}")
    
    def get_cursor(self):
        """Get database cursor"""
        return self.conn.cursor()
    
    def commit(self):
        """Commit transaction"""
        self.conn.commit()
    
    def rollback(self):
        """Rollback transaction"""
        self.conn.rollback()
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
