use std::net::SocketAddr;
use tonic::transport::Server;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod services;
mod utils;

// Include generated proto code
pub mod proto {
    tonic::include_proto!("api.v1");
}

use proto::{
    auth_service_server::AuthServiceServer, contact_service_server::ContactServiceServer,
    offer_service_server::OfferServiceServer,
};
use services::{AuthServiceImpl, ContactServiceImpl, OfferServiceImpl};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "domunity_backend=debug,tower_http=debug,info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Get configuration from environment
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // Render sets PORT environment variable
    let port = std::env::var("PORT").unwrap_or_else(|_| "50051".to_string());

    // Always bind to 0.0.0.0 for Render (not 127.0.0.1)
    let host = "0.0.0.0";

    let frontend_url =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());

    // Create database connection pool
    tracing::info!("Connecting to database...");
    tracing::debug!(
        "Database URL (masked): {}",
        database_url.split('@').next_back().unwrap_or("unknown")
    );
    let pool = db::create_pool(&database_url).await?;

    // Run migrations
    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;

    tracing::info!("Database setup complete");

    // Create gRPC services
    let auth_service = AuthServiceImpl::new(pool.clone());
    let contact_service = ContactServiceImpl::new(pool.clone());
    let offer_service = OfferServiceImpl::new(pool);

    // Parse server address
    let addr: SocketAddr = format!("{}:{}", host, port).parse()?;

    tracing::info!("🚀 DomUnity gRPC server starting on {}", addr);
    tracing::info!("📡 Frontend URL: {}", frontend_url);
    tracing::info!("🔒 CORS enabled for gRPC-Web");
    tracing::info!("💚 Health check available at /__health (via gRPC health service)");

    // Configure CORS for gRPC-Web
    let cors = CorsLayer::new()
        .allow_origin(Any) // In production, restrict to frontend_url
        .allow_headers(Any)
        .allow_methods(Any)
        .expose_headers(Any);

    // Build health service
    let (mut health_reporter, health_service) = tonic_health::server::health_reporter();
    health_reporter
        .set_serving::<AuthServiceServer<AuthServiceImpl>>()
        .await;
    health_reporter
        .set_serving::<ContactServiceServer<ContactServiceImpl>>()
        .await;
    health_reporter
        .set_serving::<OfferServiceServer<OfferServiceImpl>>()
        .await;

    // Start server with gRPC-Web support and health check
    Server::builder()
        .accept_http1(true) // Required for gRPC-Web
        .layer(cors)
        .add_service(health_service)
        .add_service(tonic_web::enable(AuthServiceServer::new(auth_service)))
        .add_service(tonic_web::enable(ContactServiceServer::new(
            contact_service,
        )))
        .add_service(tonic_web::enable(OfferServiceServer::new(offer_service)))
        .serve(addr)
        .await?;

    Ok(())
}
