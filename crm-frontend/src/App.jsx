import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/LeadsList';
import LeadDetail from './pages/LeadDetail';
import Tasks from './pages/Tasks';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Deals from './pages/Deals';
import DealDetail from './pages/DealDetail';
import Products from './pages/Products';
import CourseDetail from './pages/CourseDetail';
import Analytics from './pages/Analytics';
import Templates from './pages/Templates';
import Documents from './pages/Documents';
import BotAdmin from './pages/BotAdmin';
import Chat from './pages/Chat';
import Permissions from './pages/Permissions';
import UsersManagement from './pages/UsersManagement';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout><Dashboard /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <PrivateRoute>
                <Layout><LeadsList /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/leads/:id"
            element={
              <PrivateRoute>
                <Layout><LeadDetail /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <PrivateRoute>
                <Layout><Tasks /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/students"
            element={
              <PrivateRoute>
                <Layout><Students /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <PrivateRoute>
                <Layout><StudentDetail /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/deals"
            element={
              <PrivateRoute>
                <Layout><Deals /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/deals/:id"
            element={
              <PrivateRoute>
                <Layout><DealDetail /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateRoute>
                <Layout><Products /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/products/courses/:id"
            element={
              <PrivateRoute>
                <Layout><CourseDetail /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Layout><Analytics /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <PrivateRoute>
                <Layout><Templates /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <PrivateRoute>
                <Layout><Documents /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/bot-admin"
            element={
              <PrivateRoute>
                <Layout><BotAdmin /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Layout><Chat /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/permissions"
            element={
              <PrivateRoute>
                <Layout><Permissions /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/users-management"
            element={
              <PrivateRoute>
                <Layout><UsersManagement /></Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

