use sqlx::PgPool;
use tonic::{Request, Response, Status};

use crate::db::models::{ContactSubmission, NewsletterSubscription};
use crate::proto::contact_service_server::ContactService;
use crate::proto::*;
use crate::utils::validation;

pub struct ContactServiceImpl {
    pool: PgPool,
}

impl ContactServiceImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[tonic::async_trait]
impl ContactService for ContactServiceImpl {
    async fn submit_contact(
        &self,
        request: Request<ContactRequest>,
    ) -> Result<Response<ContactResponse>, Status> {
        let req = request.into_inner();

        // Validate input
        validation::validate_name(&req.name)?;
        validation::validate_phone(&req.phone)?;
        validation::validate_email(&req.email)?;

        if req.message.trim().is_empty() {
            return Err(Status::invalid_argument("Message cannot be empty"));
        }

        if req.message.len() > 5000 {
            return Err(Status::invalid_argument("Message is too long (max 5000 characters)"));
        }

        // Insert contact submission
        let submission = sqlx::query_as::<_, ContactSubmission>(
            r#"
            INSERT INTO contact_submissions (name, phone, email, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(&req.name)
        .bind(&req.phone)
        .bind(&req.email)
        .bind(&req.message)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Failed to save contact submission: {}", e)))?;

        tracing::info!(
            "New contact submission from {} ({})",
            submission.name,
            submission.email
        );

        // In a real application, you might want to:
        // - Send an email notification to the company
        // - Send a confirmation email to the user
        // - Add to a CRM system

        Ok(Response::new(ContactResponse {
            success: true,
            message: "Вашето съобщение е изпратено успешно! Ще се свържем с вас скоро.".to_string(),
            submission_id: submission.id.to_string(),
        }))
    }

    async fn subscribe_newsletter(
        &self,
        request: Request<NewsletterRequest>,
    ) -> Result<Response<NewsletterResponse>, Status> {
        let req = request.into_inner();

        // Validate email
        validation::validate_email(&req.email)?;

        // Try to insert, or reactivate if already exists
        let result = sqlx::query_as::<_, NewsletterSubscription>(
            r#"
            INSERT INTO newsletter_subscriptions (email, is_active)
            VALUES ($1, true)
            ON CONFLICT (email) 
            DO UPDATE SET is_active = true, subscribed_at = NOW()
            RETURNING *
            "#,
        )
        .bind(&req.email)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Failed to subscribe to newsletter: {}", e)))?;

        tracing::info!("New newsletter subscription: {}", result.email);

        // In a real application, you might want to:
        // - Send a confirmation email
        // - Integrate with an email marketing service (Mailchimp, SendGrid, etc.)

        Ok(Response::new(NewsletterResponse {
            success: true,
            message: "Успешно се абонирахте за нашия бюлетин!".to_string(),
        }))
    }
}
