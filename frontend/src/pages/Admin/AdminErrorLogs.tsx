import React from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import ErrorLogs from '../../components/Admin/ErrorLogs';

const AdminErrorLogs: React.FC = () => {
  return (
    <AdminLayout>
      <ErrorLogs />
    </AdminLayout>
  );
};

export default AdminErrorLogs;