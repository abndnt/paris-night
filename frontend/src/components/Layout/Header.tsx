import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { toggleMobileMenu, closeMobileMenu } from '../../store/slices/uiSlice';

const Header: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { isMobileMenuOpen } = useSelector((state: RootState) => state.ui);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(closeMobileMenu());
    navigate('/');
  };

  const handleMobileMenuToggle = () => {
    dispatch(toggleMobileMenu());
  };

  const handleLinkClick = () => {
    dispatch(closeMobileMenu());
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="text-xl font-bold text-primary-600"
            onClick={handleLinkClick}
          >
            FlightSearch
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Home
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link 
                  to="/bookings" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  My Bookings
                </Link>
                <Link 
                  to="/rewards" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Rewards
                </Link>
                <Link 
                  to="/profile" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Profile
                </Link>
                <span className="text-gray-500">
                  Welcome, {user?.firstName}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={handleMobileMenuToggle}
            aria-label="Toggle mobile menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-primary-600 transition-colors"
                onClick={handleLinkClick}
              >
                Home
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/bookings" 
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={handleLinkClick}
                  >
                    My Bookings
                  </Link>
                  <Link 
                    to="/rewards" 
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={handleLinkClick}
                  >
                    Rewards
                  </Link>
                  <Link 
                    to="/profile" 
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={handleLinkClick}
                  >
                    Profile
                  </Link>
                  <span className="text-gray-500">
                    Welcome, {user?.firstName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary w-fit"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={handleLinkClick}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="btn-primary w-fit"
                    onClick={handleLinkClick}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;