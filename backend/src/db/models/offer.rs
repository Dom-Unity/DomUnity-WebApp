use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OfferRequest {
    pub id: Uuid,
    pub phone: String,
    pub email: String,
    pub city: String,
    pub property_count: i32,
    pub address: String,
    pub additional_info: Option<String>,
    pub agreed_to_privacy: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PresentationRequest {
    pub id: Uuid,
    pub presentation_date: NaiveDate,
    pub building_type: String,
    pub phone: String,
    pub email: String,
    pub address: Option<String>,
    pub agreed_to_privacy: bool,
    pub created_at: DateTime<Utc>,
}
