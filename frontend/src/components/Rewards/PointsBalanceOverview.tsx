import React from 'react';
import { PointsBalance, RewardProgram } from '../../store/slices/rewardsSlice';
import LoadingSpinner from '../UI/LoadingSpinner';

interface PointsBalanceOverviewProps {
  balances: PointsBalance[];
  programs: RewardProgram[];
  loading: boolean;
}

const PointsBalanceOverview: React.FC<PointsBalanceOverviewProps> = ({
  balances,
  programs,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Points Balances</h3>
        <p className="text-gray-600">Add reward accounts to see your points balances here.</p>
      </div>
    );
  }

  const totalValue = balances.reduce((total, balance) => {
    const program = programs.find(p => p.id === balance.programId);
    if (!program) return total;
    return total + (balance.balance * program.valuationRate) / 100;
  }, 0);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getProgramIcon = (type: string) => {
    switch (type) {
      case 'airline':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'credit_card':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'hotel':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
    }
  };

  return (
    <div>
      {/* Total Value Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium opacity-90">Total Points Value</h3>
            <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Active Programs</p>
            <p className="text-2xl font-bold">{balances.length}</p>
          </div>
        </div>
      </div>

      {/* Individual Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {balances.map((balance) => {
          const program = programs.find(p => p.id === balance.programId);
          const value = program ? (balance.balance * program.valuationRate) / 100 : 0;
          
          return (
            <div
              key={balance.accountId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="text-gray-500">
                    {getProgramIcon(program?.type || 'default')}
                  </div>
                  <h4 className="font-medium text-gray-900">{balance.programName}</h4>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  program?.type === 'airline' ? 'bg-blue-100 text-blue-800' :
                  program?.type === 'credit_card' ? 'bg-green-100 text-green-800' :
                  program?.type === 'hotel' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {program?.type?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Points Balance</span>
                  <span className="font-semibold text-gray-900">
                    {formatNumber(balance.balance)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Estimated Value</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(value)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-500">
                    {new Date(balance.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PointsBalanceOverview;