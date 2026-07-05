import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Facilities from './pages/Facilities';
import Maintenance from './pages/Maintenance';
import Assets from './pages/Assets';
import Bookings from './pages/Bookings';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="facilities" element={<Facilities />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="assets" element={<Assets />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
