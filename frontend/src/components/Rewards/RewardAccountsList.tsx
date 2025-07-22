import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { 
  RewardAccount, 
  RewardProgram,
  setSelectedAccount,
  deleteRewardAccount,
} from '../../store/slices/rewardsSlice';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmDialog from '../UI/ConfirmDialog';
import RewardProgramSettings from './RewardProgramSettings';
import RewardProgramPreferences from './RewardProgramPreferences';
import AccountConnectionTester from './AccountConnectionTester';

interface RewardAccountsListProps {
  accounts: RewardAccount[];
  programs: RewardProgram[];
  loading: boolean;
  onAddAccount: () => void;
}

const RewardAccountsList: React.FC<RewardAccountsListProps> = ({
  accounts,
  programs,
  loading,
  onAddAccount,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [accountToDelete, setAccountToDelete] = useState<RewardAccount | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedAccountForSettings, setSelectedAccountForSettings] = useState<RewardAccount | null>(null);
  const [selectedAccountForPreferences, setSelectedAccountForPreferences] = useState<RewardAccount | null>(null);

  const handleEditAccount = (account: RewardAccount) => {
    setSelectedAccountForSettings(account);
    setShowSettings(true);
  };

  const handlePreferencesAccount = (account: RewardAccount) => {
    setSelectedAccountForPreferences(account);
    setShowPreferences(true);
  };

  const handleDeleteClick = (account: RewardAccount) => {
    setAccountToDelete(account);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (accountToDelete) {
      await dispatch(deleteRewardAccount(accountToDelete.id));
      setAccountToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setAccountToDelete(null);
    setShowDeleteConfirm(false);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    setSelectedAccountForSettings(null);
  };

  const handleClosePreferences = () => {
    setShowPreferences(false);
    setSelectedAccountForPreferences(null);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const getProgramIcon = (type: string) => {
    switch (type) {
      case 'airline':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'credit_card':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'hotel':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Reward Accounts</h3>
        <p className="text-gray-600 mb-6">
          Connect your reward program accounts to start tracking your points and finding optimization opportunities.
        </p>
        <button
          onClick={onAddAccount}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Your First Account
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {accounts.map((account) => {
          const program = programs.find(p => p.id === account.programId);
          
          return (
            <div
              key={account.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${
                    program?.type === 'airline' ? 'bg-blue-100 text-blue-600' :
                    program?.type === 'credit_card' ? 'bg-green-100 text-green-600' :
                    program?.type === 'hotel' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getProgramIcon(program?.type || 'default')}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {program?.name || 'Unknown Program'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Account: ****{account.accountNumber.slice(-4)}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-500">
                        Balance: <span className="font-medium text-gray-900">
                          {formatNumber(account.balance)} points
                        </span>
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        account.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditAccount(account)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Settings
                  </button>

                  <button
                    onClick={() => handlePreferencesAccount(account)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Preferences
                  </button>
                  
                  <button
                    onClick={() => handleDeleteClick(account)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span>Last updated: {new Date(account.lastUpdated).toLocaleDateString()}</span>
                  <span>Added: {new Date(account.createdAt).toLocaleDateString()}</span>
                </div>
                
                {/* Connection Tester */}
                {program && (
                  <AccountConnectionTester
                    account={account}
                    program={program}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && accountToDelete && (
        <ConfirmDialog
          title="Delete Reward Account"
          message={`Are you sure you want to delete your ${
            programs.find(p => p.id === accountToDelete.programId)?.name || 'reward'
          } account? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          variant="danger"
        />
      )}

      {/* Account Settings Modal */}
      {showSettings && selectedAccountForSettings && (
        <RewardProgramSettings
          account={selectedAccountForSettings}
          program={programs.find(p => p.id === selectedAccountForSettings.programId)!}
          onClose={handleCloseSettings}
        />
      )}

      {/* Account Preferences Modal */}
      {showPreferences && selectedAccountForPreferences && (
        <RewardProgramPreferences
          account={selectedAccountForPreferences}
          program={programs.find(p => p.id === selectedAccountForPreferences.programId)!}
          onClose={handleClosePreferences}
        />
      )}
    </div>
  );
};

export default RewardAccountsList;