use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use tonic::{Request, Status};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // User ID
    pub exp: i64,    // Expiration time
    pub iat: i64,    // Issued at
}

/// Generate a JWT token for a user
pub fn generate_token(user_id: &Uuid, expires_in_secs: i64) -> Result<String, Status> {
    let secret =
        std::env::var("JWT_SECRET").map_err(|_| Status::internal("JWT_SECRET not configured"))?;

    if secret.len() < 32 {
        return Err(Status::internal(
            "JWT_SECRET must be at least 32 characters",
        ));
    }

    let now = Utc::now();
    let expiration = now + Duration::seconds(expires_in_secs);

    let claims = Claims {
        sub: user_id.to_string(),
        exp: expiration.timestamp(),
        iat: now.timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|e| Status::internal(format!("Failed to generate token: {}", e)))
}

/// Validate a JWT token and extract claims
pub fn validate_token(token: &str) -> Result<Claims, Status> {
    let secret =
        std::env::var("JWT_SECRET").map_err(|_| Status::internal("JWT_SECRET not configured"))?;

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| Status::unauthenticated(format!("Invalid token: {}", e)))
}

/// Extract user ID from authorization header
pub fn get_user_id_from_request<T>(request: &Request<T>) -> Result<Uuid, Status> {
    let auth_header = request
        .metadata()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| Status::unauthenticated("Missing authorization header"))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| Status::unauthenticated("Invalid authorization header format"))?;

    let claims = validate_token(token)?;

    Uuid::parse_str(&claims.sub).map_err(|_| Status::internal("Invalid user ID in token"))
}
