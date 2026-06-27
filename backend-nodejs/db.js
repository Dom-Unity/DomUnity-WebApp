const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        console.log('='.repeat(80));
        console.log('MONGODB CONNECTION ATTEMPT');
        console.log('='.repeat(80));

        let mongoUri = process.env.MONGODB_URI;
        // Fallback to DATABASE_URL if it carries a mongo scheme
        if (!mongoUri) {
            const fallback = process.env.DATABASE_URL;
            if (fallback && fallback.startsWith('mongodb')) {
                mongoUri = fallback;
            }
        }

        console.log(`MongoDB URI present: ${!!mongoUri}`);

        if (!mongoUri) {
            console.error('✗ MONGODB_URI environment variable not set!');
            throw new Error('MONGODB_URI not configured');
        }

        console.log(`MongoDB URI (obscured): ${this.obscurePassword(mongoUri)}`);

        try {
            this.client = new MongoClient(mongoUri);
            await this.client.connect();
            await this.client.db().admin().command({ ping: 1 });

            // Use the database from the connection string, defaulting to "domunity"
            const defaultDb = this.client.db();
            const dbName = defaultDb.databaseName && defaultDb.databaseName !== 'test'
                ? defaultDb.databaseName
                : 'domunity';
            this.db = this.client.db(dbName);

            console.log(`✓ Database connection established successfully to: ${dbName}`);
            console.log('='.repeat(80));

            await this.initSchema();

        } catch (error) {
            console.error('='.repeat(80));
            console.error('MONGODB CONNECTION FAILED');
            console.error('='.repeat(80));
            console.error(`Error type: ${error.constructor.name}`);
            console.error(`Error message: ${error.message}`);
            console.error('='.repeat(80));
            throw error;
        }
    }

    obscurePassword(uri) {
        try {
            if (uri.includes('@') && uri.includes(':')) {
                const parts = uri.split('@');
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
            return uri;
        } catch {
            return '****';
        }
    }

    async initSchema() {
        console.log('Initializing database indexes...');

        try {
            await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
            await this.db.collection('buildings').createIndex({ address: 1 });
            await this.db.collection('apartments').createIndex({ building_id: 1 });
            await this.db.collection('apartments').createIndex({ entrance_id: 1 });
            await this.db.collection('apartments').createIndex({ user_id: 1 });
            // Apartment numbers are unique within an entrance
            await this.db.collection('apartments').createIndex(
                { entrance_id: 1, number: 1 }, { unique: true }
            );
            // Entrances belong to a building
            await this.db.collection('entrances').createIndex({ building_id: 1 });
            await this.db.collection('events').createIndex({ building_id: 1, date: -1 });
            await this.db.collection('financial_records').createIndex({ apartment_id: 1, period: 1 });
            await this.db.collection('user_profiles').createIndex({ user_id: 1 }, { unique: true });
            await this.db.collection('payments').createIndex({ user_id: 1, created_at: -1 });
            await this.db.collection('payments').createIndex({ apartment_id: 1 });
            await this.db.collection('maintenance_records').createIndex({ building_id: 1, date: -1 });
            // Resident-submitted issues / maintenance reports
            await this.db.collection('issues').createIndex({ user_id: 1, created_at: -1 });
            await this.db.collection('issues').createIndex({ status: 1 });
            await this.db.collection('issues').createIndex({ building_id: 1, created_at: -1 });
            // Meetings (incl. online sessions)
            await this.db.collection('meetings').createIndex({ date: -1 });

            console.log('✓ Database indexes initialized successfully');

            await this.insertSampleData();

        } catch (error) {
            console.error(`✗ Index initialization failed: ${error.message}`);
            throw error;
        }
    }

    async insertSampleData() {
        try {
            const count = await this.db.collection('buildings').countDocuments({});
            if (count > 0) {
                return;
            }

            console.log('Inserting sample data into MongoDB...');

            const buildingResult = await this.db.collection('buildings').insertOne({
                address: 'ж.к. Младост 3, бл. 325',
                entrance: 'Б',
                total_apartments: 24,
                total_residents: 38,
                created_at: new Date()
            });
            const buildingId = buildingResult.insertedId;

            // Entrance "Б" of the sample building (2 floors x 3 apartments)
            const entranceResult = await this.db.collection('entrances').insertOne({
                building_id: buildingId,
                label: 'Б',
                floors_count: 2,
                apartments_per_floor: 3,
                created_at: new Date()
            });
            const entranceId = entranceResult.insertedId;

            // Sample users
            const usersData = [
                ['ivan.ivanov@example.com', 'Иван Иванов', '+359 888 123 456', 'user', true],
                ['m.georgieva@example.com', 'Мария Георгиева', '+359 888 234 567', 'user', true],
                ['petar.petrov@example.com', 'Петър Петров', '+359 888 345 678', 'user', false],
                ['admin@domunity.bg', 'Админ ДомУнити', '+359 888 000 000', 'admin', true]
            ];

            const userIds = [];
            for (const [email, name, phone, role, isActive] of usersData) {
                const passwordHash = await bcrypt.hash('test123', 10);
                const r = await this.db.collection('users').insertOne({
                    email,
                    password_hash: passwordHash,
                    full_name: name,
                    phone,
                    role,
                    is_active: isActive,
                    created_at: new Date()
                });
                userIds.push(r.insertedId);
            }

            // Apartments (sequential numbering 1..6 within the entrance; 3 per floor)
            const apartmentsData = [
                [1, 1, 3, userIds[0], 'Иван Иванов'],
                [2, 1, 2, userIds[1], 'Мария Георгиева'],
                [3, 1, 4, userIds[2], 'Петър Петров'],
                [4, 2, 2, null, ''],
                [5, 2, 3, null, ''],
                [6, 2, 2, null, '']
            ];

            const apartmentIds = [];
            for (const [number, floor, residents, uid, ownerName] of apartmentsData) {
                const r = await this.db.collection('apartments').insertOne({
                    building_id: buildingId,
                    entrance_id: entranceId,
                    number,
                    floor,
                    type: 'Апартамент',
                    residents,
                    owner_name: ownerName,
                    user_id: uid
                });
                apartmentIds.push(r.insertedId);
            }

            // User profiles
            const profilesData = [
                [userIds[0], 'Мария Петрова', 0.00, '12356787'],
                [userIds[1], 'Мария Петрова', -10.00, '98765432'],
                [userIds[2], 'Мария Петрова', 0.00, '55555555']
            ];
            for (const [uid, manager, balance, clientNum] of profilesData) {
                await this.db.collection('user_profiles').insertOne({
                    user_id: uid,
                    account_manager: manager,
                    balance,
                    client_number: clientNum,
                    contract_end_date: new Date(Date.UTC(2026, 11, 31))
                });
            }

            // Payments
            const paymentsData = [
                [userIds[0], apartmentIds[0], 30.00, 'Ноември 2025', 'pending', null],
                [userIds[0], apartmentIds[0], 40.00, 'Октомври 2025', 'paid', new Date(Date.UTC(2025, 9, 15))],
                [userIds[0], apartmentIds[0], 30.00, 'Септември 2025', 'paid', new Date(Date.UTC(2025, 8, 12))],
                [userIds[1], apartmentIds[1], 25.00, 'Ноември 2025', 'pending', null],
                [userIds[1], apartmentIds[1], 25.00, 'Октомври 2025', 'paid', new Date(Date.UTC(2025, 9, 20))],
                [userIds[2], apartmentIds[2], 35.00, 'Ноември 2025', 'overdue', null],
                [userIds[2], apartmentIds[2], 35.00, 'Октомври 2025', 'overdue', null]
            ];
            for (const [uid, aptId, amount, period, status, paidDate] of paymentsData) {
                await this.db.collection('payments').insertOne({
                    user_id: uid,
                    apartment_id: aptId,
                    amount,
                    period,
                    status,
                    paid_date: paidDate,
                    created_at: new Date()
                });
            }

            // Events
            await this.db.collection('events').insertMany([
                { building_id: buildingId, date: new Date(Date.UTC(2025, 10, 5)), title: 'Планирана профилактика', description: 'Планирана профилактика на асансьора от 10:00 до 13:00 ч.' },
                { building_id: buildingId, date: new Date(Date.UTC(2025, 10, 2)), title: 'Общо събрание', description: 'Общо събрание на вход Б – от 19:00 ч. във входното фоайе.' },
                { building_id: buildingId, date: new Date(Date.UTC(2025, 9, 28)), title: 'Напомняне за такса', description: 'Изпратено напомняне за месечна такса за поддръжка.' }
            ]);

            // Maintenance records
            await this.db.collection('maintenance_records').insertMany([
                { building_id: buildingId, date: new Date(Date.UTC(2025, 1, 5)), description: 'Почистване и дезинфекция на входа', cost: 20.00, status: 'completed' },
                { building_id: buildingId, date: new Date(Date.UTC(2025, 2, 18)), description: 'Профилактика на асансьора', cost: 60.00, status: 'planned' },
                { building_id: buildingId, date: new Date(Date.UTC(2025, 0, 15)), description: 'Смяна на осветление в стълбището', cost: 35.00, status: 'completed' }
            ]);

            // A sample upcoming online meeting (general assembly with a built-in room)
            await this.db.collection('meetings').insertOne({
                building_id: buildingId,
                entrance_id: entranceId,
                title: 'Общо събрание на вход Б',
                description: 'Редовно общо събрание. Който не може да присъства на място, може да се включи онлайн.',
                agenda: '1. Отчет за разходите\n2. Избор на фирма за ремонт\n3. Други',
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                location: 'Входно фоайе, вход Б',
                online_provider: 'jitsi',
                online_url: 'https://meet.jit.si/DomUnity-Mladost325-B',
                created_at: new Date()
            });

            // A sample resident-submitted issue (from Ivan)
            await this.db.collection('issues').insertOne({
                user_id: userIds[0],
                building_id: buildingId,
                entrance_id: entranceId,
                apartment_id: apartmentIds[0],
                title: 'Не работи осветлението на стълбището',
                description: 'Лампата между 1-ви и 2-ри етаж е изгоряла от няколко дни.',
                category: 'common_area',
                status: 'new',
                replies: [],
                created_at: new Date(),
                updated_at: new Date()
            });

            console.log('✓ Sample data inserted successfully into MongoDB');

        } catch (error) {
            console.warn(`Sample data insertion warning: ${error.message}`);
        }
    }

    collection(name) {
        return this.db.collection(name);
    }

    async close() {
        if (this.client) {
            await this.client.close();
            console.log('MongoDB connection closed');
        }
    }
}

module.exports = Database;
