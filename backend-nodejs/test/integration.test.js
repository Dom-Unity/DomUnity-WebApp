/**
 * Integration tests for DomUnity Node.js Backend
 * Tests database operations with real connections
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

// Test database connection
const DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/domunity_test';

let pool;

beforeAll(async () => {
    try {
        pool = new Pool({ connectionString: DATABASE_URL });
        await pool.query('SELECT 1'); // Test connection
    } catch (error) {
        console.log('Test database not available, skipping integration tests');
        pool = null;
    }
});

afterAll(async () => {
    if (pool) {
        await pool.end();
    }
});

beforeEach(async () => {
    if (!pool) return;

    // Drop and recreate tables
    await pool.query('DROP TABLE IF EXISTS announcements CASCADE');
    await pool.query('DROP TABLE IF EXISTS payments CASCADE');
    await pool.query('DROP TABLE IF EXISTS apartment_residents CASCADE');
    await pool.query('DROP TABLE IF EXISTS apartments CASCADE');
    await pool.query('DROP TABLE IF EXISTS buildings CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');

    // Create users table
    await pool.query(`
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            phone VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create buildings table
    await pool.query(`
        CREATE TABLE buildings (
            id SERIAL PRIMARY KEY,
            address VARCHAR(500) NOT NULL,
            entrance VARCHAR(10),
            total_apartments INTEGER DEFAULT 0,
            total_residents INTEGER DEFAULT 0
        )
    `);

    // Create apartments table
    await pool.query(`
        CREATE TABLE apartments (
            id SERIAL PRIMARY KEY,
            building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
            apartment_number VARCHAR(10) NOT NULL,
            floor INTEGER,
            owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(building_id, apartment_number)
        )
    `);
});

describe('Database Integration Tests', () => {
    it('should create a new user', async () => {
        if (!pool) {
            console.log('Skipping test - no database connection');
            return;
        }

        const email = 'test@example.com';
        const password = 'SecurePass123!';
        const fullName = 'Test User';
        const phone = '+359888123456';

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4) RETURNING id',
            [email, passwordHash, fullName, phone]
        );

        const userId = result.rows[0].id;
        expect(userId).toBeDefined();

        // Verify user was created
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        expect(user.email).toBe(email);
        expect(user.full_name).toBe(fullName);
        expect(user.phone).toBe(phone);

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        expect(passwordMatch).toBe(true);
    });

    it('should create a building', async () => {
        if (!pool) {
            console.log('Skipping test - no database connection');
            return;
        }

        const result = await pool.query(
            'INSERT INTO buildings (address, entrance, total_apartments) VALUES ($1, $2, $3) RETURNING id',
            ['123 Main St', 'A', 10]
        );

        const buildingId = result.rows[0].id;
        expect(buildingId).toBeDefined();

        // Verify building
        const buildingResult = await pool.query('SELECT * FROM buildings WHERE id = $1', [buildingId]);
        const building = buildingResult.rows[0];

        expect(building.address).toBe('123 Main St');
        expect(building.entrance).toBe('A');
        expect(building.total_apartments).toBe(10);
    });

    it('should create apartment with owner', async () => {
        if (!pool) {
            console.log('Skipping test - no database connection');
            return;
        }

        // Create user
        const passwordHash = await bcrypt.hash('password', 10);
        const userResult = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
            ['owner@example.com', passwordHash]
        );
        const userId = userResult.rows[0].id;

        // Create building
        const buildingResult = await pool.query(
            'INSERT INTO buildings (address) VALUES ($1) RETURNING id',
            ['456 Oak Ave']
        );
        const buildingId = buildingResult.rows[0].id;

        // Create apartment
        const apartmentResult = await pool.query(
            'INSERT INTO apartments (building_id, apartment_number, floor, owner_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [buildingId, '101', 1, userId]
        );
        const apartmentId = apartmentResult.rows[0].id;

        // Verify apartment
        const result = await pool.query(
            `SELECT a.*, u.email as owner_email 
             FROM apartments a 
             LEFT JOIN users u ON a.owner_id = u.id 
             WHERE a.id = $1`,
            [apartmentId]
        );
        const apartment = result.rows[0];

        expect(apartment.apartment_number).toBe('101');
        expect(apartment.floor).toBe(1);
        expect(apartment.owner_email).toBe('owner@example.com');
    });

    it('should enforce unique apartment number per building', async () => {
        if (!pool) {
            console.log('Skipping test - no database connection');
            return;
        }

        // Create building
        const buildingResult = await pool.query(
            'INSERT INTO buildings (address) VALUES ($1) RETURNING id',
            ['789 Elm St']
        );
        const buildingId = buildingResult.rows[0].id;

        // Create first apartment
        await pool.query(
            'INSERT INTO apartments (building_id, apartment_number) VALUES ($1, $2)',
            [buildingId, '201']
        );

        // Try to create duplicate
        await expect(
            pool.query(
                'INSERT INTO apartments (building_id, apartment_number) VALUES ($1, $2)',
                [buildingId, '201']
            )
        ).rejects.toThrow();
    });

    it('should cascade delete building to apartments', async () => {
        if (!pool) {
            console.log('Skipping test - no database connection');
            return;
        }

        // Create building
        const buildingResult = await pool.query(
            'INSERT INTO buildings (address) VALUES ($1) RETURNING id',
            ['111 Pine St']
        );
        const buildingId = buildingResult.rows[0].id;

        // Create apartments
        await pool.query(
            'INSERT INTO apartments (building_id, apartment_number) VALUES ($1, $2)',
            [buildingId, '101']
        );
        await pool.query(
            'INSERT INTO apartments (building_id, apartment_number) VALUES ($1, $2)',
            [buildingId, '102']
        );

        // Verify apartments exist
        const countBefore = await pool.query(
            'SELECT COUNT(*) as count FROM apartments WHERE building_id = $1',
            [buildingId]
        );
        expect(parseInt(countBefore.rows[0].count)).toBe(2);

        // Delete building
        await pool.query('DELETE FROM buildings WHERE id = $1', [buildingId]);

        // Verify apartments are deleted
        const countAfter = await pool.query(
            'SELECT COUNT(*) as count FROM apartments WHERE building_id = $1',
            [buildingId]
        );
        expect(parseInt(countAfter.rows[0].count)).toBe(0);
    });
});
