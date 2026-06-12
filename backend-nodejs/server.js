require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const Database = require('./db');

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '24h';
const GRPC_PORT = process.env.GRPC_PORT || '50051';
const HTTP_PORT = process.env.HTTP_PORT || process.env.PORT || '8080';
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

// Collection helpers
const col = (name) => db.db.collection(name);
const toObjectId = (id) => new ObjectId(id);

// ==================== Auth Service (gRPC) ====================

const authService = {
    async Login(call, callback) {
        logSection('LOGIN REQUEST');
        console.log(`Email: ${call.request.email}`);
        logSeparator();

        try {
            const user = await col('users').findOne({ email: call.request.email });

            if (!user) {
                console.log(`✗ User not found: ${call.request.email}`);
                return callback(null, { success: false, message: 'Invalid email or password' });
            }

            const passwordMatch = await bcrypt.compare(call.request.password, user.password_hash);
            if (!passwordMatch) {
                console.log(`✗ Invalid password for user: ${call.request.email}`);
                return callback(null, { success: false, message: 'Invalid email or password' });
            }

            const accessToken = jwt.sign(
                { user_id: user._id.toString(), email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );
            const refreshToken = jwt.sign(
                { user_id: user._id.toString() },
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
                    id: user._id.toString(),
                    email: user.email,
                    full_name: user.full_name || '',
                    phone: user.phone || '',
                    created_at: user.created_at ? user.created_at.toISOString() : ''
                }
            });
        } catch (error) {
            console.error(`✗ Login error: ${error.message}`, error);
            callback(null, { success: false, message: `Login failed: ${error.message}` });
        }
    },

    async Register(call, callback) {
        logSection('REGISTER REQUEST');
        console.log(`Email: ${call.request.email}`);
        logSeparator();

        try {
            const hashedPassword = await bcrypt.hash(call.request.password, 10);
            const result = await col('users').insertOne({
                email: call.request.email,
                password_hash: hashedPassword,
                full_name: call.request.full_name,
                phone: call.request.phone,
                role: 'user',
                is_active: true,
                created_at: new Date()
            });

            console.log(`✓ User registered successfully: ${call.request.email} (ID: ${result.insertedId})`);
            callback(null, {
                success: true,
                message: 'Registration successful',
                user_id: result.insertedId.toString()
            });
        } catch (error) {
            console.error(`✗ Registration error: ${error.message}`, error);
            callback(null, { success: false, message: `Registration failed: ${error.message}` });
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
            callback(null, { success: true, access_token: accessToken });
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

// ==================== User Service (gRPC) ====================

const userService = {
    async GetProfile(call, callback) {
        console.log(`GET PROFILE REQUEST for user_id: ${call.request.user_id}`);
        try {
            const user = await col('users').findOne({ _id: toObjectId(call.request.user_id) });
            if (!user) {
                return callback({ code: grpc.status.NOT_FOUND, message: 'User not found' });
            }

            const profile = {
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    full_name: user.full_name || '',
                    phone: user.phone || '',
                    created_at: user.created_at ? user.created_at.toISOString() : ''
                }
            };

            const apartment = await col('apartments').findOne({ user_id: user._id });
            if (apartment) {
                const building = await col('buildings').findOne({ _id: apartment.building_id });
                if (building) {
                    profile.building = {
                        id: building._id.toString(),
                        address: building.address,
                        entrance: building.entrance || '',
                        total_apartments: building.total_apartments,
                        total_residents: building.total_residents
                    };
                }
                profile.apartment = {
                    id: apartment._id.toString(),
                    building_id: apartment.building_id.toString(),
                    number: apartment.number,
                    floor: apartment.floor || 0,
                    type: apartment.type || '',
                    residents: apartment.residents
                };
            }

            const prof = await col('user_profiles').findOne({ user_id: user._id });
            if (prof) {
                profile.account_manager = prof.account_manager || '';
                profile.balance = parseFloat(prof.balance) || 0.0;
                profile.client_number = prof.client_number || '';
                profile.contract_end_date = prof.contract_end_date
                    ? prof.contract_end_date.toISOString().split('T')[0]
                    : '';
            }

            console.log(`✓ Profile retrieved for user: ${user.email}`);
            callback(null, profile);
        } catch (error) {
            console.error(`✗ GetProfile error: ${error.message}`, error);
            callback({ code: grpc.status.INTERNAL, message: error.message });
        }
    },

    async UpdateProfile(call, callback) {
        console.log(`UPDATE PROFILE REQUEST for user_id: ${call.request.user_id}`);
        try {
            await col('users').updateOne(
                { _id: toObjectId(call.request.user_id) },
                { $set: { full_name: call.request.full_name, phone: call.request.phone } }
            );
            callback(null, { success: true, message: 'Profile updated successfully' });
        } catch (error) {
            console.error(`✗ UpdateProfile error: ${error.message}`, error);
            callback(null, { success: false, message: error.message });
        }
    }
};

// ==================== Building Service (gRPC) ====================

const buildingService = {
    async GetBuilding(call, callback) {
        console.log(`GET BUILDING REQUEST for building_id: ${call.request.building_id}`);
        try {
            const building = await col('buildings').findOne({ _id: toObjectId(call.request.building_id) });
            if (!building) {
                return callback({ code: grpc.status.NOT_FOUND, message: 'Building not found' });
            }
            callback(null, {
                id: building._id.toString(),
                address: building.address,
                entrance: building.entrance || '',
                total_apartments: building.total_apartments,
                total_residents: building.total_residents
            });
        } catch (error) {
            console.error(`✗ GetBuilding error: ${error.message}`, error);
            callback({ code: grpc.status.INTERNAL, message: error.message });
        }
    },

    async ListApartments(call, callback) {
        console.log(`LIST APARTMENTS REQUEST for building_id: ${call.request.building_id}`);
        try {
            const apts = await col('apartments')
                .find({ building_id: toObjectId(call.request.building_id) })
                .sort({ number: 1 })
                .toArray();

            const apartments = apts.map(apt => ({
                id: apt._id.toString(),
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
            callback({ code: grpc.status.INTERNAL, message: error.message });
        }
    }
};

// ==================== Financial Service (gRPC) ====================

const financialService = {
    async GetFinancialReport(call, callback) {
        console.log(`GET FINANCIAL REPORT REQUEST for building_id: ${call.request.building_id}`);
        try {
            const rows = await col('apartments').aggregate([
                { $match: { building_id: toObjectId(call.request.building_id) } },
                { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user_data' } },
                { $unwind: { path: '$user_data', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'financial_records', localField: '_id', foreignField: 'apartment_id', as: 'financial_data' } },
                { $unwind: { path: '$financial_data', preserveNullAndEmptyArrays: true } },
                { $sort: { number: 1 } }
            ]).toArray();

            let totalBalance = 0;
            const entries = rows.map(row => {
                const fin = row.financial_data || {};
                const totalDue = parseFloat(fin.total_due || 0) || 0;
                totalBalance += totalDue;
                return {
                    apartment_number: row.number,
                    type: row.type || 'Апартамент',
                    floor: row.floor || 0,
                    client_name: (row.user_data && row.user_data.full_name) || 'N/A',
                    residents: row.residents,
                    elevator_gtp: parseFloat(fin.elevator_gtp || 0) || 0,
                    elevator_electricity: parseFloat(fin.elevator_electricity || 0) || 0,
                    common_area_electricity: parseFloat(fin.common_area_electricity || 0) || 0,
                    elevator_maintenance: parseFloat(fin.elevator_maintenance || 0) || 0,
                    management_fee: parseFloat(fin.management_fee || 0) || 0,
                    repair_fund: parseFloat(fin.repair_fund || 0) || 0,
                    total_due: totalDue
                };
            });

            console.log(`✓ Retrieved financial report with ${entries.length} entries`);
            callback(null, { entries, total_balance: totalBalance });
        } catch (error) {
            console.error(`✗ GetFinancialReport error: ${error.message}`, error);
            callback({ code: grpc.status.INTERNAL, message: error.message });
        }
    },

    async GetPaymentHistory(call, callback) {
        console.log(`GET PAYMENT HISTORY REQUEST for user_id: ${call.request.user_id}`);
        callback(null, { payments: [] });
    }
};

// ==================== Event Service (gRPC) ====================

const eventService = {
    async ListEvents(call, callback) {
        console.log(`LIST EVENTS REQUEST for building_id: ${call.request.building_id}`);
        try {
            const limit = call.request.limit > 0 ? call.request.limit : 10;
            const docs = await col('events')
                .find({ building_id: toObjectId(call.request.building_id) })
                .sort({ date: -1 })
                .limit(limit)
                .toArray();

            const events = docs.map(event => ({
                id: event._id.toString(),
                date: event.date ? event.date.toISOString().split('T')[0] : '',
                title: event.title || '',
                description: event.description || '',
                building_id: event.building_id.toString()
            }));

            console.log(`✓ Retrieved ${events.length} events`);
            callback(null, { events });
        } catch (error) {
            console.error(`✗ ListEvents error: ${error.message}`, error);
            callback({ code: grpc.status.INTERNAL, message: error.message });
        }
    },

    async CreateEvent(call, callback) {
        console.log(`CREATE EVENT REQUEST for building_id: ${call.request.building_id}`);
        try {
            const date = call.request.date && call.request.date.includes('-')
                ? new Date(call.request.date)
                : new Date();
            const result = await col('events').insertOne({
                building_id: toObjectId(call.request.building_id),
                date,
                title: call.request.title,
                description: call.request.description,
                created_at: new Date()
            });
            console.log(`✓ Event created with ID: ${result.insertedId}`);
            callback(null, {
                success: true,
                message: 'Event created successfully',
                event_id: result.insertedId.toString()
            });
        } catch (error) {
            console.error(`✗ CreateEvent error: ${error.message}`, error);
            callback(null, { success: false, message: error.message });
        }
    }
};

// ==================== Contact Service (gRPC) ====================

const contactService = {
    async SendContactForm(call, callback) {
        console.log(`CONTACT FORM REQUEST from: ${call.request.email}`);
        try {
            await col('contact_requests').insertOne({
                name: call.request.name,
                phone: call.request.phone,
                email: call.request.email,
                message: call.request.message,
                type: 'contact',
                created_at: new Date()
            });
            callback(null, { success: true, message: 'Your message has been sent successfully' });
        } catch (error) {
            console.error(`✗ SendContactForm error: ${error.message}`, error);
            callback(null, { success: false, message: error.message });
        }
    },

    async RequestOffer(call, callback) {
        console.log(`OFFER REQUEST from: ${call.request.email}`);
        try {
            await col('contact_requests').insertOne({
                name: '',
                phone: call.request.phone,
                email: call.request.email,
                message: `City: ${call.request.city}, Properties: ${call.request.num_properties}, Address: ${call.request.address}`,
                type: 'offer',
                created_at: new Date()
            });
            callback(null, { success: true, message: 'Your offer request has been received' });
        } catch (error) {
            console.error(`✗ RequestOffer error: ${error.message}`, error);
            callback(null, { success: false, message: error.message });
        }
    },

    async RequestPresentation(call, callback) {
        console.log(`PRESENTATION REQUEST from: ${call.request.email}`);
        try {
            await col('contact_requests').insertOne({
                name: '',
                phone: call.request.phone,
                email: call.request.email,
                message: `Date: ${call.request.date}, Type: ${call.request.building_type}, Address: ${call.request.address}`,
                type: 'presentation',
                created_at: new Date()
            });
            callback(null, { success: true, message: 'Your presentation request has been received' });
        } catch (error) {
            console.error(`✗ RequestPresentation error: ${error.message}`, error);
            callback(null, { success: false, message: error.message });
        }
    }
};

// ==================== Health Service (gRPC) ====================

const healthService = {
    async Check(call, callback) {
        console.log('HEALTH CHECK REQUEST');
        let dbStatus = 'healthy';
        try {
            await db.client.db().admin().command({ ping: 1 });
        } catch {
            dbStatus = 'unhealthy';
        }
        callback(null, { healthy: true, version: VERSION, database_status: dbStatus });
    }
};

// ==================== HTTP REST API Server ====================

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '3600'
};

// Generate a secure, shareable temporary password for admin-created logins.
function generateTempPassword() {
    return crypto.randomBytes(9).toString('base64url'); // ~12 url-safe chars
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify(data));
}

function readJsonBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                resolve({});
            }
        });
    });
}

