import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authClient } from "../api/client";
import type { User } from "../gen/api/v1/auth_pb";
import toast from "react-hot-toast";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem("access_token");
        if (token) {
            loadCurrentUser();
        } else {
            setIsLoading(false);
        }
    }, []);

    const loadCurrentUser = async () => {
        try {
            const response = await authClient.getCurrentUser({});
            if (response.user) {
                setUser(response.user);
            }
        } catch (error) {
            console.error("Failed to load current user:", error);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await authClient.login({ email, password });

            if (response.accessToken && response.user) {
                localStorage.setItem("access_token", response.accessToken);
                if (response.refreshToken) {
                    localStorage.setItem("refresh_token", response.refreshToken);
                }
                setUser(response.user);
                toast.success("Успешен вход!");
            }
        } catch (error: any) {
            toast.error(error.message || "Грешка при вход");
            throw error;
        }
    };

    const signup = async (
        email: string,
        password: string,
        fullName: string,
        phone: string
    ) => {
        try {
            const response = await authClient.signup({
                email,
                password,
                fullName,
                phone,
            });

            if (response.accessToken && response.user) {
                localStorage.setItem("access_token", response.accessToken);
                if (response.refreshToken) {
                    localStorage.setItem("refresh_token", response.refreshToken);
                }
                setUser(response.user);
                toast.success("Успешна регистрация!");
            }
        } catch (error: any) {
            toast.error(error.message || "Грешка при регистрация");
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
        toast.success("Успешен изход");
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
