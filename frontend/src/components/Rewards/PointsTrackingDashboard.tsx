import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { 
  PointsBalance, 
  RewardProgram,
  fetchPointsBalances,
} from '../../store/slices/rewardsSlice';
import LoadingSpinner from '../UI/LoadingSpinner';

interface PointsTrackingDashboardProps {
  balances: PointsBalance[];
  programs: RewardProgram[];
  loading: boolean;
}

interface PointsHistory {
  date: string;
  programId: string;
  programName: string;
  previousBalance: number;
  currentBalance: number;
  change: number;
  changeType: 'earned' | 'redeemed' | 'expired' | 'transferred';
}

const PointsTrackingDashboard: React.FC<PointsTrackingDashboardProps> = ({
  balances,
  programs,
  loading,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'balance' | 'value' | 'name'>('value');

  // Mock points history data - in real app this would come from API
  const [pointsHistory] = useState<PointsHistory[]>([
    {
      date: '2024-01-15',
      programId: 'chase-ultimate-rewards',
      programName: 'Chase Ultimate Rewards',
      previousBalance: 45000,
      currentBalance: 50000,
      change: 5000,
      changeType: 'earned',
    },
    {
      date: '2024-01-10',
      programId: 'american-aadvantage',
      programName: 'American AAdvantage',
      previousBalance: 75000,
      currentBalance: 50000,
      change: -25000,
      changeType: 'redeemed',
    },
    {
      date: '2024-01-05',
      programId: 'delta-skymiles',
      programName: 'Delta SkyMiles',
      previousBalance: 30000,
      currentBalance: 35000,
      change: 5000,
      changeType: 'earned',
    },
  ]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchPointsBalances());
    } finally {
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTotalValue = () => {
    return balances.reduce((total, balance) => {
      const program = programs.find(p => p.id === balance.programId);
      if (!program) return total;
      return total + (balance.balance * program.valuationRate) / 100;
    }, 0);
  };

  const getSortedBalances = () => {
    const sorted = [...balances];
    switch (sortBy) {
      case 'balance':
        return sorted.sort((a, b) => b.balance - a.balance);
      case 'value':
        return sorted.sort((a, b) => {
          const aProgram = programs.find(p => p.id === a.programId);
          const bProgram = programs.find(p => p.id === b.programId);
          const aValue = aProgram ? (a.balance * aProgram.valuationRate) / 100 : 0;
          const bValue = bProgram ? (b.balance * bProgram.valuationRate) / 100 : 0;
          return bValue - aValue;
        });
      case 'name':
        return sorted.sort((a, b) => a.programName.localeCompare(b.programName));
      default:
        return sorted;
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'earned':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'redeemed':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'expired':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case 'transferred':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Points Tracking</h3>
          <p className="text-sm text-gray-600">Monitor your points balances and activity</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {refreshing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-blue-100 truncate">Total Value</dt>
                <dd className="text-2xl font-bold">{formatCurrency(getTotalValue())}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-green-100 truncate">Active Programs</dt>
                <dd className="text-2xl font-bold">{balances.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-purple-100 truncate">Recent Activity</dt>
                <dd className="text-2xl font-bold">{pointsHistory.length}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Points Balances Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Current Balances</h4>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="value">Value</option>
                <option value="balance">Balance</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedBalances().map((balance) => {
                  const program = programs.find(p => p.id === balance.programId);
                  const value = program ? (balance.balance * program.valuationRate) / 100 : 0;
                  
                  return (
                    <tr key={balance.accountId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {balance.programName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {formatNumber(balance.balance)} points
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600 font-medium">
                          {formatCurrency(value)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(balance.lastUpdated).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h4>
          <div className="space-y-3">
            {pointsHistory.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getChangeIcon(activity.changeType)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.programName}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    activity.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {activity.change > 0 ? '+' : ''}{formatNumber(activity.change)} points
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {activity.changeType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsTrackingDashboard;