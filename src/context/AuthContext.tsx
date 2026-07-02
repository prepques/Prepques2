import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types.js';

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('smart_revision_token');
    const savedUser = localStorage.getItem('smart_revision_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('smart_revision_token', newToken);
    localStorage.setItem('smart_revision_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('smart_revision_token');
    localStorage.removeItem('smart_revision_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('smart_revision_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
