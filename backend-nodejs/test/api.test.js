/**
 * End-to-end REST API tests for the DomUnity Node.js backend.
 *
 * Boots the real server (child process) against a throwaway MongoDB database
 * and exercises the HTTP contract the frontend relies on: auth, profile,
 * apartment, entrances, residents, issues and payments — including the
 * authorization rules (401/403) and the regressions fixed in this codebase.
 *
 * Skips gracefully when MongoDB is not available.
 */

const { spawn } = require('child_process');
const path = require('path');
const { MongoClient } = require('mongodb');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');

jest.setTimeout(90000);

const HTTP_PORT = 18123;
const GRPC_PORT = 15123;
const BASE = `http://127.0.0.1:${HTTP_PORT}`;
const DB_NAME = 'domunity_api_test';
// Reuse the host of TEST_MONGODB_URI (CI) but always use our own database name.
const MONGO_HOST = (process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/x').replace(/[^/]*$/, '');
const MONGODB_URI = `${MONGO_HOST}${DB_NAME}`;

let available = false;
let client = null;
let server = null;
let serverLogs = '';

async function api(method, p, { token, body } = {}) {
    const res = await fetch(`${BASE}${p}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, data };
}

async function loginAs(email, password) {
    const { status, data } = await api('POST', '/api/auth/login', { body: { email, password } });
    return { status, data, token: data ? data.access_token : null };
}

const skip = () => {
    if (!available) {
        console.log('Skipping test - no database/server available');
        return true;
    }
    return false;
};

beforeAll(async () => {
    // 1) Check MongoDB availability and start from a clean database.
    try {
        client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
        await client.connect();
        await client.db(DB_NAME).dropDatabase();
    } catch {
        console.log('Test database (MongoDB) not available, skipping API tests');
        if (client) await client.close().catch(() => {});
        client = null;
        return;
    }

    // 2) Boot the real server; sample data seeds automatically on the empty DB.
    server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
        env: {
            ...process.env,
            MONGODB_URI,
            JWT_SECRET: 'api-test-secret',
            HTTP_PORT: String(HTTP_PORT),
            GRPC_PORT: String(GRPC_PORT),
            PORT: String(HTTP_PORT)
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    server.stdout.on('data', (d) => { serverLogs += d; });
    server.stderr.on('data', (d) => { serverLogs += d; });

    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${BASE}/health`);
            if (res.ok) { available = true; break; }
        } catch { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 300));
    }
    if (!available) {
        console.error(`Server failed to start.\n${serverLogs}`);
    }
});

afterAll(async () => {
    if (server) server.kill();
    if (client) {
        await client.db(DB_NAME).dropDatabase().catch(() => {});
        await client.close().catch(() => {});
    }
});

describe('Health', () => {
    it('reports healthy with a connected database', async () => {
        if (skip()) return;
        const { status, data } = await api('GET', '/health');
        expect(status).toBe(200);
        expect(data.status).toBe('healthy');
        expect(data.database).toBe('connected');
    });
});

