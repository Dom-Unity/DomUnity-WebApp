use chrono::NaiveDate;
use sqlx::PgPool;
use tonic::{Request, Response, Status};

use crate::db::models::{
    OfferRequest as OfferRequestModel, PresentationRequest as PresentationRequestModel,
};
use crate::proto::offer_service_server::OfferService;
use crate::proto::*;
use crate::utils::validation;

pub struct OfferServiceImpl {
    pool: PgPool,
}

impl OfferServiceImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[tonic::async_trait]
impl OfferService for OfferServiceImpl {
    async fn submit_offer(
        &self,
        request: Request<OfferRequest>,
    ) -> Result<Response<OfferResponse>, Status> {
        let req = request.into_inner();

        // Validate input
        validation::validate_phone(&req.phone)?;
        validation::validate_email(&req.email)?;

        if req.city.trim().is_empty() {
            return Err(Status::invalid_argument("City cannot be empty"));
        }

        if req.property_count < 1 {
            return Err(Status::invalid_argument(
                "Property count must be at least 1",
            ));
        }

        if req.address.trim().is_empty() {
            return Err(Status::invalid_argument("Address cannot be empty"));
        }

        if !req.agreed_to_privacy {
            return Err(Status::invalid_argument(
                "You must agree to the privacy policy",
            ));
        }

        // Insert offer request
        let offer = sqlx::query_as::<_, OfferRequestModel>(
            r#"
            INSERT INTO offer_requests 
            (phone, email, city, property_count, address, additional_info, agreed_to_privacy)
            VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7)
            RETURNING *
            "#,
        )
        .bind(&req.phone)
        .bind(&req.email)
        .bind(&req.city)
        .bind(req.property_count)
        .bind(&req.address)
        .bind(&req.additional_info)
        .bind(req.agreed_to_privacy)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Failed to save offer request: {}", e)))?;

        tracing::info!(
            "New offer request from {} for {} properties in {}",
            offer.email,
            offer.property_count,
            offer.city
        );

        // In a real application, you might want to:
        // - Send an email notification to sales team
        // - Send a confirmation email to the customer
        // - Create a ticket in CRM

        Ok(Response::new(OfferResponse {
            success: true,
            message: "Вашата заявка за оферта е получена! Ще се свържем с вас в най-скоро време."
                .to_string(),
            request_id: offer.id.to_string(),
        }))
    }

    async fn request_presentation(
        &self,
        request: Request<PresentationRequest>,
    ) -> Result<Response<PresentationResponse>, Status> {
        let req = request.into_inner();

        // Validate input
        validation::validate_phone(&req.phone)?;
        validation::validate_email(&req.email)?;

        if req.building_type.trim().is_empty() {
            return Err(Status::invalid_argument("Building type cannot be empty"));
        }

        if !req.agreed_to_privacy {
            return Err(Status::invalid_argument(
                "You must agree to the privacy policy",
            ));
        }

        // Parse and validate date
        let presentation_date = NaiveDate::parse_from_str(&req.presentation_date, "%Y-%m-%d")
            .map_err(|_| Status::invalid_argument("Invalid date format. Use YYYY-MM-DD"))?;

        // Check if date is in the future
        let today = chrono::Utc::now().naive_utc().date();
        if presentation_date < today {
            return Err(Status::invalid_argument(
                "Presentation date must be in the future",
            ));
        }

        // Insert presentation request
        let presentation = sqlx::query_as::<_, PresentationRequestModel>(
            r#"
            INSERT INTO presentation_requests 
            (presentation_date, building_type, phone, email, address, agreed_to_privacy)
            VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6)
            RETURNING *
            "#,
        )
        .bind(presentation_date)
        .bind(&req.building_type)
        .bind(&req.phone)
        .bind(&req.email)
        .bind(&req.address)
        .bind(req.agreed_to_privacy)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Failed to save presentation request: {}", e)))?;

        tracing::info!(
            "New presentation request from {} for {} on {}",
            presentation.email,
            presentation.building_type,
            presentation.presentation_date
        );

        // In a real application, you might want to:
        // - Send calendar invite
        // - Send confirmation email
        // - Notify the presentation team

        Ok(Response::new(PresentationResponse {
            success: true,
            message: format!(
                "Вашата заявка за презентация на {} е потвърдена!",
                presentation.presentation_date
            ),
            request_id: presentation.id.to_string(),
        }))
    }
}
