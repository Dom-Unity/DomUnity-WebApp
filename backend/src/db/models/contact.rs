use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ContactSubmission {
    pub id: Uuid,
    pub name: String,
    pub phone: String,
    pub email: String,
    pub message: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewsletterSubscription {
    pub id: Uuid,
    pub email: String,
    pub subscribed_at: DateTime<Utc>,
    pub is_active: bool,
}
