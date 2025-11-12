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
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
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
                
                # Insert sample building
                cursor.execute("""
                    INSERT INTO buildings (address, entrance, total_apartments, total_residents)
                    VALUES ('ж.к. Младост 3, бл. 325', 'Б', 24, 38)
                    RETURNING id
                """)
                building_id = cursor.fetchone()['id']
                
                # Insert sample apartments
                for i in range(1, 4):
                    cursor.execute("""
                        INSERT INTO apartments (building_id, number, floor, type, residents)
                        VALUES (%s, %s, %s, 'Апартамент', %s)
                        RETURNING id
                    """, (building_id, i, i, 2 + i))
                
                # Insert sample events
                cursor.execute("""
                    INSERT INTO events (building_id, date, title, description)
                    VALUES 
                        (%s, '2025-11-05', 'Планирана профилактика', 'Планирана профилактика на асансьора от 10:00 до 13:00 ч.'),
                        (%s, '2025-11-02', 'Общо събрание', 'Общо събрание на вход Б – от 19:00 ч. във входното фоайе.')
                """, (building_id, building_id))
                
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
