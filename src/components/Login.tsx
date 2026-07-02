import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { Lock, User as UserIcon, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface LoginProps {
  onLoginSuccess: (role: 'admin' | 'user') => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both fields');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || `HTTP error ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user);
      onLoginSuccess(data.user.role);
    } catch (err: any) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" id="login-container" className="flex items-center justify-center min-h-screen py-12">
      <Card id="login-card" className="w-full shadow-lg border border-slate-200">
        <CardContent className="p-8">
          <Box className="flex flex-col items-center mb-6">
            <Box className="bg-blue-600 text-white p-3.5 rounded-xl mb-3 flex items-center justify-center shadow-md shadow-blue-100">
              <LogIn size={28} />
            </Box>
            <Typography variant="h5" align="center" id="login-title" className="font-bold text-slate-900">
              PrepQues Revision
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center" className="mt-1">
              Sign in to manage questions or revise
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" className="mb-4 text-xs" id="login-error-alert">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              id="login-username-input"
              label="Username"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <UserIcon size={18} className="text-slate-400" />
                    </InputAdornment>
                  ),
                },
              }}
              disabled={loading}
              placeholder="e.g. admin or user"
            />

            <TextField
              id="login-password-input"
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} className="text-slate-400" />
                    </InputAdornment>
                  ),
                },
              }}
              disabled={loading}
              placeholder="e.g. admin123 or user123"
            />

            <Button
              id="login-submit-button"
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              className="mt-6 py-3 bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm font-semibold rounded-lg"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>

          <Box className="mt-6 p-3 bg-slate-50 rounded border border-slate-200">
            <Typography variant="caption" color="textSecondary" component="div" className="font-medium text-slate-700">
              Demo Credentials:
            </Typography>
            <Typography variant="caption" color="textSecondary" component="div">
              • Admin: <strong>admin</strong> / <strong>admin123</strong>
            </Typography>
            <Typography variant="caption" color="textSecondary" component="div">
              • User: <strong>user</strong> / <strong>user123</strong>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
