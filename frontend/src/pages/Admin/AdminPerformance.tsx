import React from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import PerformanceMonitoring from '../../components/Admin/PerformanceMonitoring';

const AdminPerformance: React.FC = () => {
  return (
    <AdminLayout>
      <PerformanceMonitoring />
    </AdminLayout>
  );
};

export default AdminPerformance;