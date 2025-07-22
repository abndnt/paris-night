import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
} from '../slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  it('should handle loginStart', () => {
    const actual = authReducer(initialState, loginStart());
    expect(actual.isLoading).toBe(true);
    expect(actual.error).toBe(null);
  });

  it('should handle loginSuccess', () => {
    const user = { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' };
    const token = 'mock-token';
    
    const actual = authReducer(initialState, loginSuccess({ user, token }));
    
    expect(actual.isLoading).toBe(false);
    expect(actual.isAuthenticated).toBe(true);
    expect(actual.user).toEqual(user);
    expect(actual.token).toBe(token);
    expect(actual.error).toBe(null);
  });

  it('should handle loginFailure', () => {
    const errorMessage = 'Invalid credentials';
    
    const actual = authReducer(initialState, loginFailure(errorMessage));
    
    expect(actual.isLoading).toBe(false);
    expect(actual.isAuthenticated).toBe(false);
    expect(actual.user).toBe(null);
    expect(actual.token).toBe(null);
    expect(actual.error).toBe(errorMessage);
  });

  it('should handle logout', () => {
    const loggedInState = {
      user: { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
    
    const actual = authReducer(loggedInState, logout());
    
    expect(actual.isAuthenticated).toBe(false);
    expect(actual.user).toBe(null);
    expect(actual.token).toBe(null);
    expect(actual.error).toBe(null);
  });

  it('should handle clearError', () => {
    const stateWithError = {
      ...initialState,
      error: 'Some error message',
    };
    
    const actual = authReducer(stateWithError, clearError());
    
    expect(actual.error).toBe(null);
  });
});