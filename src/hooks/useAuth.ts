import { useState } from "react";
import { loginUser } from "../services/api";
import type { AuthCredentials } from "../types";

interface AuthState {
  isLoggedIn: boolean;
  accessToken: string | null;
  user: {
    username: string;
    roles: string[];
  } | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    accessToken: null,
    user: null,
  });

  const [credentials, setCredentials] = useState<AuthCredentials>({
    username: "",
    password: "",
  });

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      // Use the loginUser API instead of direct fetch
      const data = await loginUser(username, password);

      if (data.access_token) {
        // Decode JWT to get user info (basic decode, not verification)
        const tokenPayload = JSON.parse(atob(data.access_token.split(".")[1]));

        setAuthState({
          isLoggedIn: true,
          accessToken: data.access_token,
          user: {
            username: tokenPayload.username,
            roles: tokenPayload.roles || [],
          },
        });

        // Store user data in localStorage for persistence
        // Note: Token is already stored by setApiToken in loginUser function
        localStorage.setItem(
          "user_data",
          JSON.stringify({
            username: tokenPayload.username,
            roles: tokenPayload.roles || [],
          })
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    setAuthState({
      isLoggedIn: false,
      accessToken: null,
      user: null,
    });
    setCredentials({ username: "", password: "" });

    // Clear stored data
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
  };

  // Initialize auth state from localStorage on app start
  const initializeAuth = () => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");

    if (token && userData) {
      try {
        // Check if token is expired
        const tokenPayload = JSON.parse(atob(token.split(".")[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        if (tokenPayload.exp && tokenPayload.exp > currentTime) {
          setAuthState({
            isLoggedIn: true,
            accessToken: token,
            user: JSON.parse(userData),
          });
        } else {
          // Token expired, clear storage
          logout();
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        logout();
      }
    }
  };

  return {
    isLoggedIn: authState.isLoggedIn,
    accessToken: authState.accessToken,
    user: authState.user,
    credentials,
    setCredentials,
    login,
    logout,
    initializeAuth,
  };
};
