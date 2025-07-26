import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Rewards from './pages/Rewards';
import Booking from './pages/Booking';
import Bookings from './pages/Bookings';
import BookingDetail from './pages/BookingDetail';
import BookingModify from './pages/BookingModify';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminErrorLogs from './pages/Admin/AdminErrorLogs';
import AdminPerformance from './pages/Admin/AdminPerformance';
import AdminSystemHealth from './pages/Admin/AdminSystemHealth';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AdminRoute from './components/Auth/AdminRoute';
import NotificationContainer from './components/UI/NotificationContainer';
import PWAInstallPrompt from './components/PWA/PWAInstallPrompt';
import OfflineIndicator from './components/PWA/OfflineIndicator';
import useResponsiveLayout from './hooks/useResponsiveLayout';
import useOfflineDetection from './hooks/useOfflineDetection';
import { RootState } from './store/store';
import { showInstallPrompt } from './store/slices/uiSlice';

function App() {
  const dispatch = useDispatch();
  const { isOnline } = useSelector((state: RootState) => state.ui.pwa);
  
  // Initialize responsive layout detection
  useResponsiveLayout();
  
  // Initialize offline detection
  useOfflineDetection();
  
  // Show install prompt after a delay if conditions are met
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!sessionStorage.getItem('pwa-install-dismissed')) {
        dispatch(showInstallPrompt());
      }
    }, 30000); // Show after 30 seconds
    
    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <div className="App">
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<Search />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/rewards" 
            element={
              <ProtectedRoute>
                <Rewards />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/booking" 
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/bookings" 
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/booking/:bookingId" 
            element={
              <ProtectedRoute>
                <BookingDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/booking/:bookingId/modify" 
            element={
              <ProtectedRoute>
                <BookingModify />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/errors" 
            element={
              <AdminRoute>
                <AdminErrorLogs />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/performance" 
            element={
              <AdminRoute>
                <AdminPerformance />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/health" 
            element={
              <AdminRoute>
                <AdminSystemHealth />
              </AdminRoute>
            } 
          />
        </Routes>
      </Layout>
      <NotificationContainer />
      <PWAInstallPrompt />
      {!isOnline && <OfflineIndicator />}
    </div>
  );
}

export default App;