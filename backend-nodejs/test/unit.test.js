/**
 * Unit tests for DomUnity Node.js Backend
 * Tests individual functions and utilities in isolation
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { describe, it, expect, beforeEach } = require('@jest/globals');

describe('JWT Functions', () => {
    const secret = 'test-secret-key';

    it('should create and verify JWT token', () => {
        const payload = {
            user_id: 1,
            email: 'test@example.com'
        };

        const token = jwt.sign(payload, secret, { expiresIn: '1h' });
        const decoded = jwt.verify(token, secret);

        expect(decoded.user_id).toBe(1);
        expect(decoded.email).toBe('test@example.com');
    });

    it('should reject expired JWT token', () => {
        const payload = { user_id: 1 };
        const token = jwt.sign(payload, secret, { expiresIn: '-1h' });

        expect(() => {
            jwt.verify(token, secret);
        }).toThrow(jwt.TokenExpiredError);
    });

    it('should reject JWT with invalid signature', () => {
        const payload = { user_id: 1 };
        const token = jwt.sign(payload, 'wrong-secret');

        expect(() => {
            jwt.verify(token, secret);
        }).toThrow(jwt.JsonWebTokenError);
    });
});

describe('Password Hashing', () => {
    it('should hash and verify password correctly', async () => {
        const password = 'SecurePassword123!';
        const hashed = await bcrypt.hash(password, 10);

        const isValid = await bcrypt.compare(password, hashed);
        expect(isValid).toBe(true);

        const isInvalid = await bcrypt.compare('WrongPassword', hashed);
        expect(isInvalid).toBe(false);
    });

    it('should produce different hashes for same password', async () => {
        const password = 'TestPassword123';
        const hash1 = await bcrypt.hash(password, 10);
        const hash2 = await bcrypt.hash(password, 10);

        expect(hash1).not.toBe(hash2);

        // But both should verify
        expect(await bcrypt.compare(password, hash1)).toBe(true);
        expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
});

describe('Input Validation', () => {
    it('should validate email format', () => {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        const validEmails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'first+last@test.org'
        ];

        const invalidEmails = [
            'invalid.email',
            '@example.com',
            'test@',
            'test @example.com'
        ];

        validEmails.forEach(email => {
            expect(emailPattern.test(email)).toBe(true);
        });

        invalidEmails.forEach(email => {
            expect(emailPattern.test(email)).toBe(false);
        });
    });

    it('should validate phone number format', () => {
        const phonePattern = /^\+?[1-9]\d{1,14}$/;

        const validPhones = [
            '+359888123456',
            '1234567890',
            '+12025551234'
        ];

        validPhones.forEach(phone => {
            expect(phonePattern.test(phone)).toBe(true);
        });
    });
});
