"""
Integration tests for DomUnity Python Backend with MongoDB
Tests the full service stack with real database connections
"""
import unittest
import os
import sys
import pymongo
from bson import ObjectId
import bcrypt
import jwt
from datetime import datetime, timedelta

# Set test environment variables
os.environ['MONGODB_URI'] = os.getenv('TEST_MONGODB_URI', 'mongodb://localhost:27017/domunity_test')
os.environ['JWT_SECRET'] = 'test-secret-key'

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from db import Database

class TestDatabaseIntegration(unittest.TestCase):
    """Integration tests for database operations"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test database connection"""
        cls.mongodb_uri = os.getenv('TEST_MONGODB_URI', 'mongodb://localhost:27017/domunity_test')
        cls.db_manager = Database()
        cls.client = cls.db_manager.client
        cls.db = cls.db_manager.db
        
        try:
            cls.client.admin.command('ping')
        except Exception:
            raise unittest.SkipTest("Test database (MongoDB) not available")
    
    @classmethod
    def tearDownClass(cls):
        """Close database connection"""
        if hasattr(cls, 'client'):
            cls.client.close()
    
    def setUp(self):
        """Clean collections and re-initialize before each test"""
        # Clear all collection data
        for collection in self.db.list_collection_names():
            if collection != 'system.indexes':
               self.db[collection].delete_many({})
        
        # Re-initialize indexes
        self.db_manager._initialize_indexes()
    
    def test_create_user(self):
        """Test creating a new user"""
        email = "test@example.com"
        password = "SecurePass123!"
        full_name = "Test User"
        phone = "+359888123456"
        
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        result = self.db.users.insert_one({
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "phone": phone,
            "created_at": datetime.utcnow()
        })
        
        user_id = result.inserted_id
        self.assertIsNotNone(user_id)
        
        # Verify user was created
        user = self.db.users.find_one({"_id": user_id})
        
        self.assertEqual(user['email'], email)
        self.assertEqual(user['full_name'], full_name)
        self.assertTrue(bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')))
    
    def test_create_building(self):
        """Test creating a building"""
        result = self.db.buildings.insert_one({
            "address": "123 Main St",
            "entrance": "A",
            "total_apartments": 10,
            "total_residents": 0
        })
        
        building_id = result.inserted_id
        self.assertIsNotNone(building_id)
        
        # Verify building
        building = self.db.buildings.find_one({"_id": building_id})
        
        self.assertEqual(building['address'], "123 Main St")
        self.assertEqual(building['entrance'], "A")
        self.assertEqual(building['total_apartments'], 10)
    
    def test_create_apartment_with_owner(self):
        """Test creating an apartment with an owner"""
        # Create user first
        password_hash = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode('utf-8')
        result_user = self.db.users.insert_one({
            "email": "owner@example.com",
            "password_hash": password_hash
        })
        user_id = result_user.inserted_id
        
        # Create building
        result_building = self.db.buildings.insert_one({
            "address": "456 Oak Ave"
        })
        building_id = result_building.inserted_id
        
        # Create apartment
        result_apt = self.db.apartments.insert_one({
            "building_id": building_id,
            "number": "101",
            "floor": 1,
            "user_id": user_id
        })
        apartment_id = result_apt.inserted_id
        
        # Verify apartment
        apartment = self.db.apartments.find_one({"_id": apartment_id})
        owner = self.db.users.find_one({"_id": apartment['user_id']})
        
        self.assertEqual(apartment['number'], "101")
        self.assertEqual(apartment['floor'], 1)
        self.assertEqual(owner['email'], "owner@example.com")
    
    def test_unique_constraint_apartment_number(self):
        """Test that apartment numbers must be unique per building index"""
        # Create building
        result_building = self.db.buildings.insert_one({
            "address": "789 Elm St"
        })
        building_id = result_building.inserted_id
        
        # Create first apartment
        self.db.apartments.insert_one({
            "building_id": building_id,
            "number": "201"
        })
        
        # Try to create duplicate apartment number in same building
        with self.assertRaises(pymongo.errors.DuplicateKeyError):
            self.db.apartments.insert_one({
                "building_id": building_id,
                "number": "201"
            })

if __name__ == '__main__':
    unittest.main()
