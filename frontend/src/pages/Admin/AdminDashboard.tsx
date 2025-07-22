import React from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import Dashboard from '../../components/Admin/Dashboard';

const AdminDashboard: React.FC = () => {
  return (
    <AdminLayout>
      <Dashboard />
    </AdminLayout>
  );
};

export default AdminDashboard;