describe('Auth', () => {
    it('logs in a seeded user and returns tokens + role', async () => {
        if (skip()) return;
        const { status, data } = await loginAs('ivan.ivanov@example.com', 'test123');
        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.access_token).toBeTruthy();
        expect(data.refresh_token).toBeTruthy();
        expect(data.user.role).toBe('user');
    });

    it('rejects a wrong password with 401', async () => {
        if (skip()) return;
        const { status, data } = await loginAs('ivan.ivanov@example.com', 'WRONG');
        expect(status).toBe(401);
        expect(data.success).toBe(false);
    });

    it('blocks a deactivated account with 403', async () => {
        if (skip()) return;
        // petar.petrov is seeded with is_active: false
        const { status, data } = await loginAs('petar.petrov@example.com', 'test123');
        expect(status).toBe(403);
        expect(data.success).toBe(false);
    });

    it('registers a new user and rejects a duplicate email', async () => {
        if (skip()) return;
        const first = await api('POST', '/api/auth/register', {
            body: { email: 'fresh@test.bg', password: 'freshpass1', full_name: 'Fresh User' }
        });
        expect(first.status).toBe(201);
        expect(first.data.success).toBe(true);

        const dup = await api('POST', '/api/auth/register', {
            body: { email: 'fresh@test.bg', password: 'freshpass1' }
        });
        expect(dup.status).toBe(400);
        expect(dup.data.message).toMatch(/already registered/i);
    });

    it('refreshes an access token', async () => {
        if (skip()) return;
        const { data } = await loginAs('ivan.ivanov@example.com', 'test123');
        const refreshed = await api('POST', '/api/auth/refresh', {
            body: { refresh_token: data.refresh_token }
        });
        expect(refreshed.status).toBe(200);
        expect(refreshed.data.access_token).toBeTruthy();
    });

    it('records a forgot-password request', async () => {
        if (skip()) return;
        const { status, data } = await api('POST', '/api/auth/forgot', {
            body: { name: 'Ivan', email: 'ivan.ivanov@example.com' }
        });
        expect(status).toBe(200);
        expect(data.success).toBe(true);
    });

    it('changes a password only when the current one is correct', async () => {
        if (skip()) return;
        await api('POST', '/api/auth/register', {
            body: { email: 'pwuser@test.bg', password: 'origpass1', full_name: 'PW User' }
        });
        const { token } = await loginAs('pwuser@test.bg', 'origpass1');

        const wrong = await api('POST', '/api/user/password', {
            token, body: { old_password: 'WRONG', new_password: 'newpass99' }
        });
        expect(wrong.status).toBe(400);

        const ok = await api('POST', '/api/user/password', {
            token, body: { old_password: 'origpass1', new_password: 'newpass99' }
        });
        expect(ok.status).toBe(200);

        expect((await loginAs('pwuser@test.bg', 'origpass1')).status).toBe(401);
        expect((await loginAs('pwuser@test.bg', 'newpass99')).status).toBe(200);
    });
});

describe('Profile & apartment', () => {
    it('requires auth for the profile', async () => {
        if (skip()) return;
        expect((await api('GET', '/api/user/profile')).status).toBe(401);
    });

    it('returns profile with building, apartment, payments and summary', async () => {
        if (skip()) return;
        const { token } = await loginAs('ivan.ivanov@example.com', 'test123');
        const { status, data } = await api('GET', '/api/user/profile', { token });
        expect(status).toBe(200);
        expect(data.user.email).toBe('ivan.ivanov@example.com');
        expect(data.building.address).toBeTruthy();
        expect(data.apartment.number).toBe(1);
        expect(Array.isArray(data.payments)).toBe(true);
        expect(data.payments.length).toBeGreaterThan(0);
        expect(data.financial_summary).toBeTruthy();
    });

    it('returns apartment details with payment ids and maintenance', async () => {
        if (skip()) return;
        const { token } = await loginAs('ivan.ivanov@example.com', 'test123');
        const { status, data } = await api('GET', '/api/user/apartment', { token });
        expect(status).toBe(200);
        expect(data.apartmentInfo.number).toBe('1');
        expect(data.payments.length).toBeGreaterThan(0);
        expect(data.payments[0].id).toBeTruthy();
        expect(Array.isArray(data.maintenance)).toBe(true);
    });

    it('returns 404 for a user without an apartment', async () => {
        if (skip()) return;
        const { token } = await loginAs('fresh@test.bg', 'freshpass1');
        const { status, data } = await api('GET', '/api/user/apartment', { token });
        expect(status).toBe(404);
        expect(data.error).toBe('No apartment found for user');
    });

    it('serves building apartments for a legacy numeric building id (old crash)', async () => {
        if (skip()) return;
        const { token } = await loginAs('ivan.ivanov@example.com', 'test123');
        const { status, data } = await api('GET', '/api/building/1/apartments', { token });
        expect(status).toBe(200);
        expect(data.building.entrance).toBe('Б');
        expect(data.floors.length).toBeGreaterThan(0);
    });
});

