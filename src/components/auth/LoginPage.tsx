import React, { useState } from "react";
import PenguinLogo from "../../assets/penguin-logo.svg";
import Penguin from "../../assets/Penguinai-name.png";
import type { AuthCredentials } from "../../types";

interface LoginPageProps {
  credentials: AuthCredentials;
  setCredentials: (credentials: AuthCredentials) => void;
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  credentials,
  setCredentials,
  onLogin,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      const success = await onLogin(credentials.username, credentials.password);

      if (!success) {
        setError("Invalid username or password. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Login failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof AuthCredentials, value: string) => {
    setCredentials({ ...credentials, [field]: value });
    // Clear error when user starts typing
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-30 h-16  rounded-full flex items-center justify-center mb-4">
            <div
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <img
                style={{ width: "25px", marginBottom: "5px" }}
                src={PenguinLogo}
              ></img>
              <img
                style={{
                  width: "150px",
                  height: "100%",
                  marginTop: "10px",
                  marginLeft: "10px",
                }}
                src={Penguin}
              ></img>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Oasis Scrubbing Platform
          </h1>
          {/* <p className="text-gray-600 mt-2 font-medium">AI-Powered Medical Coding Platform</p> */}
        </div>

        {/* Login Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xs">!</span>
              </div>
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                placeholder="Enter your username"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                placeholder="Enter your password"
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 ${
                isLoading
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p className="font-medium">© 2025 Penguin AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
