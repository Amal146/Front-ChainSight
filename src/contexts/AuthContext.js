// src/contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add this validation function
  const validateToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      const isExpired = decoded.exp * 1000 < Date.now();
      return { valid: !isExpired, decoded };
    } catch (error) {
      return { valid: false, error };
    }
  };

  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem('token');
      const wallet = localStorage.getItem('walletAddress');

      if (token) {
        const { valid, decoded } = validateToken(token);
        if (valid) {
          setUser({ token, decoded });
        } else {
          logout();
        }
      } else if (wallet) {
        setUser({ walletAddress: wallet });
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const loginWithCredentials = (token) => {
    const { valid, decoded } = validateToken(token);
    if (!valid) {
      throw new Error('Invalid token');
    }
    localStorage.setItem('token', token);
    setUser({ token, decoded });
  };

  const loginWithWallet = (walletAddress) => {
    localStorage.setItem('walletAddress', walletAddress);
    setUser({ walletAddress });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('walletAddress');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithCredentials,
        loginWithWallet,
        logout,
        isAuthenticated: () => !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}