function getUserIdFromToken(req) {
    const auth = req.headers['authorization'] || '';
    if (auth.startsWith('Bearer ')) {
        try {
            const payload = jwt.verify(auth.slice(7), JWT_SECRET);
            return payload.user_id;
        } catch (e) {
            console.warn(`Token decode failed: ${e.message}`);
        }
    }
    return null;
}

async function resolveBuildingId(raw, userId) {
    if (raw) {
        try {
            return toObjectId(raw);
        } catch {
            console.log(`Building id '${raw}' is not a valid ObjectId; using user's building`);
        }
    }
    const apt = await col('apartments').findOne({ user_id: toObjectId(userId) });
    return apt ? apt.building_id : null;
}

// Returns the requesting admin user, or null after sending 401/403.
async function requireAdmin(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return null;
    }
    let requester = null;
    try {
        requester = await col('users').findOne({ _id: toObjectId(userId) });
    } catch {
        requester = null;
    }
    if (!requester || requester.role !== 'admin') {
        sendJson(res, 403, { error: 'Forbidden' });
        return null;
    }
    return requester;
}

// Returns the requesting staff user (admin OR manager), or null after sending 401/403.
async function requireStaff(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return null;
    }
    let requester = null;
    try {
        requester = await col('users').findOne({ _id: toObjectId(userId) });
    } catch {
        requester = null;
    }
    if (!requester || (requester.role !== 'admin' && requester.role !== 'manager')) {
        sendJson(res, 403, { error: 'Forbidden' });
        return null;
    }
    return requester;
}

