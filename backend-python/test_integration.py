"""
Integration tests for DomUnity Python Backend
Tests the full service stack with real database connections
"""
import unittest
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
import jwt
from datetime import datetime, timedelta

# Set test environment variables
os.environ['DATABASE_URL'] = os.getenv('TEST_DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/domunity_test')
os.environ['JWT_SECRET'] = 'test-secret-key'

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(__file__))


class TestDatabaseIntegration(unittest.TestCase):
    """Integration tests for database operations"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test database connection"""
        cls.database_url = os.getenv('TEST_DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/domunity_test')
        try:
            cls.conn = psycopg2.connect(cls.database_url, cursor_factory=RealDictCursor)
            cls.conn.autocommit = True
        except psycopg2.OperationalError:
            raise unittest.SkipTest("Test database not available")
    
    @classmethod
    def tearDownClass(cls):
        """Close database connection"""
        if hasattr(cls, 'conn'):
            cls.conn.close()
    
    def setUp(self):
        """Create test tables and clean data before each test"""
        cursor = self.conn.cursor()
        
        # Drop existing tables
        cursor.execute("DROP TABLE IF EXISTS announcements CASCADE")
        cursor.execute("DROP TABLE IF EXISTS payments CASCADE")
        cursor.execute("DROP TABLE IF EXISTS apartment_residents CASCADE")
        cursor.execute("DROP TABLE IF EXISTS apartments CASCADE")
        cursor.execute("DROP TABLE IF EXISTS buildings CASCADE")
        cursor.execute("DROP TABLE IF EXISTS users CASCADE")
        
        # Create users table
        cursor.execute("""
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                phone VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create buildings table
        cursor.execute("""
            CREATE TABLE buildings (
                id SERIAL PRIMARY KEY,
                address VARCHAR(500) NOT NULL,
                entrance VARCHAR(10),
                total_apartments INTEGER DEFAULT 0,
                total_residents INTEGER DEFAULT 0
            )
        """)
        
        # Create apartments table
        cursor.execute("""
            CREATE TABLE apartments (
                id SERIAL PRIMARY KEY,
                building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
                apartment_number VARCHAR(10) NOT NULL,
                floor INTEGER,
                owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE(building_id, apartment_number)
            )
        """)
        
        # Create apartment_residents table
        cursor.execute("""
            CREATE TABLE apartment_residents (
                apartment_id INTEGER REFERENCES apartments(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                PRIMARY KEY (apartment_id, user_id)
            )
        """)
        
        # Create payments table
        cursor.execute("""
            CREATE TABLE payments (
                id SERIAL PRIMARY KEY,
                apartment_id INTEGER REFERENCES apartments(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                description TEXT,
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        
        # Create announcements table
        cursor.execute("""
            CREATE TABLE announcements (
                id SERIAL PRIMARY KEY,
                building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
    
    def test_create_user(self):
        """Test creating a new user"""
        cursor = self.conn.cursor()
        
        email = "test@example.com"
        password = "SecurePass123!"
        full_name = "Test User"
        phone = "+359888123456"
        
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute(
            """INSERT INTO users (email, password_hash, full_name, phone) 
               VALUES (%s, %s, %s, %s) RETURNING id""",
            (email, password_hash, full_name, phone)
        )
        
        user_id = cursor.fetchone()['id']
        self.assertIsNotNone(user_id)
        
        # Verify user was created
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        self.assertEqual(user['email'], email)
        self.assertEqual(user['full_name'], full_name)
        self.assertEqual(user['phone'], phone)
        self.assertTrue(bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')))
    
    def test_create_building(self):
        """Test creating a building"""
        cursor = self.conn.cursor()
        
        cursor.execute(
            """INSERT INTO buildings (address, entrance, total_apartments, total_residents) 
               VALUES (%s, %s, %s, %s) RETURNING id""",
            ("123 Main St", "A", 10, 0)
        )
        
        building_id = cursor.fetchone()['id']
        self.assertIsNotNone(building_id)
        
        # Verify building
        cursor.execute("SELECT * FROM buildings WHERE id = %s", (building_id,))
        building = cursor.fetchone()
        
        self.assertEqual(building['address'], "123 Main St")
        self.assertEqual(building['entrance'], "A")
        self.assertEqual(building['total_apartments'], 10)
    
    def test_create_apartment_with_owner(self):
        """Test creating an apartment with an owner"""
        cursor = self.conn.cursor()
        
        # Create user first
        password_hash = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode('utf-8')
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
            ("owner@example.com", password_hash)
        )
        user_id = cursor.fetchone()['id']
        
        # Create building
        cursor.execute(
            "INSERT INTO buildings (address) VALUES (%s) RETURNING id",
            ("456 Oak Ave",)
        )
        building_id = cursor.fetchone()['id']
        
        # Create apartment
        cursor.execute(
            """INSERT INTO apartments (building_id, apartment_number, floor, owner_id) 
               VALUES (%s, %s, %s, %s) RETURNING id""",
            (building_id, "101", 1, user_id)
        )
        apartment_id = cursor.fetchone()['id']
        
        # Verify apartment
        cursor.execute(
            """SELECT a.*, u.email as owner_email 
               FROM apartments a 
               LEFT JOIN users u ON a.owner_id = u.id 
               WHERE a.id = %s""",
            (apartment_id,)
        )
        apartment = cursor.fetchone()
        
        self.assertEqual(apartment['apartment_number'], "101")
        self.assertEqual(apartment['floor'], 1)
        self.assertEqual(apartment['owner_email'], "owner@example.com")
    
    def test_unique_constraint_apartment_number(self):
        """Test that apartment numbers must be unique per building"""
        cursor = self.conn.cursor()
        
        # Create building
        cursor.execute(
            "INSERT INTO buildings (address) VALUES (%s) RETURNING id",
            ("789 Elm St",)
        )
        building_id = cursor.fetchone()['id']
        
        # Create first apartment
        cursor.execute(
            "INSERT INTO apartments (building_id, apartment_number) VALUES (%s, %s)",
            (building_id, "201")
        )
        
        # Try to create duplicate apartment number in same building
        with self.assertRaises(psycopg2.IntegrityError):
            cursor.execute(
                "INSERT INTO apartments (building_id, apartment_number) VALUES (%s, %s)",
                (building_id, "201")
            )
        
        self.conn.rollback()
    
    def test_cascade_delete_building(self):
        """Test that deleting a building cascades to apartments"""
        cursor = self.conn.cursor()
        
        # Create building
        cursor.execute(
            "INSERT INTO buildings (address) VALUES (%s) RETURNING id",
            ("111 Pine St",)
        )
        building_id = cursor.fetchone()['id']
        
        # Create apartments
        cursor.execute(
            "INSERT INTO apartments (building_id, apartment_number) VALUES (%s, %s)",
            (building_id, "101")
        )
        cursor.execute(
            "INSERT INTO apartments (building_id, apartment_number) VALUES (%s, %s)",
            (building_id, "102")
        )
        
        # Verify apartments exist
        cursor.execute("SELECT COUNT(*) as count FROM apartments WHERE building_id = %s", (building_id,))
        count_before = cursor.fetchone()['count']
        self.assertEqual(count_before, 2)
        
        # Delete building
        cursor.execute("DELETE FROM buildings WHERE id = %s", (building_id,))
        
        # Verify apartments are deleted
        cursor.execute("SELECT COUNT(*) as count FROM apartments WHERE building_id = %s", (building_id,))
        count_after = cursor.fetchone()['count']
        self.assertEqual(count_after, 0)


if __name__ == '__main__':
    unittest.main()
