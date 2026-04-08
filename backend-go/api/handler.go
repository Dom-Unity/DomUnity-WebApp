package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/domunity/backend-go/db"
	pb "github.com/domunity/backend-go/proto"
	"github.com/domunity/backend-go/services"
	"github.com/golang-jwt/jwt/v5"
)

type APIHandler struct {
	DB              *db.Database
	AuthService     *services.AuthService
	UserService     *services.UserService
	BuildingService *services.BuildingService
	ContactService  *services.ContactService
}

func (h *APIHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	path := r.URL.Path
	switch {
	case path == "/health":
		h.handleHealth(w, r)
	case path == "/api/auth/login" && r.Method == "POST":
		h.handleLogin(w, r)
	case path == "/api/auth/register" && r.Method == "POST":
		h.handleRegister(w, r)
	case path == "/api/auth/refresh" && r.Method == "POST":
		h.handleRefresh(w, r)
	case path == "/api/user/profile" && r.Method == "GET":
		h.handleGetProfile(w, r)
	case path == "/api/contact/form" && r.Method == "POST":
		h.handleContactForm(w, r)
	case path == "/api/contact/offer" && r.Method == "POST":
		h.handleOffer(w, r)
	case path == "/api/contact/presentation" && r.Method == "POST":
		h.handlePresentation(w, r)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

func (h *APIHandler) handleHealth(w http.ResponseWriter, r *http.Request) {
	dbStatus := "connected"
	if err := h.DB.Pool.Ping(r.Context()); err != nil {
		dbStatus = fmt.Sprintf("error: %v", err)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"database":  dbStatus,
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "domunity-backend-go",
		"version":   "1.0.0",
	})
}

func (h *APIHandler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req pb.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.AuthService.Login(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	status := http.StatusOK
	if !res.Success {
		status = http.StatusUnauthorized
	}
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(res)
}

func (h *APIHandler) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req pb.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.AuthService.Register(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	status := http.StatusCreated
	if !res.Success {
		status = http.StatusBadRequest
	}
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(res)
}

func (h *APIHandler) handleRefresh(w http.ResponseWriter, r *http.Request) {
	var req pb.RefreshTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.AuthService.RefreshToken(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !res.Success {
		w.WriteHeader(http.StatusUnauthorized)
	}
	json.NewEncoder(w).Encode(res)
}

func (h *APIHandler) handleGetProfile(w http.ResponseWriter, r *http.Request) {
	userID := h.getUserIDFromToken(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	res, err := h.UserService.GetProfile(r.Context(), &pb.GetProfileRequest{UserId: userID})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(res)
}

func (h *APIHandler) handleContactForm(w http.ResponseWriter, r *http.Request) {
	var req pb.ContactFormRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.ContactService.SendContactForm(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(res)
}

func (h *APIHandler) handleOffer(w http.ResponseWriter, r *http.Request) {
	var req pb.OfferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.ContactService.RequestOffer(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(res)
}

func (h *APIHandler) handlePresentation(w http.ResponseWriter, r *http.Request) {
	var req pb.PresentationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.ContactService.RequestPresentation(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(res)
}

func (h *APIHandler) getUserIDFromToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return ""
	}

	tokenString := authHeader[7:]
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return services.JWTSecret, nil
	})

	if err != nil || !token.Valid {
		return ""
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		if userID, ok := claims["user_id"]; ok {
			return strconv.Itoa(int(userID.(float64)))
		}
	}

	return ""
}