const ISSUE_STATUSES = ['new', 'under_review', 'in_progress', 'completed'];

// Shape an issue document for API responses.
function issueView(issue, resident, location) {
    return {
        id: issue._id.toString(),
        title: issue.title || '',
        description: issue.description || '',
        category: issue.category || 'other',
        status: issue.status || 'new',
        replies: (issue.replies || []).map(r => ({
            author_name: r.author_name || '',
            author_role: r.author_role || 'user',
            message: r.message || '',
            created_at: r.created_at ? new Date(r.created_at).toISOString() : ''
        })),
        created_at: issue.created_at ? new Date(issue.created_at).toISOString() : '',
        updated_at: issue.updated_at ? new Date(issue.updated_at).toISOString() : '',
        ...(resident ? { resident_name: resident.full_name || resident.email || '', resident_email: resident.email || '' } : {}),
        ...(location ? { building: location.building || '', entrance: location.entrance || '', apartment: location.apartment || '' } : {})
    };
}

// Compute outstanding amount + status for an apartment from its payments.
function apartmentPaymentSummary(payments) {
    const amountDue = (payments || [])
        .filter(p => p.status === 'pending' || p.status === 'overdue')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    let status = 'paid';
    if ((payments || []).some(p => p.status === 'overdue')) status = 'overdue';
    else if ((payments || []).some(p => p.status === 'pending')) status = 'pending';
    return { amountDue, status };
}

// Build the entrance view (with nested floors/apartments) the admin UI expects.
async function buildEntranceView(entrance) {
    const building = await col('buildings').findOne({ _id: entrance.building_id });
    const perFloor = entrance.apartments_per_floor || 1;

    const apts = await col('apartments').aggregate([
        { $match: { entrance_id: entrance._id } },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'user_profiles', localField: 'user_id', foreignField: 'user_id', as: 'profile' } },
        { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'payments', localField: '_id', foreignField: 'apartment_id', as: 'payments' } },
        { $sort: { number: 1 } }
    ]).toArray();

    const floorsMap = new Map();
    for (const apt of apts) {
        const { amountDue, status } = apartmentPaymentSummary(apt.payments);
        const family = (apt.user && apt.user.full_name) || apt.owner_name || 'Неизвестни';
        const floor = apt.floor || 1;
        if (!floorsMap.has(floor)) floorsMap.set(floor, []);
        floorsMap.get(floor).push({
            id: apt._id.toString(),
            number: apt.number,
            family,
            amount: parseFloat(amountDue),
            status,
            residents: apt.residents || 0,
            email: (apt.user && apt.user.email) || '',
            clientNumber: (apt.profile && apt.profile.client_number) || ''
        });
    }

    const floors = [...floorsMap.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([floor, apartments]) => ({ floor, apartments }));

    const apartmentLayout = Array.from({ length: perFloor }, (_, i) => String(i + 1)).join(',');

    return {
        id: entrance._id.toString(),
        building: building ? building.address : '',
        address: building ? building.address : '',
        entrance: entrance.label || '',
        floorsCount: entrance.floors_count || floors.length || 1,
        apartmentsPerFloor: perFloor,
        apartmentLayout,
        floors
    };
}

// Find-or-create a building by address; returns its _id.
async function upsertBuildingByAddress(address, entranceLabel) {
    const existing = await col('buildings').findOne({ address });
    if (existing) return existing._id;
    const r = await col('buildings').insertOne({
        address,
        entrance: entranceLabel || '',
        total_apartments: 0,
        total_residents: 0,
        created_at: new Date()
    });
    return r.insertedId;
}

// Resolve an apartment from building address + entrance label + apartment number.
async function resolveApartment(buildingAddress, entranceLabel, apartmentNumber) {
    const building = await col('buildings').findOne({ address: buildingAddress });
    if (!building) return null;
    const entrance = await col('entrances').findOne({ building_id: building._id, label: entranceLabel });
    if (!entrance) return null;
    const number = Number(apartmentNumber);
    return col('apartments').findOne({ entrance_id: entrance._id, number });
}

// --- REST handlers ---

async function handleHealth(res) {
    let dbStatus = 'connected';
    let statusCode = 200;
    try {
        await db.client.db().admin().command({ ping: 1 });
    } catch (error) {
        dbStatus = `error: ${error.message}`;
        statusCode = 503;
    }
    sendJson(res, statusCode, {
        status: statusCode === 200 ? 'healthy' : 'unhealthy',
        database: dbStatus,
        timestamp: new Date().toISOString(),
        service: 'domunity-backend-nodejs',
        version: VERSION
    });
}

