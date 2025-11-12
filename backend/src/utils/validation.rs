// Allow large error types since tonic::Status is a third-party type we can't control
#![allow(clippy::result_large_err)]

use regex::Regex;
use tonic::Status;

/// Validate email format
pub fn validate_email(email: &str) -> Result<(), Status> {
    let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();

    if email_regex.is_match(email) {
        Ok(())
    } else {
        Err(Status::invalid_argument("Invalid email format"))
    }
}

/// Validate phone number (basic validation)
pub fn validate_phone(phone: &str) -> Result<(), Status> {
    if phone.trim().is_empty() {
        return Err(Status::invalid_argument("Phone number cannot be empty"));
    }

    // Remove spaces and common separators
    let cleaned = phone.replace(&[' ', '-', '(', ')', '+'][..], "");

    if cleaned.len() < 9 || cleaned.len() > 15 {
        return Err(Status::invalid_argument(
            "Phone number must be between 9 and 15 digits",
        ));
    }

    if !cleaned.chars().all(|c| c.is_ascii_digit()) {
        return Err(Status::invalid_argument(
            "Phone number can only contain digits",
        ));
    }

    Ok(())
}

/// Validate name (minimum 5 characters as per requirements)
pub fn validate_name(name: &str) -> Result<(), Status> {
    let trimmed = name.trim();

    if trimmed.len() < 5 {
        return Err(Status::invalid_argument(
            "Name must be at least 5 characters",
        ));
    }

    if trimmed.len() > 255 {
        return Err(Status::invalid_argument(
            "Name must be less than 255 characters",
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(validate_email("test@example.com").is_ok());
        assert!(validate_email("user.name+tag@example.co.uk").is_ok());
        assert!(validate_email("invalid.email").is_err());
        assert!(validate_email("@example.com").is_err());
    }

    #[test]
    fn test_phone_validation() {
        assert!(validate_phone("0888440107").is_ok());
        assert!(validate_phone("+359 88 844 0107").is_ok());
        assert!(validate_phone("123").is_err()); // Too short
    }

    #[test]
    fn test_name_validation() {
        assert!(validate_name("John Doe").is_ok());
        assert!(validate_name("Test").is_err()); // Too short
    }
}
