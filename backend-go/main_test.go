package main

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

func TestJWTFunctions(t *testing.T) {
	secret := []byte("test-secret-key")

	t.Run("CreateAndVerifyToken", func(t *testing.T) {
		claims := jwt.MapClaims{
			"user_id": 1,
			"email":   "test@example.com",
			"exp":     time.Now().Add(time.Hour).Unix(),
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err := token.SignedString(secret)
		assert.NoError(t, err)
		assert.NotEmpty(t, tokenString)

		// Verify token
		parsed, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return secret, nil
		})
		assert.NoError(t, err)
		assert.True(t, parsed.Valid)

		parsedClaims, ok := parsed.Claims.(jwt.MapClaims)
		assert.True(t, ok)
		assert.Equal(t, float64(1), parsedClaims["user_id"])
		assert.Equal(t, "test@example.com", parsedClaims["email"])
	})

	t.Run("ExpiredToken", func(t *testing.T) {
		claims := jwt.MapClaims{
			"user_id": 1,
			"exp":     time.Now().Add(-time.Hour).Unix(),
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err := token.SignedString(secret)
		assert.NoError(t, err)

		// Try to verify expired token
		_, err = jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return secret, nil
		})
		assert.Error(t, err)
	})

	t.Run("InvalidSignature", func(t *testing.T) {
		claims := jwt.MapClaims{"user_id": 1}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte("wrong-secret"))

		// Try to verify with different secret
		_, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return secret, nil
		})
		assert.Error(t, err)
	})
}

func TestPasswordHashing(t *testing.T) {
	t.Run("HashAndVerifyPassword", func(t *testing.T) {
		password := "SecurePassword123!"
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		assert.NoError(t, err)

		// Correct password should verify
		err = bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
		assert.NoError(t, err)

		// Incorrect password should not verify
		err = bcrypt.CompareHashAndPassword(hashedPassword, []byte("WrongPassword"))
		assert.Error(t, err)
	})

	t.Run("DifferentSaltsDifferentHashes", func(t *testing.T) {
		password := "TestPassword123"
		hash1, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		assert.NoError(t, err)

		hash2, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		assert.NoError(t, err)

		// Hashes should be different
		assert.NotEqual(t, string(hash1), string(hash2))

		// But both should verify
		assert.NoError(t, bcrypt.CompareHashAndPassword(hash1, []byte(password)))
		assert.NoError(t, bcrypt.CompareHashAndPassword(hash2, []byte(password)))
	})
}

func TestInputValidation(t *testing.T) {
	t.Run("EmailValidation", func(t *testing.T) {
		validEmails := []string{
			"test@example.com",
			"user.name@domain.co.uk",
			"first+last@test.org",
		}

		invalidEmails := []string{
			"invalid.email",
			"@example.com",
			"test@",
			"test @example.com",
		}

		emailRegex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
		
		for _, email := range validEmails {
			assert.Regexp(t, emailRegex, email, "Email should be valid: %s", email)
		}

		for _, email := range invalidEmails {
			assert.NotRegexp(t, emailRegex, email, "Email should be invalid: %s", email)
		}
	})

	t.Run("PhoneValidation", func(t *testing.T) {
		validPhones := []string{
			"+359888123456",
			"1234567890",
			"+12025551234",
		}

		phoneRegex := `^\+?[1-9]\d{1,14}$`

		for _, phone := range validPhones {
			assert.Regexp(t, phoneRegex, phone, "Phone should be valid: %s", phone)
		}
	})
}
