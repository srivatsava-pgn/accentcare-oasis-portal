import React, { useEffect } from "react";
import { LoginPage } from "./components/auth/LoginPage";
import Dashboard from "./components/Dashboard";
import { useAuth } from "./hooks/useAuth";
import { setApiToken } from "./services/api";

const App: React.FC = () => {
  const {
    isLoggedIn,
    accessToken,
    user,
    credentials,
    setCredentials,
    login,
    logout,
    initializeAuth,
  } = useAuth();

  // Initialize authentication on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set API token whenever it changes
  useEffect(() => {
    if (accessToken) {
      setApiToken(accessToken);
    }
  }, [accessToken]);

  // Handle login
  const handleLogin = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    const success = await login(username, password);
    return success;
  };

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Render login page if not authenticated
  if (!isLoggedIn) {
    return (
      <LoginPage
        credentials={credentials}
        setCredentials={setCredentials}
        onLogin={handleLogin}
      />
    );
  }

  // Render dashboard if authenticated
  return <Dashboard handleLogout={handleLogout} />;
};

export default App;
