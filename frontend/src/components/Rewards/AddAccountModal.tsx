import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { 
  RewardProgram,
  CreateRewardAccountRequest,
  createRewardAccount,
} from '../../store/slices/rewardsSlice';
import LoadingSpinner from '../UI/LoadingSpinner';

interface AddAccountModalProps {
  programs: RewardProgram[];
  onClose: () => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  programs,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    apiKey: '',
    accessToken: '',
    refreshToken: '',
    additionalFields: {} as Record<string, string>,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'program' | 'account' | 'credentials'>('program');

  const selectedProgram = programs.find(p => p.id === selectedProgramId);

  const handleProgramSelect = (programId: string) => {
    setSelectedProgramId(programId);
    setStep('account');
  };

  const handleAccountNext = () => {
    if (!accountNumber.trim()) {
      setError('Account number is required');
      return;
    }
    setError('');
    setStep('credentials');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProgramId || !accountNumber.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const accountData: CreateRewardAccountRequest = {
        programId: selectedProgramId,
        accountNumber: accountNumber.trim(),
        credentials: {
          username: credentials.username || undefined,
          password: credentials.password || undefined,
          apiKey: credentials.apiKey || undefined,
          accessToken: credentials.accessToken || undefined,
          refreshToken: credentials.refreshToken || undefined,
          additionalFields: Object.keys(credentials.additionalFields).length > 0 
            ? credentials.additionalFields 
            : undefined,
        },
      };

      await dispatch(createRewardAccount(accountData)).unwrap();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'credentials') {
      setStep('account');
    } else if (step === 'account') {
      setStep('program');
    }
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

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Add Reward Account
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          <div className={`flex items-center ${step === 'program' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'program' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {step === 'program' ? '1' : '✓'}
            </div>
            <span className="ml-2 text-sm font-medium">Select Program</span>
          </div>
          
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          
          <div className={`flex items-center ${
            step === 'account' ? 'text-blue-600' : 
            step === 'credentials' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'account' ? 'bg-blue-100' : 
              step === 'credentials' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {step === 'credentials' ? '✓' : '2'}
            </div>
            <span className="ml-2 text-sm font-medium">Account Info</span>
          </div>
          
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          
          <div className={`flex items-center ${step === 'credentials' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'credentials' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Credentials</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Step Content */}
        <form onSubmit={handleSubmit}>
          {/* Step 1: Program Selection */}
          {step === 'program' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Choose a reward program</h4>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {programs.filter(p => p.isActive).map((program) => (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => handleProgramSelect(program.id)}
                    className={`p-4 border rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedProgramId === program.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        program.type === 'airline' ? 'bg-blue-100 text-blue-600' :
                        program.type === 'credit_card' ? 'bg-green-100 text-green-600' :
                        program.type === 'hotel' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getProgramIcon(program.type)}
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{program.name}</h5>
                        <p className="text-sm text-gray-600">
                          {program.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Program
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Account Information */}
          {step === 'account' && selectedProgram && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-full ${
                  selectedProgram.type === 'airline' ? 'bg-blue-100 text-blue-600' :
                  selectedProgram.type === 'credit_card' ? 'bg-green-100 text-green-600' :
                  selectedProgram.type === 'hotel' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {getProgramIcon(selectedProgram.type)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{selectedProgram.name}</h4>
                  <p className="text-sm text-gray-600 capitalize">
                    {selectedProgram.type.replace('_', ' ')} Program
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter your account number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be used to identify your account and track your points balance.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Credentials */}
          {step === 'credentials' && selectedProgram && (
            <div className="space-y-4">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">Account Credentials</h4>
                <p className="text-sm text-gray-600">
                  Provide your login credentials to automatically sync your points balance.
                  All credentials are encrypted and stored securely.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username/Email
                  </label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Your login username or email"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Your login password"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key (if available)
                  </label>
                  <input
                    type="text"
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="API key for direct access"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token (if available)
                  </label>
                  <input
                    type="text"
                    value={credentials.accessToken}
                    onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
                    placeholder="OAuth access token"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h5 className="text-sm font-medium text-yellow-800">Security Notice</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your credentials are encrypted using industry-standard encryption before being stored.
                      We recommend using API keys when available for enhanced security.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-between mt-8">
            <div>
              {step !== 'program' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Back
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              
              {step === 'account' && (
                <button
                  type="button"
                  onClick={handleAccountNext}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Next
                </button>
              )}
              
              {step === 'credentials' && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Add Account'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;