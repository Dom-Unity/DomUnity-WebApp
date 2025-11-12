"""
Unit tests for DomUnity Python Backend
Tests individual functions and service methods in isolation
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os
import jwt
import bcrypt
from datetime import datetime, timedelta

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Mock the proto imports before importing server
sys.modules['domunity_pb2'] = MagicMock()
sys.modules['domunity_pb2_grpc'] = MagicMock()

from db import Database


class TestDatabaseConnection(unittest.TestCase):
    """Test database connection utilities"""
    
    def test_obscure_password(self):
        """Test password obscuring in connection strings"""
        db = Database.__new__(Database)
        
        # Test standard postgres URL
        url = "postgresql://user:secret123@localhost:5432/dbname"
        obscured = db._obscure_password(url)
        self.assertNotIn("secret123", obscured)
        self.assertIn("user", obscured)
        self.assertIn("****", obscured)
        
    def test_obscure_password_no_password(self):
        """Test obscuring when no password in URL"""
        db = Database.__new__(Database)
        url = "postgresql://localhost:5432/dbname"
        obscured = db._obscure_password(url)
        self.assertEqual(url, obscured)


class TestJWTFunctions(unittest.TestCase):
    """Test JWT token generation and validation"""
    
    def setUp(self):
        self.secret = "test-secret-key"
        self.algorithm = "HS256"
    
    def test_jwt_encode_decode(self):
        """Test JWT token creation and decoding"""
        payload = {
            'user_id': 1,
            'email': 'test@example.com',
            'exp': datetime.utcnow() + timedelta(hours=1)
        }
        
        token = jwt.encode(payload, self.secret, algorithm=self.algorithm)
        decoded = jwt.decode(token, self.secret, algorithms=[self.algorithm])
        
        self.assertEqual(decoded['user_id'], 1)
        self.assertEqual(decoded['email'], 'test@example.com')
    
    def test_jwt_expired_token(self):
        """Test expired JWT token raises error"""
        payload = {
            'user_id': 1,
            'exp': datetime.utcnow() - timedelta(hours=1)
        }
        
        token = jwt.encode(payload, self.secret, algorithm=self.algorithm)
        
        with self.assertRaises(jwt.ExpiredSignatureError):
            jwt.decode(token, self.secret, algorithms=[self.algorithm])
    
    def test_jwt_invalid_signature(self):
        """Test JWT with invalid signature raises error"""
        payload = {'user_id': 1}
        token = jwt.encode(payload, "wrong-secret", algorithm=self.algorithm)
        
        with self.assertRaises(jwt.InvalidSignatureError):
            jwt.decode(token, self.secret, algorithms=[self.algorithm])


class TestPasswordHashing(unittest.TestCase):
    """Test password hashing and verification"""
    
    def test_password_hash_verify(self):
        """Test password hashing and verification"""
        password = "SecurePassword123!"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Correct password should verify
        self.assertTrue(bcrypt.checkpw(password.encode('utf-8'), hashed))
        
        # Incorrect password should not verify
        self.assertFalse(bcrypt.checkpw(b"WrongPassword", hashed))
    
    def test_different_salts_different_hashes(self):
        """Test that same password with different salts produces different hashes"""
        password = "TestPassword123"
        hash1 = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        hash2 = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        self.assertNotEqual(hash1, hash2)
        # But both should verify
        self.assertTrue(bcrypt.checkpw(password.encode('utf-8'), hash1))
        self.assertTrue(bcrypt.checkpw(password.encode('utf-8'), hash2))


class TestInputValidation(unittest.TestCase):
    """Test input validation for various fields"""
    
    def test_email_format(self):
        """Test email format validation"""
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "first+last@test.org"
        ]
        
        invalid_emails = [
            "invalid.email",
            "@example.com",
            "test@",
            "test @example.com"
        ]
        
        for email in valid_emails:
            self.assertTrue(re.match(email_pattern, email), f"{email} should be valid")
        
        for email in invalid_emails:
            self.assertFalse(re.match(email_pattern, email), f"{email} should be invalid")
    
    def test_phone_validation(self):
        """Test phone number validation"""
        import re
        # Simple phone pattern (can be customized)
        phone_pattern = r'^\+?[1-9]\d{1,14}$'
        
        valid_phones = [
            "+359888123456",
            "1234567890",
            "+12025551234"
        ]
        
        for phone in valid_phones:
            self.assertTrue(re.match(phone_pattern, phone), f"{phone} should be valid")


if __name__ == '__main__':
    unittest.main()
