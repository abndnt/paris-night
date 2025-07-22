import React from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import SystemHealth from '../../components/Admin/SystemHealth';

const AdminSystemHealth: React.FC = () => {
  return (
    <AdminLayout>
      <SystemHealth />
    </AdminLayout>
  );
};

export default AdminSystemHealth;