import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  isMobileMenuOpen: boolean;
  isLoading: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  mobile: {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isTouchDevice: boolean;
    orientation: 'portrait' | 'landscape';
  };
  pwa: {
    isInstalled: boolean;
    canInstall: boolean;
    isOnline: boolean;
    showInstallPrompt: boolean;
  };
}

const initialState: UiState = {
  isMobileMenuOpen: false,
  isLoading: false,
  notifications: [],
  mobile: {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: 'portrait',
  },
  pwa: {
    isInstalled: false,
    canInstall: false,
    isOnline: true,
    showInstallPrompt: false,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },
    closeMobileMenu: (state) => {
      state.isMobileMenuOpen = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<UiState['notifications'][0], 'id' | 'timestamp'>>) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setMobileState: (state, action: PayloadAction<UiState['mobile']>) => {
      state.mobile = action.payload;
    },
    setPWAState: (state, action: PayloadAction<Partial<UiState['pwa']>>) => {
      state.pwa = { ...state.pwa, ...action.payload };
    },
    showInstallPrompt: (state) => {
      state.pwa.showInstallPrompt = true;
    },
    hideInstallPrompt: (state) => {
      state.pwa.showInstallPrompt = false;
    },
  },
});

export const {
  toggleMobileMenu,
  closeMobileMenu,
  setLoading,
  addNotification,
  removeNotification,
  clearNotifications,
  setMobileState,
  setPWAState,
  showInstallPrompt,
  hideInstallPrompt,
} = uiSlice.actions;

export default uiSlice.reducer;