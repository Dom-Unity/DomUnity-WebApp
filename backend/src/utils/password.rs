// Allow large error types since tonic::Status is a third-party type we can't control
#![allow(clippy::result_large_err)]

use bcrypt::{hash, verify, DEFAULT_COST};
use regex::Regex;
use tonic::Status;

/// Hash a password using bcrypt
pub fn hash_password(password: &str) -> Result<String, Status> {
    hash(password, DEFAULT_COST)
        .map_err(|e| Status::internal(format!("Failed to hash password: {}", e)))
}

/// Verify a password against a hash
pub fn verify_password(password: &str, hash: &str) -> Result<bool, Status> {
    verify(password, hash)
        .map_err(|e| Status::internal(format!("Failed to verify password: {}", e)))
}

/// Check if a password meets strength requirements:
/// - At least 8 characters
/// - Contains uppercase letter
/// - Contains lowercase letter
/// - Contains digit
pub fn is_strong_password(password: &str) -> bool {
    if password.len() < 8 {
        return false;
    }

    let has_uppercase = Regex::new(r"[A-Z]").unwrap().is_match(password);
    let has_lowercase = Regex::new(r"[a-z]").unwrap().is_match(password);
    let has_digit = Regex::new(r"\d").unwrap().is_match(password);

    has_uppercase && has_lowercase && has_digit
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_strength() {
        assert!(is_strong_password("Password123"));
        assert!(!is_strong_password("password123")); // No uppercase
        assert!(!is_strong_password("PASSWORD123")); // No lowercase
        assert!(!is_strong_password("Password")); // No digit
        assert!(!is_strong_password("Pass1")); // Too short
    }
}
