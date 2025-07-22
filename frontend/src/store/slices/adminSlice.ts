import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnalyticsDashboardData, ErrorAnalytics, PerformanceMetric, UserActivity } from '../../../src/models/Analytics';
import { RootState } from '../store';
import api from '../../services/api';

interface AdminState {
  dashboardData: AnalyticsDashboardData | null;
  errorLogs: ErrorAnalytics[];
  userActivity: UserActivity[];
  performanceMetrics: PerformanceMetric[];
  systemHealth: {
    status: 'healthy' | 'degraded' | 'down';
    components: {
      database: { healthy: boolean; responseTime?: number; message?: string; error?: string };
      cache: { healthy: boolean; responseTime?: number; message?: string; error?: string };
      externalApis: { 
        healthy: boolean; 
        services?: Array<{ name: string; status: string; responseTime: number }>;
        error?: string;
        message?: string;
      };
    };
    timestamp: string;
  } | null;
  loading: {
    dashboard: boolean;
    errors: boolean;
    userActivity: boolean;
    performance: boolean;
    systemHealth: boolean;
  };
  error: {
    dashboard: string | null;
    errors: string | null;
    userActivity: string | null;
    performance: string | null;
    systemHealth: string | null;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const initialState: AdminState = {
  dashboardData: null,
  errorLogs: [],
  userActivity: [],
  performanceMetrics: [],
  systemHealth: null,
  loading: {
    dashboard: false,
    errors: false,
    userActivity: false,
    performance: false,
    systemHealth: false,
  },
  error: {
    dashboard: null,
    errors: null,
    userActivity: null,
    performance: null,
    systemHealth: null,
  },
  dateRange: {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // today
  },
};

// Async thunks
export const fetchDashboardData = createAsyncThunk(
  'admin/fetchDashboardData',
  async (dateRange: { startDate: string; endDate: string }, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/analytics/dashboard', {
        params: dateRange,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard data');
    }
  }
);

export const fetchErrorLogs = createAsyncThunk(
  'admin/fetchErrorLogs',
  async (params: { startDate?: string; endDate?: string; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/analytics/errors', {
        params,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch error logs');
    }
  }
);

export const updateErrorResolution = createAsyncThunk(
  'admin/updateErrorResolution',
  async (
    { errorId, resolved, notes }: { errorId: number; resolved: boolean; notes?: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      await api.put(`/admin/analytics/errors/${errorId}`, {
        resolved,
        notes,
      });
      
      // Refresh error logs after update
      dispatch(fetchErrorLogs({}));
      
      return { errorId, resolved, notes };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update error resolution');
    }
  }
);

export const fetchUserActivity = createAsyncThunk(
  'admin/fetchUserActivity',
  async (
    { userId, page, limit }: { userId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get(`/admin/analytics/user-activity/${userId}`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch user activity');
    }
  }
);

export const fetchPerformanceMetrics = createAsyncThunk(
  'admin/fetchPerformanceMetrics',
  async (
    {
      metricName,
      component,
      startDate,
      endDate,
    }: {
      metricName: string;
      component: string;
      startDate?: string;
      endDate?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get('/admin/analytics/performance', {
        params: {
          metricName,
          component,
          startDate,
          endDate,
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch performance metrics');
    }
  }
);

export const fetchSystemHealth = createAsyncThunk(
  'admin/fetchSystemHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/system/health');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch system health');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setDateRange(state, action: PayloadAction<{ startDate: string; endDate: string }>) {
      state.dateRange = action.payload;
    },
    clearErrors(state) {
      state.error = {
        dashboard: null,
        errors: null,
        userActivity: null,
        performance: null,
        systemHealth: null,
      };
    },
  },
  extraReducers: (builder) => {
    // Dashboard data
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading.dashboard = true;
        state.error.dashboard = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading.dashboard = false;
        state.dashboardData = action.payload;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading.dashboard = false;
        state.error.dashboard = action.payload as string;
      });

    // Error logs
    builder
      .addCase(fetchErrorLogs.pending, (state) => {
        state.loading.errors = true;
        state.error.errors = null;
      })
      .addCase(fetchErrorLogs.fulfilled, (state, action) => {
        state.loading.errors = false;
        state.errorLogs = action.payload;
      })
      .addCase(fetchErrorLogs.rejected, (state, action) => {
        state.loading.errors = false;
        state.error.errors = action.payload as string;
      });

    // User activity
    builder
      .addCase(fetchUserActivity.pending, (state) => {
        state.loading.userActivity = true;
        state.error.userActivity = null;
      })
      .addCase(fetchUserActivity.fulfilled, (state, action) => {
        state.loading.userActivity = false;
        state.userActivity = action.payload;
      })
      .addCase(fetchUserActivity.rejected, (state, action) => {
        state.loading.userActivity = false;
        state.error.userActivity = action.payload as string;
      });

    // Performance metrics
    builder
      .addCase(fetchPerformanceMetrics.pending, (state) => {
        state.loading.performance = true;
        state.error.performance = null;
      })
      .addCase(fetchPerformanceMetrics.fulfilled, (state, action) => {
        state.loading.performance = false;
        state.performanceMetrics = action.payload;
      })
      .addCase(fetchPerformanceMetrics.rejected, (state, action) => {
        state.loading.performance = false;
        state.error.performance = action.payload as string;
      });

    // System health
    builder
      .addCase(fetchSystemHealth.pending, (state) => {
        state.loading.systemHealth = true;
        state.error.systemHealth = null;
      })
      .addCase(fetchSystemHealth.fulfilled, (state, action) => {
        state.loading.systemHealth = false;
        state.systemHealth = action.payload;
      })
      .addCase(fetchSystemHealth.rejected, (state, action) => {
        state.loading.systemHealth = false;
        state.error.systemHealth = action.payload as string;
      });
  },
});

export const { setDateRange, clearErrors } = adminSlice.actions;

// Selectors
export const selectDashboardData = (state: RootState) => state.admin.dashboardData;
export const selectErrorLogs = (state: RootState) => state.admin.errorLogs;
export const selectUserActivity = (state: RootState) => state.admin.userActivity;
export const selectPerformanceMetrics = (state: RootState) => state.admin.performanceMetrics;
export const selectSystemHealth = (state: RootState) => state.admin.systemHealth;
export const selectAdminLoading = (state: RootState) => state.admin.loading;
export const selectAdminErrors = (state: RootState) => state.admin.error;
export const selectDateRange = (state: RootState) => state.admin.dateRange;

export default adminSlice.reducer;