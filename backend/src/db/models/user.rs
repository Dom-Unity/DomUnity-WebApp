use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub phone: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl User {
    /// Convert to proto User (without sensitive data)
    pub fn to_proto(&self) -> crate::proto::User {
        crate::proto::User {
            id: self.id.to_string(),
            email: self.email.clone(),
            full_name: self.full_name.clone().unwrap_or_default(),
            phone: self.phone.clone().unwrap_or_default(),
            created_at: self.created_at.to_rfc3339(),
        }
    }
}