describe('Admin: residents & entrances', () => {
    let adminToken;

    beforeAll(async () => {
        if (!available) return;
        adminToken = (await loginAs('admin@domunity.bg', 'test123')).token;
    });

    it('enforces auth on the residents list (401 / 403 / 200)', async () => {
        if (skip()) return;
        expect((await api('GET', '/api/admin/residents')).status).toBe(401);

        const ivan = (await loginAs('ivan.ivanov@example.com', 'test123')).token;
        expect((await api('GET', '/api/admin/residents', { token: ivan })).status).toBe(403);

        const { status, data } = await api('GET', '/api/admin/residents', { token: adminToken });
        expect(status).toBe(200);
        const ivanRow = data.residents.find((r) => r.email === 'ivan.ivanov@example.com');
        expect(ivanRow).toBeTruthy();
        expect(ivanRow.entrance).toBe('Б');
        expect(ivanRow.apartment).toBe('1');
    });

    it('creates an entrance with sequential apartment numbering', async () => {
        if (skip()) return;
        const { status, data } = await api('POST', '/api/admin/entrances', {
            token: adminToken,
            body: { address: 'API Street 1', entrance: 'T', floorsCount: 3, apartmentsPerFloor: 2 }
        });
        expect(status).toBe(201);
        const nums = data.entrance.floors
            .flatMap((f) => f.apartments.map((a) => a.number))
            .sort((a, b) => a - b);
        expect(nums).toEqual([1, 2, 3, 4, 5, 6]);
        // floor 3 holds the last pair
        const top = data.entrance.floors.find((f) => f.floor === 3);
        expect(top.apartments.map((a) => a.number).sort()).toEqual([5, 6]);
    });

    it('rejects a duplicate entrance label per building (409) and non-admin create (403)', async () => {
        if (skip()) return;
        const dup = await api('POST', '/api/admin/entrances', {
            token: adminToken,
            body: { address: 'API Street 1', entrance: 'T', floorsCount: 1, apartmentsPerFloor: 1 }
        });
        expect(dup.status).toBe(409);

        const ivan = (await loginAs('ivan.ivanov@example.com', 'test123')).token;
        const forbidden = await api('POST', '/api/admin/entrances', {
            token: ivan,
            body: { address: 'API Street 2', entrance: 'A', floorsCount: 1, apartmentsPerFloor: 1 }
        });
        expect(forbidden.status).toBe(403);
    });

    it('creates a resident with a generated temp password that works for login', async () => {
        if (skip()) return;
        const { status, data } = await api('POST', '/api/admin/residents', {
            token: adminToken,
            body: {
                name: 'API Resident', email: 'apires@test.bg',
                building: 'API Street 1', entrance: 'T', apartment: '3',
                residentsCount: 2, clientNumber: 'C-100', balance: 5
            }
        });
        expect(status).toBe(201);
        expect(data.temp_password).toBeTruthy();

        const login = await loginAs('apires@test.bg', data.temp_password);
        expect(login.status).toBe(200);

        // The resident sees their own apartment
        const apt = await api('GET', '/api/user/apartment', { token: login.token });
        expect(apt.status).toBe(200);
        expect(apt.data.apartmentInfo.number).toBe('3');
        expect(apt.data.apartmentInfo.clientNumber).toBe('C-100');
    });

    it('maps the manager role: staff access to issues but not residents', async () => {
        if (skip()) return;
        const created = await api('POST', '/api/admin/residents', {
            token: adminToken,
            body: {
                name: 'API Manager', email: 'apimgr@test.bg',
                building: 'API Street 1', entrance: 'T', apartment: '4',
                residentsCount: 1, role: 'Домоуправител'
            }
        });
        expect(created.status).toBe(201);

        const mgr = await loginAs('apimgr@test.bg', created.data.temp_password);
        expect(mgr.data.user.role).toBe('manager');

        expect((await api('GET', '/api/admin/issues', { token: mgr.token })).status).toBe(200);
        expect((await api('GET', '/api/admin/residents', { token: mgr.token })).status).toBe(403);
    });

    it('updating a resident without a role does not downgrade it', async () => {
        if (skip()) return;
        const residents = (await api('GET', '/api/admin/residents', { token: adminToken })).data.residents;
        const mgrRow = residents.find((r) => r.email === 'apimgr@test.bg');
        expect(mgrRow.role).toBe('manager');

        const upd = await api('PUT', `/api/admin/residents/${mgrRow.id}`, {
            token: adminToken,
            body: { name: 'API Manager Renamed', balance: 1 } // no role sent
        });
        expect(upd.status).toBe(200);

        const after = (await api('GET', '/api/admin/residents', { token: adminToken })).data.residents
            .find((r) => r.email === 'apimgr@test.bg');
        expect(after.role).toBe('manager');
        expect(after.name).toBe('API Manager Renamed');
    });

    it('grows and shrinks an entrance while preserving filled apartments', async () => {
        if (skip()) return;
        const entrances = (await api('GET', '/api/admin/entrances', { token: adminToken })).data.entrances;
        const ent = entrances.find((e) => e.entrance === 'T');

        // Grow 3x2 -> 4x2 (8 apartments)
        const grown = await api('PUT', `/api/admin/entrances/${ent.id}`, {
            token: adminToken,
            body: { entrance: 'T', address: 'API Street 1', floorsCount: 4, apartmentsPerFloor: 2 }
        });
        expect(grown.status).toBe(200);
        const grownApts = grown.data.entrance.floors.flatMap((f) => f.apartments);
        expect(grownApts.length).toBe(8);
        expect(grownApts.find((a) => a.number === 3).family).toBe('API Resident');

        // Shrink back to 2x2 (4 apartments) — apartment 3 (filled) survives
        const shrunk = await api('PUT', `/api/admin/entrances/${ent.id}`, {
            token: adminToken,
            body: { entrance: 'T', address: 'API Street 1', floorsCount: 2, apartmentsPerFloor: 2 }
        });
        const nums = shrunk.data.entrance.floors.flatMap((f) => f.apartments.map((a) => a.number)).sort();
        expect(nums).toEqual([1, 2, 3, 4]);
        expect(shrunk.data.entrance.floors.flatMap((f) => f.apartments).find((a) => a.number === 3).family)
            .toBe('API Resident');
    });
});

