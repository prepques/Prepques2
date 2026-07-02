import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import theme from './theme.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Login } from './components/Login.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { UserDashboard } from './components/UserDashboard.js';

function DashboardRouter() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <Box className="flex items-center justify-center min-h-screen bg-slate-50" id="global-spinner">
        <CircularProgress size={48} color="primary" />
      </Box>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard onLogout={logout} />;
  }

  return <UserDashboard onLogout={logout} />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <DashboardRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
