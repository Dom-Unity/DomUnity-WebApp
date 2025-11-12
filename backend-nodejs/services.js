// This file is included at the end of server.js

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
    console.log(`  PORT: ${PORT}`);
    logSeparator();

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
        `0.0.0.0:${PORT}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
            if (error) {
                console.error('✗ Server failed to start:', error);
                process.exit(1);
            }

            server.start();

            logSection(`✓ SERVER STARTED SUCCESSFULLY on port ${port}`);
            console.log('\nRegistered Services:');
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

// Export for server.js to use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        eventService,
        contactService,
        healthService,
        startServer
    };
}