describe('Issues', () => {
    let ivanToken;
    let adminToken;
    let issueId;

    beforeAll(async () => {
        if (!available) return;
        ivanToken = (await loginAs('ivan.ivanov@example.com', 'test123')).token;
        adminToken = (await loginAs('admin@domunity.bg', 'test123')).token;
    });

    it('lets a resident create and list their issues', async () => {
        if (skip()) return;
        const created = await api('POST', '/api/issues', {
            token: ivanToken,
            body: { title: 'API leak', description: 'Water on floor 1', category: 'plumbing' }
        });
        expect(created.status).toBe(201);
        issueId = created.data.id;

        const mine = await api('GET', '/api/issues', { token: ivanToken });
        expect(mine.status).toBe(200);
        const found = mine.data.issues.find((i) => i.id === issueId);
        expect(found.status).toBe('new');
        expect(found.category).toBe('plumbing');
    });

    it('rejects an issue without a title and unauthenticated access', async () => {
        if (skip()) return;
        expect((await api('POST', '/api/issues', { token: ivanToken, body: { title: '  ' } })).status).toBe(400);
        expect((await api('GET', '/api/issues')).status).toBe(401);
    });

    it('blocks non-staff from the admin issue list', async () => {
        if (skip()) return;
        expect((await api('GET', '/api/admin/issues', { token: ivanToken })).status).toBe(403);
    });

    it('staff list includes resident and location, supports a status workflow', async () => {
        if (skip()) return;
        const all = await api('GET', '/api/admin/issues', { token: adminToken });
        expect(all.status).toBe(200);
        const row = all.data.issues.find((i) => i.id === issueId);
        expect(row.resident_name).toBe('Иван Иванов');
        expect(row.apartment).toBe('1');

        // Invalid status rejected
        const bad = await api('PUT', `/api/admin/issues/${issueId}/status`, {
            token: adminToken, body: { status: 'nonsense' }
        });
        expect(bad.status).toBe(400);

        // Valid transition
        const ok = await api('PUT', `/api/admin/issues/${issueId}/status`, {
            token: adminToken, body: { status: 'in_progress' }
        });
        expect(ok.status).toBe(200);

        // Status filter returns only matching issues
        const filtered = await api('GET', '/api/admin/issues?status=in_progress', { token: adminToken });
        expect(filtered.data.issues.map((i) => i.id)).toContain(issueId);
        expect(filtered.data.issues.every((i) => i.status === 'in_progress')).toBe(true);
    });

    it('supports replies from staff and the owner; resident sees both', async () => {
        if (skip()) return;
        expect((await api('POST', `/api/issues/${issueId}/reply`, {
            token: adminToken, body: { message: 'Plumber scheduled.' }
        })).status).toBe(200);
        expect((await api('POST', `/api/issues/${issueId}/reply`, {
            token: ivanToken, body: { message: 'Thank you!' }
        })).status).toBe(200);

        // A different (non-owner, non-staff) resident cannot reply
        const maria = (await loginAs('m.georgieva@example.com', 'test123')).token;
        expect((await api('POST', `/api/issues/${issueId}/reply`, {
            token: maria, body: { message: 'intruding' }
        })).status).toBe(403);

        const mine = await api('GET', '/api/issues', { token: ivanToken });
        const issue = mine.data.issues.find((i) => i.id === issueId);
        expect(issue.status).toBe('in_progress');
        expect(issue.replies.length).toBe(2);
        expect(issue.replies[0].author_role).toBe('admin');
        expect(issue.replies[1].message).toBe('Thank you!');
    });
});

