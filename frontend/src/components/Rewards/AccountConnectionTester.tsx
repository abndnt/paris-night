import React, { useState } from 'react';
import { RewardAccount, RewardProgram } from '../../store/slices/rewardsSlice';
import { rewardsService } from '../../services/rewardsService';
import LoadingSpinner from '../UI/LoadingSpinner';

interface AccountConnectionTesterProps {
  account: RewardAccount;
  program: RewardProgram;
}

interface ConnectionTestResult {
  success: boolean;
  balance?: number;
  error?: string;
  responseTime?: number;
  lastTested?: Date;
}

const AccountConnectionTester: React.FC<AccountConnectionTesterProps> = ({
  account,
  program,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    const startTime = Date.now();

    try {
      const result = await rewardsService.testAccountConnection(account.id);
      const responseTime = Date.now() - startTime;

      setTestResult({
        success: result.success,
        balance: result.balance,
        error: result.error,
        responseTime,
        lastTested: new Date(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        responseTime,
        lastTested: new Date(),
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (testing) {
      return <LoadingSpinner size="sm" />;
    }

    if (!testResult) {
      return (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    if (testResult.success) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (testing) {
      return 'Testing connection...';
    }

    if (!testResult) {
      return 'Connection not tested';
    }

    if (testResult.success) {
      return `Connection successful (${testResult.responseTime}ms)`;
    }

    return `Connection failed: ${testResult.error}`;
  };

  const getStatusColor = () => {
    if (testing || !testResult) {
      return 'text-gray-600';
    }

    return testResult.success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900">Connection Status</h4>
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {testing ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-1">Testing...</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Test Connection
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {testResult && (
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Last tested:</span>
              <span>{testResult.lastTested?.toLocaleString()}</span>
            </div>
            
            {testResult.success && testResult.balance !== undefined && (
              <div className="flex justify-between">
                <span>Current balance:</span>
                <span className="font-medium">{testResult.balance.toLocaleString()} points</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Response time:</span>
              <span>{testResult.responseTime}ms</span>
            </div>

            {testResult.success && (
              <div className="flex justify-between">
                <span>API endpoint:</span>
                <span className="font-mono text-xs">{program.apiEndpoint || 'Default'}</span>
              </div>
            )}
          </div>
        )}

        {testResult && !testResult.success && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="font-medium text-red-800 mb-1">Troubleshooting Tips:</div>
            <ul className="text-red-700 space-y-1">
              <li>• Check if your login credentials are still valid</li>
              <li>• Verify that your account is not locked or suspended</li>
              <li>• Ensure the reward program's website is accessible</li>
              <li>• Try updating your account credentials</li>
            </ul>
          </div>
        )}

        {testResult && testResult.success && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <div className="flex items-center text-green-700">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Connection is working properly. Your points balance will be updated automatically.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountConnectionTester;