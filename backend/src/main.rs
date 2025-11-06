use tonic::transport::Server;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod services;
mod utils;

// Include generated proto code
pub mod proto {
    tonic::include_proto!("api.v1");
}

use proto::{
    auth_service_server::AuthServiceServer,
    contact_service_server::ContactServiceServer,
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
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let host = std::env::var("SERVER_HOST")
        .unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "50051".to_string());
    let frontend_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());

    // Create database connection pool
    tracing::info!("Connecting to database...");
    tracing::debug!("Database URL (masked): {}", database_url.split('@').last().unwrap_or("unknown"));
    let pool = db::create_pool(&database_url).await?;

    // Run migrations
    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    tracing::info!("Database setup complete");

    // Create gRPC services
    let auth_service = AuthServiceImpl::new(pool.clone());
    let contact_service = ContactServiceImpl::new(pool.clone());
    let offer_service = OfferServiceImpl::new(pool);

    // Parse server address
    let addr = format!("{}:{}", host, port).parse()?;

    tracing::info!("🚀 DomUnity gRPC server starting on {}", addr);
    tracing::info!("📡 Frontend URL: {}", frontend_url);

    // Start server with gRPC-Web support
    Server::builder()
        .accept_http1(true) // Required for gRPC-Web
        .add_service(
            tonic_web::enable(AuthServiceServer::new(auth_service))
        )
        .add_service(
            tonic_web::enable(ContactServiceServer::new(contact_service))
        )
        .add_service(
            tonic_web::enable(OfferServiceServer::new(offer_service))
        )
        .serve(addr)
        .await?;

    Ok(())
}