describe('Meetings', () => {
    let ivanToken;
    let adminToken;

    beforeAll(async () => {
        if (!available) return;
        ivanToken = (await loginAs('ivan.ivanov@example.com', 'test123')).token;
        adminToken = (await loginAs('admin@domunity.bg', 'test123')).token;
    });

    it('lists the seeded online meeting and requires auth', async () => {
        if (skip()) return;
        expect((await api('GET', '/api/meetings')).status).toBe(401);

        const { status, data } = await api('GET', '/api/meetings', { token: ivanToken });
        expect(status).toBe(200);
        const seeded = data.meetings.find((m) => m.online_provider === 'jitsi');
        expect(seeded).toBeTruthy();
        expect(seeded.online_url).toMatch(/^https:\/\/meet\.jit\.si\//);
    });

    it('blocks non-staff from creating meetings', async () => {
        if (skip()) return;
        const res = await api('POST', '/api/admin/meetings', {
            token: ivanToken, body: { title: 'nope' }
        });
        expect(res.status).toBe(403);
    });

    it('auto-generates a Jitsi room for built-in meetings', async () => {
        if (skip()) return;
        const { status, data } = await api('POST', '/api/admin/meetings', {
            token: adminToken,
            body: { title: 'Extraordinary assembly', online_provider: 'jitsi', date: '2026-07-01T18:00:00.000Z' }
        });
        expect(status).toBe(201);
        expect(data.meeting.online_url).toMatch(/^https:\/\/meet\.jit\.si\/DomUnity-/);
    });

    it('stores an external provider link as given, and residents see it', async () => {
        if (skip()) return;
        const created = await api('POST', '/api/admin/meetings', {
            token: adminToken,
            body: { title: 'Zoom call', online_provider: 'zoom', online_url: 'https://zoom.us/j/123' }
        });
        expect(created.status).toBe(201);
        expect(created.data.meeting.online_provider).toBe('zoom');
        expect(created.data.meeting.online_url).toBe('https://zoom.us/j/123');

        const list = await api('GET', '/api/meetings', { token: ivanToken });
        expect(list.data.meetings.some((m) => m.id === created.data.id)).toBe(true);
    });

    it('lets staff delete a meeting but blocks residents', async () => {
        if (skip()) return;
        const created = await api('POST', '/api/admin/meetings', {
            token: adminToken, body: { title: 'To delete', online_provider: 'other', online_url: 'https://x.test' }
        });
        const id = created.data.id;

        expect((await api('DELETE', `/api/admin/meetings/${id}`, { token: ivanToken })).status).toBe(403);
        expect((await api('DELETE', `/api/admin/meetings/${id}`, { token: adminToken })).status).toBe(200);

        const list = await api('GET', '/api/meetings', { token: ivanToken });
        expect(list.data.meetings.some((m) => m.id === id)).toBe(false);
    });
});

describe('Payments', () => {
    it('marks own pending payment as paid; rejects paying others', async () => {
        if (skip()) return;
        const ivan = (await loginAs('ivan.ivanov@example.com', 'test123')).token;
        const maria = (await loginAs('m.georgieva@example.com', 'test123')).token;

        const apt = await api('GET', '/api/user/apartment', { token: ivan });
        const pending = apt.data.payments.find((p) => p.status !== 'paid');
        expect(pending).toBeTruthy();

        // Maria cannot pay Ivan's invoice
        expect((await api('POST', '/api/payments/pay', {
            token: maria, body: { payment_id: pending.id }
        })).status).toBe(404);

        // Ivan can
        const paid = await api('POST', '/api/payments/pay', {
            token: ivan, body: { payment_id: pending.id }
        });
        expect(paid.status).toBe(200);

        const after = await api('GET', '/api/user/apartment', { token: ivan });
        expect(after.data.payments.find((p) => p.id === pending.id).status).toBe('paid');
    });
});
