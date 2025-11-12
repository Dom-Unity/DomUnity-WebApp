const { Pool } = require('pg');

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        console.log('='.repeat(80));
        console.log('DATABASE CONNECTION ATTEMPT');
        console.log('='.repeat(80));

        const databaseURL = process.env.DATABASE_URL;
        console.log(`Database URL present: ${!!databaseURL}`);

        if (!databaseURL) {
            console.error('✗ DATABASE_URL environment variable not set!');
            throw new Error('DATABASE_URL not configured');
        }

        console.log(`Database URL (obscured): ${this.obscurePassword(databaseURL)}`);

        try {
            this.pool = new Pool({
                connectionString: databaseURL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });

            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();

            console.log('✓ Database connection established successfully');
            console.log('='.repeat(80));

            await this.initSchema();

        } catch (error) {
            console.error('='.repeat(80));
            console.error('DATABASE CONNECTION FAILED');
            console.error('='.repeat(80));
            console.error(`Error type: ${error.constructor.name}`);
            console.error(`Error message: ${error.message}`);
            console.error('='.repeat(80));
            throw error;
        }
    }

    obscurePassword(url) {
        try {
            if (url.includes('@') && url.includes(':')) {
                const parts = url.split('@');
                const beforeAt = parts[0];
                const afterAt = parts.slice(1).join('@');

                if (beforeAt.includes('://')) {
                    const [protocol, credentials] = beforeAt.split('://');
                    if (credentials.includes(':')) {
                        const [username] = credentials.split(':');
                        return `${protocol}://${username}:****@${afterAt}`;
                    }
                }
            }
            return url;
        } catch {
            return '****';
        }
    }

    async initSchema() {
        console.log('Initializing database schema...');

        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Users table
            console.log('Creating users table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    phone VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Buildings table
            console.log('Creating buildings table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS buildings (
                    id SERIAL PRIMARY KEY,
                    address VARCHAR(500) NOT NULL,
                    entrance VARCHAR(10),
                    total_apartments INTEGER DEFAULT 0,
                    total_residents INTEGER DEFAULT 0
                )
            `);

            // Apartments table
            console.log('Creating apartments table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS apartments (
                    id SERIAL PRIMARY KEY,
                    building_id INTEGER REFERENCES buildings(id),
                    number INTEGER NOT NULL,
                    floor INTEGER,
                    type VARCHAR(50),
                    residents INTEGER DEFAULT 0,
                    user_id INTEGER REFERENCES users(id)
                )
            `);

            // Events table
            console.log('Creating events table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    building_id INTEGER REFERENCES buildings(id),
                    date DATE NOT NULL,
                    title VARCHAR(500),
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Financial records table
            console.log('Creating financial_records table...');
            await client.query(`
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
            `);

            // Contact requests table
            console.log('Creating contact_requests table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS contact_requests (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255),
                    phone VARCHAR(50),
                    email VARCHAR(255),
                    message TEXT,
                    type VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // User profiles table
            console.log('Creating user_profiles table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE REFERENCES users(id),
                    account_manager VARCHAR(255),
                    balance DECIMAL(10, 2) DEFAULT 0,
                    client_number VARCHAR(50),
                    contract_end_date DATE
                )
            `);

            await client.query('COMMIT');
            console.log('✓ Database schema initialized successfully');

            // Insert sample data
            await this.insertSampleData();

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`✗ Schema initialization failed: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    async insertSampleData() {
        try {
            const client = await this.pool.connect();

            // Check if we already have data
            const result = await client.query('SELECT COUNT(*) as count FROM buildings');
            const count = parseInt(result.rows[0].count);

            if (count === 0) {
                console.log('Inserting sample data...');

                // Insert sample building
                const buildingResult = await client.query(`
                    INSERT INTO buildings (address, entrance, total_apartments, total_residents)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                `, ['ж.к. Младост 3, бл. 325', 'Б', 24, 38]);

                const buildingId = buildingResult.rows[0].id;

                // Insert sample apartments
                for (let i = 1; i <= 3; i++) {
                    await client.query(`
                        INSERT INTO apartments (building_id, number, floor, type, residents)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [buildingId, i, i, 'Апартамент', 2 + i]);
                }

                // Insert sample events
                await client.query(`
                    INSERT INTO events (building_id, date, title, description)
                    VALUES 
                        ($1, '2025-11-05', 'Планирана профилактика', 'Планирана профилактика на асансьора от 10:00 до 13:00 ч.'),
                        ($1, '2025-11-02', 'Общо събрание', 'Общо събрание на вход Б – от 19:00 ч. във входното фоайе.')
                `, [buildingId]);

                console.log('✓ Sample data inserted successfully');
            }

            client.release();

        } catch (error) {
            console.warn(`Sample data insertion warning: ${error.message}`);
        }
    }

    async query(text, params) {
        return this.pool.query(text, params);
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('Database connection closed');
        }
    }
}

module.exports = Database;
