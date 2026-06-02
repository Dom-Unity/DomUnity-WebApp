/**
 * Integration tests for DomUnity Node.js Backend (MongoDB)
 * Tests database operations with real connections.
 * Skips gracefully when no MongoDB instance is available.
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

const MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/domunity_test';

let client = null;
let db = null;

beforeAll(async () => {
    try {
        client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
        await client.connect();
        await client.db().admin().command({ ping: 1 });
        db = client.db();
        // Apartment numbers are unique within an entrance
        await db.collection('apartments').createIndex({ entrance_id: 1, number: 1 }, { unique: true });
    } catch (error) {
        console.log('Test database (MongoDB) not available, skipping integration tests');
        if (client) {
            await client.close().catch(() => {});
        }
        client = null;
        db = null;
    }
});

afterAll(async () => {
    if (client) {
        await client.close();
    }
});

beforeEach(async () => {
    if (!db) return;
    const collections = await db.listCollections().toArray();
    for (const c of collections) {
        await db.collection(c.name).deleteMany({});
    }
});

describe('Database Integration Tests', () => {
    it('should create a new user', async () => {
        if (!db) {
            console.log('Skipping test - no database connection');
            return;
        }

        const email = 'test@example.com';
        const password = 'SecurePass123!';
        const fullName = 'Test User';
        const phone = '+359888123456';

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await db.collection('users').insertOne({
            email, password_hash: passwordHash, full_name: fullName, phone,
            created_at: new Date()
        });

        expect(result.insertedId).toBeDefined();

        const user = await db.collection('users').findOne({ _id: result.insertedId });
        expect(user.email).toBe(email);
        expect(user.full_name).toBe(fullName);
        expect(user.phone).toBe(phone);
        expect(await bcrypt.compare(password, user.password_hash)).toBe(true);
    });

    it('should create a building', async () => {
        if (!db) {
            console.log('Skipping test - no database connection');
            return;
        }

        const result = await db.collection('buildings').insertOne({
            address: '123 Main St', entrance: 'A', total_apartments: 10, total_residents: 0
        });
        expect(result.insertedId).toBeDefined();

        const building = await db.collection('buildings').findOne({ _id: result.insertedId });
        expect(building.address).toBe('123 Main St');
        expect(building.entrance).toBe('A');
        expect(building.total_apartments).toBe(10);
    });

    it('should create apartment with owner', async () => {
        if (!db) {
            console.log('Skipping test - no database connection');
            return;
        }

        const passwordHash = await bcrypt.hash('password', 10);
        const userResult = await db.collection('users').insertOne({
            email: 'owner@example.com', password_hash: passwordHash
        });

        const buildingResult = await db.collection('buildings').insertOne({ address: '456 Oak Ave' });

        const aptResult = await db.collection('apartments').insertOne({
            building_id: buildingResult.insertedId,
            number: 101,
            floor: 1,
            user_id: userResult.insertedId
        });

        const apartment = await db.collection('apartments').findOne({ _id: aptResult.insertedId });
        const owner = await db.collection('users').findOne({ _id: apartment.user_id });

        expect(apartment.number).toBe(101);
        expect(apartment.floor).toBe(1);
        expect(owner.email).toBe('owner@example.com');
    });

    it('should enforce unique apartment number per entrance', async () => {
        if (!db) {
            console.log('Skipping test - no database connection');
            return;
        }

        const buildingResult = await db.collection('buildings').insertOne({ address: '789 Elm St' });
        const buildingId = buildingResult.insertedId;
        const entranceResult = await db.collection('entrances').insertOne({ building_id: buildingId, label: 'A' });
        const entranceId = entranceResult.insertedId;

        await db.collection('apartments').insertOne({ building_id: buildingId, entrance_id: entranceId, number: 201 });

        await expect(
            db.collection('apartments').insertOne({ building_id: buildingId, entrance_id: entranceId, number: 201 })
        ).rejects.toThrow();
    });
});
