import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  fetchRewardPrograms,
  fetchUserRewardAccounts,
  fetchPointsBalances,
  setShowAddAccountModal,
  clearRewardsError,
} from '../store/slices/rewardsSlice';
import RewardAccountsList from '../components/Rewards/RewardAccountsList';
import PointsBalanceOverview from '../components/Rewards/PointsBalanceOverview';
import PointsTrackingDashboard from '../components/Rewards/PointsTrackingDashboard';
import EnhancedTransferRecommendations from '../components/Rewards/EnhancedTransferRecommendations';
import AddAccountModal from '../components/Rewards/AddAccountModal';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorMessage from '../components/UI/ErrorMessage';

const Rewards: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    programs,
    programsLoading,
    programsError,
    accounts,
    accountsLoading,
    accountsError,
    balances,
    balancesLoading,
    balancesError,
    showAddAccountModal,
  } = useSelector((state: RootState) => state.rewards);

  useEffect(() => {
    dispatch(fetchRewardPrograms());
    dispatch(fetchUserRewardAccounts());
    dispatch(fetchPointsBalances());
  }, [dispatch]);

  const handleAddAccount = () => {
    dispatch(setShowAddAccountModal(true));
  };

  const handleRefreshBalances = () => {
    dispatch(fetchPointsBalances());
  };

  const handleClearError = () => {
    dispatch(clearRewardsError());
  };

  const isLoading = programsLoading || accountsLoading || balancesLoading;
  const hasError = programsError || accountsError || balancesError;

  if (isLoading && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reward Programs</h1>
              <p className="mt-2 text-gray-600">
                Manage your reward accounts and optimize your points usage
              </p>
            </div>

          </div>
        </div>

        {/* Error Messages */}
        {hasError && (
          <div className="mb-6">
            <ErrorMessage
              message={programsError || accountsError || balancesError || 'An error occurred'}
              onDismiss={handleClearError}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-8">
          {/* Points Overview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Points Overview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Points Overview</h2>
                </div>
                <div className="p-6">
                  <PointsBalanceOverview
                    balances={balances}
                    programs={programs}
                    loading={balancesLoading}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Quick Stats */}
            <div>
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                </div>
                <div className="p-6 space-y-4">
                  <button
                    onClick={handleAddAccount}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Account
                  </button>
                  <button
                    onClick={handleRefreshBalances}
                    disabled={balancesLoading}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {balancesLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    Refresh Balances
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Points Tracking Dashboard */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Points Tracking</h2>
            </div>
            <div className="p-6">
              <PointsTrackingDashboard
                balances={balances}
                programs={programs}
                loading={balancesLoading}
              />
            </div>
          </div>

          {/* Transfer Optimizer */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Transfer Optimizer</h2>
            </div>
            <div className="p-6">
              <EnhancedTransferRecommendations
                accounts={accounts}
                programs={programs}
                balances={balances}
              />
            </div>
          </div>

          {/* Reward Accounts Management */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Your Reward Accounts</h2>
            </div>
            <div className="p-6">
              <RewardAccountsList
                accounts={accounts}
                programs={programs}
                loading={accountsLoading}
                onAddAccount={handleAddAccount}
              />
            </div>
          </div>
        </div>

        {/* Add Account Modal */}
        {showAddAccountModal && (
          <AddAccountModal
            programs={programs}
            onClose={() => dispatch(setShowAddAccountModal(false))}
          />
        )}
      </div>
    </div>
  );
};

export default Rewards;