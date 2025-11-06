use sqlx::PgPool;
use tonic::{Request, Response, Status};
use uuid::Uuid;

use crate::db::models::User;
use crate::proto::auth_service_server::AuthService;
use crate::proto::*;
use crate::utils::{jwt, password, validation};

pub struct AuthServiceImpl {
    pool: PgPool,
}

impl AuthServiceImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[tonic::async_trait]
impl AuthService for AuthServiceImpl {
    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<LoginResponse>, Status> {
        let req = request.into_inner();

        // Validate input
        validation::validate_email(&req.email)?;

        // Find user by email
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
            .bind(&req.email)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| Status::internal(format!("Database error: {}", e)))?
            .ok_or_else(|| Status::unauthenticated("Invalid email or password"))?;

        // Verify password
        if !password::verify_password(&req.password, &user.password_hash)? {
            return Err(Status::unauthenticated("Invalid email or password"));
        }

        // Generate tokens
        let access_token = jwt::generate_token(&user.id, 3600)?; // 1 hour
        let refresh_token = jwt::generate_token(&user.id, 86400 * 7)?; // 7 days

        Ok(Response::new(LoginResponse {
            access_token,
            refresh_token,
            user: Some(user.to_proto()),
        }))
    }

    async fn signup(
        &self,
        request: Request<SignupRequest>,
    ) -> Result<Response<SignupResponse>, Status> {
        let req = request.into_inner();

        // Validate input
        validation::validate_email(&req.email)?;
        
        if !password::is_strong_password(&req.password) {
            return Err(Status::invalid_argument(
                "Password must contain uppercase, lowercase, number, and be at least 8 characters",
            ));
        }

        if let Some(ref name) = Some(&req.full_name) {
            if !name.is_empty() {
                validation::validate_name(name)?;
            }
        }

        if let Some(ref phone) = Some(&req.phone) {
            if !phone.is_empty() {
                validation::validate_phone(phone)?;
            }
        }

        // Hash password
        let password_hash = password::hash_password(&req.password)?;

        // Insert user
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (email, password_hash, full_name, phone)
            VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''))
            RETURNING *
            "#,
        )
        .bind(&req.email)
        .bind(&password_hash)
        .bind(&req.full_name)
        .bind(&req.phone)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if e.to_string().contains("unique") || e.to_string().contains("duplicate") {
                Status::already_exists("Email already registered")
            } else {
                Status::internal(format!("Database error: {}", e))
            }
        })?;

        // Generate tokens
        let access_token = jwt::generate_token(&user.id, 3600)?;
        let refresh_token = jwt::generate_token(&user.id, 86400 * 7)?;

        Ok(Response::new(SignupResponse {
            access_token,
            refresh_token,
            user: Some(user.to_proto()),
        }))
    }

    async fn refresh_token(
        &self,
        request: Request<RefreshTokenRequest>,
    ) -> Result<Response<RefreshTokenResponse>, Status> {
        let req = request.into_inner();

        // Validate refresh token
        let claims = jwt::validate_token(&req.refresh_token)?;
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| Status::internal("Invalid user ID in token"))?;

        // Verify user still exists
        let user_exists = sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)")
            .bind(user_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        if !user_exists {
            return Err(Status::unauthenticated("User not found"));
        }

        // Generate new access token
        let access_token = jwt::generate_token(&user_id, 3600)?;

        Ok(Response::new(RefreshTokenResponse { access_token }))
    }

    async fn logout(
        &self,
        _request: Request<LogoutRequest>,
    ) -> Result<Response<LogoutResponse>, Status> {
        // In a stateless JWT system, logout is handled client-side
        // In a production system, you might want to implement token blacklisting
        Ok(Response::new(LogoutResponse { success: true }))
    }

    async fn get_current_user(
        &self,
        request: Request<GetCurrentUserRequest>,
    ) -> Result<Response<GetCurrentUserResponse>, Status> {
        let user_id = jwt::get_user_id_from_request(&request)?;

        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| Status::internal(format!("Database error: {}", e)))?
            .ok_or_else(|| Status::not_found("User not found"))?;

        Ok(Response::new(GetCurrentUserResponse {
            user: Some(user.to_proto()),
        }))
    }
}
