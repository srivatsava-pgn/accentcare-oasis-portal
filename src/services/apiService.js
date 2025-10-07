import axios from "axios";

const baseUrls = {
  development: "https://dev-api.penguinai.co/accentcarecoding/oasis-scrubbing",
  production: "https://acc-icdbackend.penguinai.co",
};
export const API_BASE_URL =
  baseUrls[import.meta.env.VITE_NODE_ENV || "development"];

// Create axios instance
export const API = axios.create({
  baseURL: API_BASE_URL,
});

// Logout function
function logoutUser() {
  // Clear stored tokens
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  sessionStorage.removeItem("token");

  // Redirect to logout or login page
  window.location.href = "/";
}

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage first, then sessionStorage
    const access_token =
      localStorage.getItem("auth_token") || sessionStorage.getItem("token");

    if (access_token) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log("Authentication failed or expired, redirecting to login");
      logoutUser();
    }

    // Handle new error format with 'detail' field
    if (error.response && error.response.data && error.response.data.detail) {
      error.message = error.response.data.detail;
    }

    return Promise.reject(error);
  }
);
