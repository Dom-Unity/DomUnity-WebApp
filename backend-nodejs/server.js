require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('./db');

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '24h';
const GRPC_PORT = process.env.PORT || '50051';
const HTTP_PORT = process.env.HTTP_PORT || '8080';
const VERSION = '1.0.0';

// Initialize database
const db = new Database();

// Load proto file
const PROTO_PATH = path.join(__dirname, '..', 'proto', 'domunity.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const domunity = protoDescriptor.domunity;

// Logging helpers
function logSection(title) {
    console.log('='.repeat(80));
    console.log(title);
    console.log('='.repeat(80));
}

function logSeparator() {
    console.log('='.repeat(80));
}

// ==================== Auth Service ====================

const authService = {
    async Login(call, callback) {
        logSection('LOGIN REQUEST');
        console.log(`Email: ${call.request.email}`);
        logSeparator();

        try {
            const result = await db.query(
                'SELECT * FROM users WHERE email = $1',
                [call.request.email]
            );

            if (result.rows.length === 0) {
                console.log(`✗ User not found: ${call.request.email}`);
                return callback(null, {
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = result.rows[0];

            // Verify password
            const passwordMatch = await bcrypt.compare(call.request.password, user.password_hash);

            if (!passwordMatch) {
                console.log(`✗ Invalid password for user: ${call.request.email}`);
                return callback(null, {
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate tokens
            const accessToken = jwt.sign(
                { user_id: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );

            const refreshToken = jwt.sign(
                { user_id: user.id },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            console.log(`✓ Login successful for user: ${user.email}`);

            callback(null, {
                success: true,
                message: 'Login successful',
                access_token: accessToken,
                refresh_token: refreshToken,
                user: {
                    id: user.id.toString(),
                    email: user.email,
                    full_name: user.full_name || '',
                    phone: user.phone || '',
                    created_at: user.created_at ? user.created_at.toISOString() : ''
                }
            });

        } catch (error) {
            console.error(`✗ Login error: ${error.message}`, error);
            callback(null, {
                success: false,
                message: `Login failed: ${error.message}`
            });
        }
    },

    async Register(call, callback) {
        logSection('REGISTER REQUEST');
        console.log(`Email: ${call.request.email}`);
        console.log(`Full name: ${call.request.full_name}`);
        logSeparator();

        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(call.request.password, 10);

            const result = await db.query(
                `INSERT INTO users (email, password_hash, full_name, phone)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [call.request.email, hashedPassword, call.request.full_name, call.request.phone]
            );

            const userId = result.rows[0].id;

            console.log(`✓ User registered successfully: ${call.request.email} (ID: ${userId})`);

            callback(null, {
                success: true,
                message: 'Registration successful',
                user_id: userId.toString()
            });

        } catch (error) {
            console.error(`✗ Registration error: ${error.message}`, error);
            callback(null, {
                success: false,
                message: `Registration failed: ${error.message}`
            });
        }
    },

    async RefreshToken(call, callback) {
        console.log('REFRESH TOKEN REQUEST');

        try {
            const decoded = jwt.verify(call.request.refresh_token, JWT_SECRET);

            const accessToken = jwt.sign(
                { user_id: decoded.user_id },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );

            console.log(`✓ Token refreshed for user_id: ${decoded.user_id}`);

            callback(null, {
                success: true,
                access_token: accessToken
            });

        } catch (error) {
            console.error(`✗ Token refresh error: ${error.message}`);
            callback(null, { success: false });
        }
    },

    async ForgotPassword(call, callback) {
        console.log(`FORGOT PASSWORD REQUEST for: ${call.request.email}`);

        callback(null, {
            success: true,
            message: 'Password reset instructions sent to your email'
        });
    }
};

// ==================== User Service ====================

const userService = {
    async GetProfile(call, callback) {
        console.log(`GET PROFILE REQUEST for user_id: ${call.request.user_id}`);

        try {
            // Get user
            const userResult = await db.query(
                'SELECT * FROM users WHERE id = $1',
                [parseInt(call.request.user_id)]
            );

            if (userResult.rows.length === 0) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'User not found'
                });
            }

            const user = userResult.rows[0];
            const profile = {
                user: {
                    id: user.id.toString(),
                    email: user.email,
                    full_name: user.full_name || '',
                    phone: user.phone || '',
                    created_at: user.created_at ? user.created_at.toISOString() : ''
                }
            };

            // Get apartment and building info
            const aptResult = await db.query(`
                SELECT a.*, b.*
                FROM apartments a
                JOIN buildings b ON a.building_id = b.id
                WHERE a.user_id = $1
            `, [parseInt(call.request.user_id)]);

            if (aptResult.rows.length > 0) {
                const apt = aptResult.rows[0];
                profile.building = {
                    id: apt.id.toString(),
                    address: apt.address,
                    entrance: apt.entrance || '',
                    total_apartments: apt.total_apartments,
                    total_residents: apt.total_residents
                };

                profile.apartment = {
                    id: apt.id.toString(),
                    building_id: apt.building_id.toString(),
                    number: apt.number,
                    floor: apt.floor || 0,
                    type: apt.type || '',
                    residents: apt.residents
                };
            }

            // Get user profile details
            const profResult = await db.query(
                'SELECT * FROM user_profiles WHERE user_id = $1',
                [parseInt(call.request.user_id)]
            );

            if (profResult.rows.length > 0) {
                const prof = profResult.rows[0];
                profile.account_manager = prof.account_manager || '';
                profile.balance = parseFloat(prof.balance) || 0.0;
                profile.client_number = prof.client_number || '';
                profile.contract_end_date = prof.contract_end_date ? prof.contract_end_date.toISOString().split('T')[0] : '';
            }

            console.log(`✓ Profile retrieved for user: ${user.email}`);
            callback(null, profile);

        } catch (error) {
            console.error(`✗ GetProfile error: ${error.message}`, error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message
            });
        }
    },

    async UpdateProfile(call, callback) {
        console.log(`UPDATE PROFILE REQUEST for user_id: ${call.request.user_id}`);

        try {
            await db.query(
                `UPDATE users SET full_name = $1, phone = $2 WHERE id = $3`,
                [call.request.full_name, call.request.phone, parseInt(call.request.user_id)]
            );

            console.log(`✓ Profile updated for user_id: ${call.request.user_id}`);

            callback(null, {
                success: true,
                message: 'Profile updated successfully'
            });

        } catch (error) {
            console.error(`✗ UpdateProfile error: ${error.message}`, error);
            callback(null, {
                success: false,
                message: error.message
            });
        }
    }
};

// ==================== Building Service ====================

const buildingService = {
    async GetBuilding(call, callback) {
        console.log(`GET BUILDING REQUEST for building_id: ${call.request.building_id}`);

        try {
            const result = await db.query(
                'SELECT * FROM buildings WHERE id = $1',
                [parseInt(call.request.building_id)]
            );

            if (result.rows.length === 0) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Building not found'
                });
            }

            const building = result.rows[0];
            callback(null, {
                id: building.id.toString(),
                address: building.address,
                entrance: building.entrance || '',
                total_apartments: building.total_apartments,
                total_residents: building.total_residents
            });

        } catch (error) {
            console.error(`✗ GetBuilding error: ${error.message}`, error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message
            });
        }
    },

    async ListApartments(call, callback) {
        console.log(`LIST APARTMENTS REQUEST for building_id: ${call.request.building_id}`);

        try {
            const result = await db.query(
                `SELECT * FROM apartments WHERE building_id = $1 ORDER BY number`,
                [parseInt(call.request.building_id)]
            );

            const apartments = result.rows.map(apt => ({
                id: apt.id.toString(),
                building_id: apt.building_id.toString(),
                number: apt.number,
                floor: apt.floor || 0,
                type: apt.type || '',
                residents: apt.residents
            }));

            console.log(`✓ Retrieved ${apartments.length} apartments`);
            callback(null, { apartments });

        } catch (error) {
            console.error(`✗ ListApartments error: ${error.message}`, error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message
            });
        }
    }
};

// ==================== Financial Service ====================

const financialService = {
    async GetFinancialReport(call, callback) {
        console.log(`GET FINANCIAL REPORT REQUEST for building_id: ${call.request.building_id}`);

        try {
            const result = await db.query(`
                SELECT a.number, a.floor, a.type, a.residents, u.full_name,
                       COALESCE(f.elevator_gtp, 0) as elevator_gtp,
                       COALESCE(f.elevator_electricity, 0) as elevator_electricity,
                       COALESCE(f.common_area_electricity, 0) as common_area_electricity,
                       COALESCE(f.elevator_maintenance, 0) as elevator_maintenance,
                       COALESCE(f.management_fee, 0) as management_fee,
                       COALESCE(f.repair_fund, 0) as repair_fund,
                       COALESCE(f.total_due, 0) as total_due
                FROM apartments a
                LEFT JOIN users u ON a.user_id = u.id
                LEFT JOIN financial_records f ON a.id = f.apartment_id
                WHERE a.building_id = $1
                ORDER BY a.number
            `, [parseInt(call.request.building_id)]);

            let totalBalance = 0;
            const entries = result.rows.map(row => {
                const totalDue = parseFloat(row.total_due) || 0;
                totalBalance += totalDue;

                return {
                    apartment_number: row.number,
                    type: row.type || 'Апартамент',
                    floor: row.floor || 0,
                    client_name: row.full_name || 'N/A',
                    residents: row.residents,
                    elevator_gtp: parseFloat(row.elevator_gtp),
                    elevator_electricity: parseFloat(row.elevator_electricity),
                    common_area_electricity: parseFloat(row.common_area_electricity),
                    elevator_maintenance: parseFloat(row.elevator_maintenance),
                    management_fee: parseFloat(row.management_fee),
                    repair_fund: parseFloat(row.repair_fund),
                    total_due: totalDue
                };
            });

            console.log(`✓ Retrieved financial report with ${entries.length} entries`);

            callback(null, {
                entries,
                total_balance: totalBalance
            });

        } catch (error) {
            console.error(`✗ GetFinancialReport error: ${error.message}`, error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message
            });
        }
    },

    async GetPaymentHistory(call, callback) {
        console.log(`GET PAYMENT HISTORY REQUEST for user_id: ${call.request.user_id}`);

        // Mock data for now
        callback(null, { payments: [] });
    }
};

// ==================== Event Service ====================

const eventService = {
    async ListEvents(call, callback) {
        console.log(`LIST EVENTS REQUEST for building_id: ${call.request.building_id}`);

        try {
            const limit = call.request.limit > 0 ? call.request.limit : 10;

            const result = await db.query(`
                SELECT * FROM events 
                WHERE building_id = $1
                ORDER BY date DESC
                LIMIT $2
            `, [parseInt(call.request.building_id), limit]);

            const events = result.rows.map(event => ({
                id: event.id.toString(),
                date: event.date ? event.date.toISOString().split('T')[0] : '',
                title: event.title || '',
                description: event.description || '',
                building_id: event.building_id.toString()
            }));

            console.log(`✓ Retrieved ${events.length} events`);
            callback(null, { events });

        } catch (error) {
            console.error(`✗ ListEvents error: ${error.message}`, error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message
            });
        }
    },

    async CreateEvent(call, callback) {
        console.log(`CREATE EVENT REQUEST for building_id: ${call.request.building_id}`);

        try {
            const result = await db.query(`
                INSERT INTO events (building_id, date, title, description)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [
                parseInt(call.request.building_id),
                call.request.date,
                call.request.title,
                call.request.description
            ]);

            const eventId = result.rows[0].id;

            console.log(`✓ Event created with ID: ${eventId}`);

            callback(null, {
                success: true,
                message: 'Event created successfully',
                event_id: eventId.toString()
            });

        } catch (error) {
            console.error(`✗ CreateEvent error: ${error.message}`, error);
            callback(null, {
                success: false,
                message: error.message
            });
        }
    }
};

// ==================== Contact Service ====================

const contactService = {
    async SendContactForm(call, callback) {
        console.log(`CONTACT FORM REQUEST from: ${call.request.email}`);

        try {
            await db.query(`
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES ($1, $2, $3, $4, 'contact')
            `, [call.request.name, call.request.phone, call.request.email, call.request.message]);

            console.log('✓ Contact form saved');

            callback(null, {
                success: true,
                message: 'Your message has been sent successfully'
            });

        } catch (error) {
            console.error(`✗ SendContactForm error: ${error.message}`, error);
            callback(null, {
                success: false,
                message: error.message
            });
        }
    },

    async RequestOffer(call, callback) {
        console.log(`OFFER REQUEST from: ${call.request.email}`);

        try {
            const message = `City: ${call.request.city}, Properties: ${call.request.num_properties}, Address: ${call.request.address}`;

            await db.query(`
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES ($1, $2, $3, $4, 'offer')
            `, ['', call.request.phone, call.request.email, message]);

            console.log('✓ Offer request saved');

            callback(null, {
                success: true,
                message: 'Your offer request has been received'
            });

        } catch (error) {
            console.error(`✗ RequestOffer error: ${error.message}`, error);
            callback(null, {
                success: false,
                message: error.message
            });
        }
    },

    async RequestPresentation(call, callback) {
        console.log(`PRESENTATION REQUEST from: ${call.request.email}`);

        try {
            const message = `Date: ${call.request.date}, Type: ${call.request.building_type}, Address: ${call.request.address}`;

            await db.query(`
                INSERT INTO contact_requests (name, phone, email, message, type)
                VALUES ($1, $2, $3, $4, 'presentation')
            `, ['', call.request.phone, call.request.email, message]);

            console.log('✓ Presentation request saved');

            callback(null, {
                success: true,
                message: 'Your presentation request has been received'
            });

        } catch (error) {
            console.error(`✗ RequestPresentation error: ${error.message}`, error);
            callback(null, {
                success: false,
                message: error.message
            });
        }
    }
};

// ==================== Health Service ====================

const healthService = {
    async Check(call, callback) {
        console.log('HEALTH CHECK REQUEST');

        let dbStatus = 'healthy';
        try {
            await db.query('SELECT 1');
        } catch {
            dbStatus = 'unhealthy';
        }

        callback(null, {
            healthy: true,
            version: VERSION,
            database_status: dbStatus
        });
    }
};

// ==================== HTTP Health Check Server ====================

function startHTTPHealthServer(port) {
    const server = http.createServer(async (req, res) => {
        if (req.url === '/health' && req.method === 'GET') {
            let dbStatus = 'connected';
            let statusCode = 200;

            try {
                // Test database connection
                await db.query('SELECT 1');
            } catch (error) {
                console.error('Health check database error:', error);
                dbStatus = `error: ${error.message}`;
                statusCode = 503;
            }

            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: statusCode === 200 ? 'healthy' : 'unhealthy',
                database: dbStatus,
                timestamp: new Date().toISOString(),
                service: 'domunity-backend-nodejs',
                version: VERSION
            }));

            console.log(`Health check: ${statusCode} - ${dbStatus}`);
        } else {
            // 404 for other paths
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`✓ HTTP health check server started on port ${port}`);
        console.log(`  Health endpoint: http://0.0.0.0:${port}/health`);
    });
}

// ==================== Server Startup ====================

async function startServer() {
    logSection('DOMUNITY gRPC SERVER (Node.js)');
    console.log(`Starting at ${new Date().toISOString()}`);
    console.log(`Node version: ${process.version}`);
    console.log();

    // Log environment configuration
    console.log('Environment Configuration:');
    console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'USING DEFAULT'}`);
    console.log(`  GRPC_PORT: ${GRPC_PORT}`);
    console.log(`  HTTP_PORT: ${HTTP_PORT}`);
    logSeparator();

    // Start HTTP health check server
    startHTTPHealthServer(HTTP_PORT);

    // Initialize database
    try {
        await db.connect();
        console.log('✓ Database initialized successfully');
    } catch (error) {
        console.error('✗ Database initialization failed:', error);
        process.exit(1);
    }

    // Create gRPC server
    const server = new grpc.Server();

    // Add services
    server.addService(domunity.AuthService.service, authService);
    server.addService(domunity.UserService.service, userService);
    server.addService(domunity.BuildingService.service, buildingService);
    server.addService(domunity.FinancialService.service, financialService);
    server.addService(domunity.EventService.service, eventService);
    server.addService(domunity.ContactService.service, contactService);
    server.addService(domunity.HealthService.service, healthService);

    // Start server
    server.bindAsync(
        `0.0.0.0:${GRPC_PORT}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
            if (error) {
                console.error('✗ Server failed to start:', error);
                process.exit(1);
            }

            server.start();

            logSection(`✓ SERVERS STARTED SUCCESSFULLY`);
            console.log(`\ngRPC Server: 0.0.0.0:${port}`);
            console.log(`HTTP Health Check: 0.0.0.0:${HTTP_PORT}/health`);
            console.log('\nRegistered gRPC Services:');
            console.log('  • domunity.AuthService');
            console.log('  • domunity.UserService');
            console.log('  • domunity.BuildingService');
            console.log('  • domunity.FinancialService');
            console.log('  • domunity.EventService');
            console.log('  • domunity.ContactService');
            console.log('  • domunity.HealthService');
            logSeparator();
        }
    );
}

// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