async function handleLogin(req, res) {
    const data = await readJsonBody(req);
    console.log(`API: Login request for ${data.email}`);
    try {
        const user = await col('users').findOne({ email: data.email });
        if (!user || !(await bcrypt.compare(data.password || '', user.password_hash))) {
            return sendJson(res, 401, { success: false, message: 'Invalid email or password' });
        }
        if (user.is_active === false) {
            return sendJson(res, 403, { success: false, message: 'This account has been deactivated' });
        }
        const accessToken = jwt.sign(
            { user_id: user._id.toString(), email: user.email },
            JWT_SECRET, { expiresIn: JWT_EXPIRATION }
        );
        const refreshToken = jwt.sign(
            { user_id: user._id.toString() },
            JWT_SECRET, { expiresIn: '30d' }
        );
        sendJson(res, 200, {
            success: true,
            message: 'Login successful',
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user._id.toString(),
                email: user.email,
                full_name: user.full_name || '',
                phone: user.phone || '',
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error(`API Login error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handleRegister(req, res) {
    const data = await readJsonBody(req);
    console.log(`API: Register request for ${data.email}`);
    try {
        const hashed = await bcrypt.hash(data.password || '', 10);
        const result = await col('users').insertOne({
            email: data.email,
            password_hash: hashed,
            full_name: data.full_name || '',
            phone: data.phone || '',
            role: 'user',
            is_active: true,
            created_at: new Date()
        });
        sendJson(res, 201, {
            success: true,
            message: 'Registration successful',
            user_id: result.insertedId.toString()
        });
    } catch (error) {
        console.error(`API Register error: ${error.message}`);
        if (error.code === 11000) {
            sendJson(res, 400, { success: false, message: 'Email already registered' });
        } else {
            sendJson(res, 500, { success: false, message: error.message });
        }
    }
}

async function handleRefreshToken(req, res) {
    const data = await readJsonBody(req);
    try {
        const payload = jwt.verify(data.refresh_token || '', JWT_SECRET);
        const accessToken = jwt.sign(
            { user_id: payload.user_id }, JWT_SECRET, { expiresIn: JWT_EXPIRATION }
        );
        sendJson(res, 200, { success: true, access_token: accessToken });
    } catch (error) {
        console.error(`API Refresh token error: ${error.message}`);
        sendJson(res, 401, { success: false, message: 'Invalid refresh token' });
    }
}

async function handleForgotPassword(req, res) {
    const data = await readJsonBody(req);
    console.log(`API: Password reset request from ${data.email}`);
    try {
        await col('contact_requests').insertOne({
            name: data.name || '',
            phone: '',
            email: data.email || '',
            message: 'Password reset request',
            type: 'password_reset',
            created_at: new Date()
        });
        sendJson(res, 200, { success: true, message: 'Password reset request received' });
    } catch (error) {
        console.error(`API Forgot password error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handleChangePassword(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    const data = await readJsonBody(req);
    const oldPassword = data.old_password || '';
    const newPassword = data.new_password || '';

    if (!newPassword || newPassword.length < 6) {
        return sendJson(res, 400, { success: false, message: 'New password must be at least 6 characters' });
    }
    try {
        const user = await col('users').findOne({ _id: toObjectId(userId) });
        if (!user) return sendJson(res, 404, { success: false, message: 'User not found' });

        if (!(await bcrypt.compare(oldPassword, user.password_hash))) {
            return sendJson(res, 400, { success: false, message: 'Current password is incorrect' });
        }
        const newHash = await bcrypt.hash(newPassword, 10);
        await col('users').updateOne({ _id: toObjectId(userId) }, { $set: { password_hash: newHash } });
        sendJson(res, 200, { success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error(`API ChangePassword error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handlePay(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    const data = await readJsonBody(req);
    if (!data.payment_id) {
        return sendJson(res, 400, { success: false, message: 'payment_id is required' });
    }
    try {
        const result = await col('payments').updateOne(
            { _id: toObjectId(data.payment_id), user_id: toObjectId(userId) },
            { $set: { status: 'paid', paid_date: new Date() } }
        );
        if (result.matchedCount === 0) {
            return sendJson(res, 404, { success: false, message: 'Payment not found' });
        }
        sendJson(res, 200, { success: true, message: 'Payment marked as paid' });
    } catch (error) {
        console.error(`API Pay error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handleGetProfile(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    try {
        const user = await col('users').findOne({ _id: toObjectId(userId) });
        if (!user) return sendJson(res, 404, { error: 'User not found' });

        const response = {
            user: {
                id: user._id.toString(),
                email: user.email,
                full_name: user.full_name || '',
                phone: user.phone || ''
            }
        };

        const apartment = await col('apartments').findOne({ user_id: toObjectId(userId) });
        if (apartment) {
            const building = await col('buildings').findOne({ _id: apartment.building_id });
            if (building) {
                response.building = {
                    id: building._id.toString(),
                    address: building.address,
                    entrance: building.entrance || '',
                    total_apartments: building.total_apartments,
                    total_residents: building.total_residents
                };
                response.apartment = {
                    id: apartment._id.toString(),
                    number: apartment.number,
                    floor: apartment.floor || 0,
                    type: apartment.type || '',
                    residents: apartment.residents
                };

                const events = await col('events')
                    .find({ building_id: building._id }).sort({ date: -1 }).limit(10).toArray();
                response.events = events.map(e => ({
                    date: e.date ? formatDate(e.date) : '',
                    text: e.description || e.title || ''
                }));
            }
        }

        const prof = await col('user_profiles').findOne({ user_id: toObjectId(userId) });
        if (prof) {
            response.account_manager = prof.account_manager || '';
            response.balance = parseFloat(prof.balance) || 0.0;
            response.client_number = prof.client_number || '';
            response.contract_end_date = prof.contract_end_date
                ? prof.contract_end_date.toISOString().split('T')[0] : '';
        }

        const payments = await col('payments')
            .find({ user_id: toObjectId(userId) }).sort({ created_at: -1 }).toArray();
        let totalPending = 0, totalOverdue = 0, yearlyTotal = 0, lastPayment = null;
        const paymentList = [];
        for (const p of payments) {
            const amount = parseFloat(p.amount);
            paymentList.push({
                period: p.period,
                amount: `${amount.toFixed(2)} лв.`,
                status: p.status,
                paid_date: p.paid_date ? formatDate(p.paid_date) : null
            });
            yearlyTotal += amount;
            if (p.status === 'pending') totalPending += amount;
            else if (p.status === 'overdue') totalOverdue += amount;
            if (p.status === 'paid' && p.paid_date && lastPayment === null) {
                lastPayment = { date: formatDate(p.paid_date), amount: `${amount.toFixed(2)} лв.` };
            }
        }
        response.payments = paymentList;
        response.last_payment = lastPayment;
        response.financial_summary = {
            current_month_debt: `${totalPending.toFixed(2)} лв.`,
            overdue_amount: `${totalOverdue.toFixed(2)} лв.`,
            yearly_total: `${yearlyTotal.toFixed(2)} лв.`
        };

        sendJson(res, 200, response);
    } catch (error) {
        console.error(`API GetProfile error: ${error.message}`, error);
        sendJson(res, 500, { error: error.message });
    }
}

async function handleGetApartment(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    try {
        const apt = await col('apartments').findOne({ user_id: toObjectId(userId) });
        if (!apt) return sendJson(res, 404, { error: 'No apartment found for user' });

        const building = await col('buildings').findOne({ _id: apt.building_id });
        const prof = await col('user_profiles').findOne({ user_id: toObjectId(userId) });

        const payments = await col('payments')
            .find({ user_id: toObjectId(userId) }).sort({ created_at: -1 }).toArray();
        const paymentList = payments.map(p => {
            const periodParts = (p.period || '').split(' ');
            return {
                id: p._id.toString(),
                month: periodParts[0] || '',
                year: periodParts[1] && /^\d+$/.test(periodParts[1]) ? parseInt(periodParts[1]) : 2025,
                fee: parseFloat(p.amount),
                repair: 0.0,
                fund: 0.0,
                extra: 0.0,
                status: p.status,
                paidAt: p.paid_date ? formatDate(p.paid_date) : null
            };
        });

        const maintenanceDocs = await col('maintenance_records')
            .find({ building_id: apt.building_id }).sort({ date: -1 }).toArray();
        const maintenance = maintenanceDocs.map(m => ({
            date: m.date ? formatDate(m.date) : '',
            description: m.description || '',
            cost: m.cost ? `${parseFloat(m.cost).toFixed(2)} лв.` : '0.00 лв.',
            status: m.status || 'planned'
        }));

        sendJson(res, 200, {
            apartmentInfo: {
                building: building ? building.address : '',
                entrance: building ? (building.entrance || '') : '',
                number: String(apt.number),
                residents: apt.residents || 0,
                balance: prof ? (parseFloat(prof.balance) || 0.0) : 0.0,
                clientNumber: prof ? (prof.client_number || '') : ''
            },
            payments: paymentList,
            maintenance
        });
    } catch (error) {
        console.error(`API GetApartment error: ${error.message}`, error);
        sendJson(res, 500, { error: error.message });
    }
}

async function handleGetResidents(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    // Admin only
    let requester = null;
    try {
        requester = await col('users').findOne({ _id: toObjectId(userId) });
    } catch {
        requester = null;
    }
    if (!requester || requester.role !== 'admin') {
        return sendJson(res, 403, { error: 'Forbidden' });
    }

    try {
        const rows = await col('users').aggregate([
            { $lookup: { from: 'apartments', localField: '_id', foreignField: 'user_id', as: 'apartment_data' } },
            { $unwind: { path: '$apartment_data', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'buildings', localField: 'apartment_data.building_id', foreignField: '_id', as: 'building_data' } },
            { $unwind: { path: '$building_data', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'entrances', localField: 'apartment_data.entrance_id', foreignField: '_id', as: 'entrance_data' } },
            { $unwind: { path: '$entrance_data', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'user_profiles', localField: '_id', foreignField: 'user_id', as: 'profile_data' } },
            { $unwind: { path: '$profile_data', preserveNullAndEmptyArrays: true } },
            { $sort: { _id: 1 } }
        ]).toArray();

        const residents = [];
        for (const row of rows) {
            const debtAgg = await col('payments').aggregate([
                { $match: { user_id: row._id, status: { $in: ['pending', 'overdue'] } } },
                { $group: { _id: null, total_debt: { $sum: '$amount' } } }
            ]).toArray();
            const totalDebt = debtAgg.length > 0 ? debtAgg[0].total_debt : 0.0;

            residents.push({
                id: row._id.toString(),
                name: row.full_name || '',
                email: row.email,
                building: (row.building_data && row.building_data.address) || '',
                entrance: (row.entrance_data && row.entrance_data.label)
                    || (row.building_data && row.building_data.entrance) || '',
                apartment: row.apartment_data ? String(row.apartment_data.number || '') : '',
                clientNumber: (row.profile_data && row.profile_data.client_number) || '',
                residentsCount: (row.apartment_data && row.apartment_data.residents) || 0,
                balance: parseFloat((row.profile_data && row.profile_data.balance) || 0.0),
                totalDebt: parseFloat(totalDebt),
                role: row.role || 'user',
                isActive: row.is_active !== undefined ? row.is_active : true
            });
        }

        sendJson(res, 200, { residents });
    } catch (error) {
        console.error(`API GetResidents error: ${error.message}`, error);
        sendJson(res, 500, { error: error.message });
    }
}

async function handleGetBuildingApartments(req, res, urlPath) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    try {
        const parts = urlPath.split('/');
        const rawBuildingId = parts.length > 3 ? parts[3] : null;
        const buildingId = await resolveBuildingId(rawBuildingId, userId);
        if (!buildingId) return sendJson(res, 404, { error: 'No building found' });

        const building = await col('buildings').findOne({ _id: buildingId });

        // Scope to the requesting user's entrance when we can determine it.
        const ownApt = await col('apartments').findOne({ user_id: toObjectId(userId) });
        const entranceId = ownApt ? ownApt.entrance_id : null;
        const entrance = entranceId ? await col('entrances').findOne({ _id: entranceId }) : null;
        const match = entranceId ? { entrance_id: entranceId } : { building_id: buildingId };

        const apts = await col('apartments').aggregate([
            { $match: match },
            { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'payments', localField: '_id', foreignField: 'apartment_id', as: 'payments' } },
            { $sort: { floor: -1, number: 1 } }
        ]).toArray();

        const floorsDict = {};
        for (const apt of apts) {
            const payments = apt.payments || [];
            const amountDue = payments
                .filter(p => p.status === 'pending' || p.status === 'overdue')
                .reduce((sum, p) => sum + p.amount, 0);

            let status = 'paid';
            if (payments.some(p => p.status === 'overdue')) status = 'overdue';
            else if (payments.some(p => p.status === 'pending')) status = 'pending';

            const floorNum = apt.floor || 1;
            if (!floorsDict[floorNum]) floorsDict[floorNum] = [];

            const fullName = (apt.user && apt.user.full_name) || apt.owner_name || '';
            floorsDict[floorNum].push({
                number: apt.number,
                family: fullName ? fullName.split(' ')[0] + 'и' : 'Неизвестни',
                amount: parseFloat(amountDue),
                status
            });
        }

        const floors = Object.keys(floorsDict)
            .map(Number)
            .sort((a, b) => b - a)
            .map(f => ({ floor: f, apartments: floorsDict[f] }));

        sendJson(res, 200, {
            building: {
                address: building ? building.address : '',
                entrance: (entrance && entrance.label) || (building ? building.entrance : '')
            },
            floors
        });
    } catch (error) {
        console.error(`API GetBuildingApartments error: ${error.message}`, error);
        sendJson(res, 500, { error: error.message });
    }
}

async function handleGetMaintenance(req, res, urlPath) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    try {
        const parts = urlPath.split('/');
        const rawBuildingId = parts.length > 3 ? parts[3] : null;
        const buildingId = await resolveBuildingId(rawBuildingId, userId);
        if (!buildingId) return sendJson(res, 400, { error: 'Building ID required' });

        const docs = await col('maintenance_records')
            .find({ building_id: buildingId }).sort({ date: -1 }).toArray();
        const maintenance = docs.map(m => ({
            date: m.date ? formatDate(m.date) : '',
            description: m.description || '',
            cost: m.cost ? `${parseFloat(m.cost).toFixed(2)} лв.` : '0.00 лв.',
            status: m.status || 'planned'
        }));

        sendJson(res, 200, { maintenance });
    } catch (error) {
        console.error(`API GetMaintenance error: ${error.message}`, error);
        sendJson(res, 500, { error: error.message });
    }
}

async function handleContactForm(req, res) {
    const data = await readJsonBody(req);
    console.log(`API: Contact form from ${data.email}`);
    try {
        await col('contact_requests').insertOne({
            name: data.name, phone: data.phone, email: data.email,
            message: data.message, type: 'contact', created_at: new Date()
        });
        sendJson(res, 200, { success: true, message: 'Your message has been sent successfully' });
    } catch (error) {
        console.error(`API Contact form error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handleOffer(req, res) {
    const data = await readJsonBody(req);
    console.log(`API: Offer request from ${data.email}`);
    try {
        await col('contact_requests').insertOne({
            name: '', phone: data.phone, email: data.email,
            message: `City: ${data.city}, Properties: ${data.num_properties}, Address: ${data.address}, Info: ${data.additional_info || ''}`,
            type: 'offer', created_at: new Date()
        });
        sendJson(res, 200, { success: true, message: 'Your offer request has been received' });
    } catch (error) {
        console.error(`API Offer error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handlePresentation(req, res) {
    const data = await readJsonBody(req);
    console.log(`API: Presentation request from ${data.email}`);
    try {
        await col('contact_requests').insertOne({
            name: '', phone: data.phone, email: data.email,
            message: `Date: ${data.date}, Type: ${data.building_type}, Address: ${data.address}, Info: ${data.additional_info || ''}`,
            type: 'presentation', created_at: new Date()
        });
        sendJson(res, 200, { success: true, message: 'Your presentation request has been received' });
    } catch (error) {
        console.error(`API Presentation error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

// ---- Admin: entrances & residents ----

async function handleGetEntrances(req, res) {
    if (!(await requireAdmin(req, res))) return;
    try {
        const entrances = await col('entrances').find({}).sort({ _id: 1 }).toArray();
        const views = [];
        for (const e of entrances) {
            views.push(await buildEntranceView(e));
        }
        sendJson(res, 200, { entrances: views });
    } catch (error) {
        console.error(`API GetEntrances error: ${error.message}`, error);
        sendJson(res, 500, { error: error.message });
    }
}

async function handleCreateEntrance(req, res) {
    if (!(await requireAdmin(req, res))) return;
    const data = await readJsonBody(req);

    const address = (data.address || data.building || '').trim();
    const label = (data.entrance || '').trim();
    const floorsCount = Math.max(1, parseInt(data.floorsCount) || 1);
    const perFloor = Math.max(1, parseInt(data.apartmentsPerFloor) || 1);

    if (!address || !label) {
        return sendJson(res, 400, { success: false, message: 'Building address and entrance label are required' });
    }

    try {
        const buildingId = await upsertBuildingByAddress(address, label);

        const existing = await col('entrances').findOne({ building_id: buildingId, label });
        if (existing) {
            return sendJson(res, 409, { success: false, message: 'This entrance already exists for the building' });
        }

        const entranceRes = await col('entrances').insertOne({
            building_id: buildingId,
            label,
            floors_count: floorsCount,
            apartments_per_floor: perFloor,
            created_at: new Date()
        });
        const entranceId = entranceRes.insertedId;

        // Generate apartments with sequential numbering 1..(floors*perFloor)
        const total = floorsCount * perFloor;
        const docs = [];
        for (let n = 1; n <= total; n++) {
            docs.push({
                building_id: buildingId,
                entrance_id: entranceId,
                number: n,
                floor: Math.ceil(n / perFloor),
                type: 'Апартамент',
                residents: 0,
                owner_name: '',
                user_id: null
            });
        }
        if (docs.length) await col('apartments').insertMany(docs);

        const entrance = await col('entrances').findOne({ _id: entranceId });
        sendJson(res, 201, { success: true, message: 'Entrance created', entrance: await buildEntranceView(entrance) });
    } catch (error) {
        console.error(`API CreateEntrance error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handleUpdateEntrance(req, res, urlPath) {
    if (!(await requireAdmin(req, res))) return;
    const parts = urlPath.split('/');  // /api/admin/entrances/:id
    const entranceId = parts.length > 4 ? parts[4] : null;
    const data = await readJsonBody(req);

    let _id;
    try { _id = toObjectId(entranceId); } catch { return sendJson(res, 400, { success: false, message: 'Invalid entrance id' }); }

    try {
        const entrance = await col('entrances').findOne({ _id });
        if (!entrance) return sendJson(res, 404, { success: false, message: 'Entrance not found' });

        const label = (data.entrance || entrance.label || '').trim();
        const floorsCount = Math.max(1, parseInt(data.floorsCount) || entrance.floors_count || 1);
        const perFloor = Math.max(1, parseInt(data.apartmentsPerFloor) || entrance.apartments_per_floor || 1);
        const address = (data.address || data.building || '').trim();

        await col('entrances').updateOne(
            { _id },
            { $set: { label, floors_count: floorsCount, apartments_per_floor: perFloor } }
        );
        if (address) {
            await col('buildings').updateOne({ _id: entrance.building_id }, { $set: { address } });
        }

        // Reconcile apartments: keep/refloor 1..total, add missing, delete extras (preserves filled data by number)
        const total = floorsCount * perFloor;
        for (let n = 1; n <= total; n++) {
            await col('apartments').updateOne(
                { entrance_id: _id, number: n },
                {
                    $set: { floor: Math.ceil(n / perFloor), building_id: entrance.building_id },
                    $setOnInsert: { type: 'Апартамент', residents: 0, owner_name: '', user_id: null }
                },
                { upsert: true }
            );
        }
        await col('apartments').deleteMany({ entrance_id: _id, number: { $gt: total } });

        const updated = await col('entrances').findOne({ _id });
        sendJson(res, 200, { success: true, message: 'Entrance updated', entrance: await buildEntranceView(updated) });
    } catch (error) {
        console.error(`API UpdateEntrance error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

// Map a UI role label to an internal role; null when not provided
// (callers preserve the existing role in that case).
function mapRole(role) {
    if (role === undefined || role === null || role === '') return null;
    const r = String(role).toLowerCase();
    if (r === 'admin' || r === 'админ') return 'admin';
    if (r === 'manager' || r === 'домоуправител') return 'manager';
    return 'user';
}

async function handleCreateResident(req, res) {
    if (!(await requireAdmin(req, res))) return;
    const data = await readJsonBody(req);

    const apartment = await resolveApartment(data.building, data.entrance, data.apartment);
    if (!apartment) {
        return sendJson(res, 404, { success: false, message: 'Apartment not found for the given building/entrance/number' });
    }

    try {
        let userId = null;
        let tempPassword = null;
        const email = (data.email || '').trim();

        if (email) {
            const existing = await col('users').findOne({ email });
            if (existing) {
                userId = existing._id;
                await col('users').updateOne({ _id: userId }, {
                    $set: {
                        full_name: data.name || existing.full_name || '',
                        role: mapRole(data.role) ?? existing.role ?? 'user',
                        is_active: data.isActive !== undefined ? !!data.isActive : true
                    }
                });
            } else {
                const password = data.password || (tempPassword = generateTempPassword());
                const passwordHash = await bcrypt.hash(password, 10);
                const r = await col('users').insertOne({
                    email,
                    password_hash: passwordHash,
                    full_name: data.name || '',
                    phone: data.phone || '',
                    role: mapRole(data.role) ?? 'user',
                    is_active: data.isActive !== undefined ? !!data.isActive : true,
                    created_at: new Date()
                });
                userId = r.insertedId;
            }

            // Upsert profile
            await col('user_profiles').updateOne(
                { user_id: userId },
                {
                    $set: {
                        balance: parseFloat(data.balance) || 0,
                        client_number: data.clientNumber || ''
                    },
                    $setOnInsert: { account_manager: '', contract_end_date: null }
                },
                { upsert: true }
            );
        }

        // Link apartment
        await col('apartments').updateOne(
            { _id: apartment._id },
            {
                $set: {
                    user_id: userId,
                    residents: parseInt(data.residentsCount) || 0,
                    owner_name: data.name || ''
                }
            }
        );

        sendJson(res, 201, {
            success: true,
            message: 'Resident saved',
            user_id: userId ? userId.toString() : null,
            apartment_id: apartment._id.toString(),
            temp_password: tempPassword
        });
    } catch (error) {
        console.error(`API CreateResident error: ${error.message}`, error);
        if (error.code === 11000) {
            return sendJson(res, 400, { success: false, message: 'Email already registered' });
        }
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handleUpdateResident(req, res, urlPath) {
    if (!(await requireAdmin(req, res))) return;
    const parts = urlPath.split('/');  // /api/admin/residents/:id
    const rawId = parts.length > 4 ? parts[4] : null;
    const data = await readJsonBody(req);

    let userId;
    try { userId = toObjectId(rawId); } catch { return sendJson(res, 400, { success: false, message: 'Invalid resident id' }); }

    try {
        const user = await col('users').findOne({ _id: userId });
        if (!user) return sendJson(res, 404, { success: false, message: 'Resident not found' });

        await col('users').updateOne({ _id: userId }, {
            $set: {
                full_name: data.name !== undefined ? data.name : user.full_name,
                role: mapRole(data.role) ?? user.role ?? 'user',
                is_active: data.isActive !== undefined ? !!data.isActive : user.is_active
            }
        });

        await col('user_profiles').updateOne(
            { user_id: userId },
            {
                $set: {
                    balance: parseFloat(data.balance) || 0,
                    client_number: data.clientNumber || ''
                },
                $setOnInsert: { account_manager: '', contract_end_date: null }
            },
            { upsert: true }
        );

        // Re-link apartment if building/entrance/apartment provided
        if (data.building && data.entrance && data.apartment) {
            const apartment = await resolveApartment(data.building, data.entrance, data.apartment);
            if (apartment) {
                // Detach any other apartment currently held by this user
                await col('apartments').updateMany(
                    { user_id: userId, _id: { $ne: apartment._id } },
                    { $set: { user_id: null } }
                );
                await col('apartments').updateOne(
                    { _id: apartment._id },
                    { $set: { user_id: userId, residents: parseInt(data.residentsCount) || 0, owner_name: data.name || '' } }
                );
            }
        }

        sendJson(res, 200, { success: true, message: 'Resident updated' });
    } catch (error) {
        console.error(`API UpdateResident error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

// ---- Issues & maintenance reports ----

async function handleCreateIssue(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    const data = await readJsonBody(req);
    const title = (data.title || '').trim();
    const description = (data.description || '').trim();
    if (!title) return sendJson(res, 400, { success: false, message: 'Title is required' });

    try {
        const apt = await col('apartments').findOne({ user_id: toObjectId(userId) });
        const now = new Date();
        const r = await col('issues').insertOne({
            user_id: toObjectId(userId),
            building_id: apt ? apt.building_id : null,
            entrance_id: apt ? apt.entrance_id : null,
            apartment_id: apt ? apt._id : null,
            title,
            description,
            category: data.category || 'other',
            status: 'new',
            replies: [],
            created_at: now,
            updated_at: now
        });
        sendJson(res, 201, { success: true, message: 'Issue submitted', id: r.insertedId.toString() });
    } catch (error) {
        console.error(`API CreateIssue error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handleGetMyIssues(req, res) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });
    try {
        const docs = await col('issues').find({ user_id: toObjectId(userId) }).sort({ created_at: -1 }).toArray();
        sendJson(res, 200, { issues: docs.map(d => issueView(d)) });
    } catch (error) {
        console.error(`API GetMyIssues error: ${error.message}`, error);
        sendJson(res, 500, { error: error.message });
    }
}

async function handleReplyIssue(req, res, urlPath) {
    const userId = getUserIdFromToken(req);
    if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

    const parts = urlPath.split('/');  // /api/issues/:id/reply
    let issueId;
    try { issueId = toObjectId(parts[3]); } catch { return sendJson(res, 400, { success: false, message: 'Invalid issue id' }); }

    const data = await readJsonBody(req);
    const message = (data.message || '').trim();
    if (!message) return sendJson(res, 400, { success: false, message: 'Message is required' });

    try {
        const issue = await col('issues').findOne({ _id: issueId });
        if (!issue) return sendJson(res, 404, { success: false, message: 'Issue not found' });

        const me = await col('users').findOne({ _id: toObjectId(userId) });
        const isOwner = issue.user_id && issue.user_id.toString() === userId;
        const isStaff = me && (me.role === 'admin' || me.role === 'manager');
        if (!isOwner && !isStaff) return sendJson(res, 403, { error: 'Forbidden' });

        await col('issues').updateOne(
            { _id: issueId },
            {
                $push: {
                    replies: {
                        author_id: toObjectId(userId),
                        author_role: me ? me.role : 'user',
                        author_name: me ? (me.full_name || me.email) : '',
                        message,
                        created_at: new Date()
                    }
                },
                $set: { updated_at: new Date() }
            }
        );
        sendJson(res, 200, { success: true, message: 'Reply added' });
    } catch (error) {
        console.error(`API ReplyIssue error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

async function handleGetAdminIssues(req, res) {
    if (!(await requireStaff(req, res))) return;
    try {
        const q = new URLSearchParams((req.url.split('?')[1]) || '');
        const statusFilter = q.get('status');
        const pipeline = [{ $sort: { created_at: -1 } }];
        if (statusFilter && ISSUE_STATUSES.includes(statusFilter)) {
            pipeline.unshift({ $match: { status: statusFilter } });
        }
        pipeline.push(
            { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'resident' } },
            { $unwind: { path: '$resident', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'buildings', localField: 'building_id', foreignField: '_id', as: 'b' } },
            { $unwind: { path: '$b', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'entrances', localField: 'entrance_id', foreignField: '_id', as: 'e' } },
            { $unwind: { path: '$e', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'apartments', localField: 'apartment_id', foreignField: '_id', as: 'a' } },
            { $unwind: { path: '$a', preserveNullAndEmptyArrays: true } }
        );
        const rows = await col('issues').aggregate(pipeline).toArray();
        const issues = rows.map(d => issueView(
            d,
            d.resident || null,
            {
                building: d.b ? d.b.address : '',
                entrance: d.e ? d.e.label : '',
                apartment: d.a ? String(d.a.number) : ''
            }
        ));
        sendJson(res, 200, { issues });
    } catch (error) {
        console.error(`API GetAdminIssues error: ${error.message}`, error);
        sendJson(res, 500, { error: error.message });
    }
}

async function handleUpdateIssueStatus(req, res, urlPath) {
    if (!(await requireStaff(req, res))) return;
    const parts = urlPath.split('/');  // /api/admin/issues/:id/status
    let issueId;
    try { issueId = toObjectId(parts[4]); } catch { return sendJson(res, 400, { success: false, message: 'Invalid issue id' }); }

    const data = await readJsonBody(req);
    if (!ISSUE_STATUSES.includes(data.status)) {
        return sendJson(res, 400, { success: false, message: 'Invalid status' });
    }
    try {
        const result = await col('issues').updateOne(
            { _id: issueId },
            { $set: { status: data.status, updated_at: new Date() } }
        );
        if (result.matchedCount === 0) return sendJson(res, 404, { success: false, message: 'Issue not found' });
        sendJson(res, 200, { success: true, message: 'Status updated' });
    } catch (error) {
        console.error(`API UpdateIssueStatus error: ${error.message}`, error);
        sendJson(res, 500, { success: false, message: error.message });
    }
}

// Format a Date as DD.MM.YYYY (matches the Bulgarian UI formatting)
function formatDate(d) {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getUTCFullYear()}`;
}

function startHTTPServer(port) {
    const server = http.createServer(async (req, res) => {
        const urlPath = req.url.split('?')[0];

        if (req.method === 'OPTIONS') {
            res.writeHead(204, { ...CORS_HEADERS, 'Content-Length': '0' });
            res.end();
            return;
        }

        try {
            if (req.method === 'GET') {
                if (urlPath === '/health') return handleHealth(res);
                if (urlPath === '/api/user/profile') return handleGetProfile(req, res);
                if (urlPath === '/api/user/apartment') return handleGetApartment(req, res);
                if (urlPath === '/api/issues') return handleGetMyIssues(req, res);
                if (urlPath === '/api/admin/issues') return handleGetAdminIssues(req, res);
                if (urlPath === '/api/admin/residents') return handleGetResidents(req, res);
                if (urlPath === '/api/admin/entrances') return handleGetEntrances(req, res);
                if (urlPath.startsWith('/api/building/') && urlPath.includes('/apartments')) {
                    return handleGetBuildingApartments(req, res, urlPath);
                }
                if (urlPath.startsWith('/api/building/') && urlPath.includes('/maintenance')) {
                    return handleGetMaintenance(req, res, urlPath);
                }
                return sendJson(res, 404, { error: 'Not found' });
            }

            if (req.method === 'POST') {
                if (urlPath === '/api/auth/login') return handleLogin(req, res);
                if (urlPath === '/api/auth/register') return handleRegister(req, res);
                if (urlPath === '/api/auth/refresh') return handleRefreshToken(req, res);
                if (urlPath === '/api/auth/forgot') return handleForgotPassword(req, res);
                if (urlPath === '/api/user/password') return handleChangePassword(req, res);
                if (urlPath === '/api/payments/pay') return handlePay(req, res);
                if (urlPath === '/api/issues') return handleCreateIssue(req, res);
                if (urlPath.startsWith('/api/issues/') && urlPath.endsWith('/reply')) return handleReplyIssue(req, res, urlPath);
                if (urlPath === '/api/admin/entrances') return handleCreateEntrance(req, res);
                if (urlPath === '/api/admin/residents') return handleCreateResident(req, res);
                if (urlPath === '/api/contact/form') return handleContactForm(req, res);
                if (urlPath === '/api/contact/offer') return handleOffer(req, res);
                if (urlPath === '/api/contact/presentation') return handlePresentation(req, res);
                return sendJson(res, 404, { error: 'Not found' });
            }

            if (req.method === 'PUT') {
                if (urlPath.startsWith('/api/admin/issues/') && urlPath.endsWith('/status')) return handleUpdateIssueStatus(req, res, urlPath);
                if (urlPath.startsWith('/api/admin/entrances/')) return handleUpdateEntrance(req, res, urlPath);
                if (urlPath.startsWith('/api/admin/residents/')) return handleUpdateResident(req, res, urlPath);
                return sendJson(res, 404, { error: 'Not found' });
            }

            sendJson(res, 404, { error: 'Not found' });
        } catch (error) {
            console.error('API error:', error);
            sendJson(res, 500, { error: error.message });
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`✓ HTTP REST API server started on port ${port}`);
        console.log(`  Health endpoint: http://0.0.0.0:${port}/health`);
        console.log(`  API endpoints: http://0.0.0.0:${port}/api/*`);
    });
}

// ==================== Server Startup ====================

async function startServer() {
    logSection('DOMUNITY gRPC + REST API SERVER (Node.js)');
    console.log(`Starting at ${new Date().toISOString()}`);
    console.log(`Node version: ${process.version}`);
    console.log();

    console.log('Environment Configuration:');
    console.log(`  MONGODB_URI: ${process.env.MONGODB_URI || (process.env.DATABASE_URL || '').startsWith('mongodb') ? 'SET' : 'NOT SET'}`);
    console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'USING DEFAULT'}`);
    console.log(`  GRPC_PORT: ${GRPC_PORT}`);
    console.log(`  HTTP_PORT: ${HTTP_PORT}`);
    logSeparator();

    // Never run in production with the hardcoded fallback secret.
    if (!process.env.JWT_SECRET) {
        if (process.env.NODE_ENV === 'production') {
            console.error('✗ JWT_SECRET is not set — refusing to start in production.');
            process.exit(1);
        }
        console.warn('⚠ JWT_SECRET not set — using an insecure development default. Do NOT use in production.');
    }

    // Initialize database
    try {
        await db.connect();
        console.log('✓ Database initialized successfully');
    } catch (error) {
        console.error('✗ Database initialization failed:', error);
        process.exit(1);
    }

    // Start HTTP REST API server
    startHTTPServer(HTTP_PORT);

    // Create gRPC server
    const server = new grpc.Server();
    server.addService(domunity.AuthService.service, authService);
    server.addService(domunity.UserService.service, userService);
    server.addService(domunity.BuildingService.service, buildingService);
    server.addService(domunity.FinancialService.service, financialService);
    server.addService(domunity.EventService.service, eventService);
    server.addService(domunity.ContactService.service, contactService);
    server.addService(domunity.HealthService.service, healthService);

    server.bindAsync(
        `0.0.0.0:${GRPC_PORT}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
            if (error) {
                console.error('✗ Server failed to start:', error);
                process.exit(1);
            }
            server.start();
            logSection('✓ SERVERS STARTED SUCCESSFULLY');
            console.log(`\ngRPC Server: 0.0.0.0:${port}`);
            console.log(`HTTP REST API: 0.0.0.0:${HTTP_PORT}/api/*`);
            console.log(`Health Check: 0.0.0.0:${HTTP_PORT}/health`);
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

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
