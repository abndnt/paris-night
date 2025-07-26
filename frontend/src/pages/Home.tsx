import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const Home: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Smart Flight Search with{' '}
          <span className="text-primary-600">AI & Points</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Find the best flight deals using your credit card points and airline miles. 
          Our AI-powered platform optimizes your travel rewards for maximum value.
        </p>
        
        {isAuthenticated ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Welcome back, {user?.firstName}!
            </h2>
            <p className="text-gray-600">
              Ready to find your next adventure?
            </p>
            <Link to="/search" className="btn-primary text-lg px-8 py-3 inline-block">
              Start Searching Flights
            </Link>
          </div>
        ) : (
          <div className="space-x-4">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-3">
              Login
            </Link>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">AI-Powered Search</h3>
          <p className="text-gray-600">
            Our intelligent system finds the best flight combinations and routing options automatically.
          </p>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Points Optimization</h3>
          <p className="text-gray-600">
            Maximize your credit card points and airline miles with smart redemption strategies.
          </p>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Chat Interface</h3>
          <p className="text-gray-600">
            Simply tell us where you want to go. Our conversational AI handles the rest.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-100 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">Connect Accounts</h3>
            <p className="text-gray-600 text-sm">
              Link your credit card and airline loyalty accounts securely
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">Tell Us Your Plans</h3>
            <p className="text-gray-600 text-sm">
              Chat with our AI about your travel preferences and destinations
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Get Optimized Results</h3>
            <p className="text-gray-600 text-sm">
              See the best flight options with points vs cash comparisons
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              4
            </div>
            <h3 className="font-semibold mb-2">Book & Save</h3>
            <p className="text-gray-600 text-sm">
              Complete your booking with the best value option
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;