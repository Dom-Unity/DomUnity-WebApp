// gRPC-Web service wrapper. If generated stubs are available (src/proto), this will
// use grpc-web to call the backend. Otherwise it falls back to the HTTP `api.js` client.

import api from './api';

let useGrpc = false;
let clients = {};

try {
    // Attempt to import generated stubs (these will exist after running `npm run generate-proto`)
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const proto = require('../proto/domunity_pb.js');
    const services = require('../proto/domunity_grpc_web_pb.js');
    const { grpc } = require('grpc-web');

    const host = process.env.REACT_APP_GRPC_HOST || '';

    // Create clients for services you need. Example: HealthService
    clients.HealthService = new services.HealthServiceClient(host, null, null);
    clients.UserService = new services.UserServiceClient(host, null, null);
    clients.EventService = new services.EventServiceClient(host, null, null);
    clients.AuthService = new services.AuthServiceClient(host, null, null);

    useGrpc = true;
} catch (e) {
    // Generated stubs not present or grpc-web not available; fall back
    useGrpc = false;
}

// Example health check using grpc-web if available
export async function healthCheck() {
    if (!useGrpc) return api.healthCheck();

    return new Promise((resolve, reject) => {
        const req = new (require('../proto/domunity_pb.js').HealthCheckRequest)();
        clients.HealthService.check(req, {}, (err, resp) => {
            if (err) return reject(err);
            // convert resp to plain object
            resolve({ ok: true, data: { healthy: resp.getHealthy(), version: resp.getVersion(), database_status: resp.getDatabaseStatus() } });
        });
    });
}

export async function getProfile(user_id) {
    if (!useGrpc) return api.getProfile(user_id);

    return new Promise((resolve, reject) => {
        const req = new (require('../proto/domunity_pb.js').GetProfileRequest)();
        req.setUserId(user_id || '');
        clients.UserService.getProfile(req, {}, (err, resp) => {
            if (err) return reject(err);
            // transform resp to plain JSON compatible with api.getProfile
            const obj = {
                user: resp.getUser() && resp.getUser().toObject(),
                building: resp.getBuilding() && resp.getBuilding().toObject(),
                apartment: resp.getApartment() && resp.getApartment().toObject(),
                account_manager: resp.getAccountManager(),
                balance: resp.getBalance(),
                client_number: resp.getClientNumber(),
                contract_end_date: resp.getContractEndDate(),
            };
            resolve({ ok: true, data: obj });
        });
    });
}

export async function listEvents(building_id, limit = 10) {
    if (!useGrpc) return api.listEvents(building_id, limit);

    return new Promise((resolve, reject) => {
        const req = new (require('../proto/domunity_pb.js').ListEventsRequest)();
        req.setBuildingId(building_id || '');
        req.setLimit(limit);
        clients.EventService.listEvents(req, {}, (err, resp) => {
            if (err) return reject(err);
            const events = resp.getEventsList().map(e => e.toObject());
            resolve({ ok: true, data: { events } });
        });
    });
}

export async function login(email, password) {
    if (!useGrpc) return api.login(email, password);

    return new Promise((resolve, reject) => {
        const req = new (require('../proto/domunity_pb.js').LoginRequest)();
        req.setEmail(email);
        req.setPassword(password);
        clients.AuthService.login(req, {}, (err, resp) => {
            if (err) return reject(err);
            resolve({ ok: true, data: resp.toObject() });
        });
    });
}

export default {
    healthCheck,
    getProfile,
    listEvents,
    login,
};
