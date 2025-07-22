import React, { useState, useEffect } from 'react';
import { PointsBalance, RewardProgram } from '../../store/slices/rewardsSlice';
import LoadingSpinner from '../UI/LoadingSpinner';

interface PointsHistoryAnalyticsProps {
  balances: PointsBalance[];
  programs: RewardProgram[];
  loading: boolean;
}

interface PointsTransaction {
  id: string;
  date: string;
  programId: string;
  programName: string;
  type: 'earned' | 'redeemed' | 'expired' | 'transferred_in' | 'transferred_out';
  amount: number;
  description: string;
  source?: string;
  balance: number;
}

interface AnalyticsData {
  totalEarned: number;
  totalRedeemed: number;
  totalExpired: number;
  netGain: number;
  averageMonthlyEarning: number;
  topEarningProgram: string;
  redemptionRate: number;
  expirationRate: number;
}

const PointsHistoryAnalytics: React.FC<PointsHistoryAnalyticsProps> = ({
  balances,
  programs,
  loading,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | '6m' | '1y'>('90d');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Mock transaction data - in real app this would come from API
  useEffect(() => {
    setLoadingTransactions(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockTransactions: PointsTransaction[] = [
        {
          id: '1',
          date: '2024-01-20',
          programId: 'chase-ur',
          programName: 'Chase Ultimate Rewards',
          type: 'earned',
          amount: 5000,
          description: 'Credit card spending bonus',
          source: 'Chase Sapphire Preferred',
          balance: 55000,
        },
        {
          id: '2',
          date: '2024-01-18',
          programId: 'american-aa',
          programName: 'American AAdvantage',
          type: 'redeemed',
          amount: -25000,
          description: 'Flight booking: JFK to LAX',
          balance: 25000,
        },
        {
          id: '3',
          date: '2024-01-15',
          programId: 'delta-skymiles',
          programName: 'Delta SkyMiles',
          type: 'earned',
          amount: 3500,
          description: 'Flight miles earned',
          source: 'Delta Flight DL123',
          balance: 38500,
        },
        {
          id: '4',
          date: '2024-01-10',
          programId: 'chase-ur',
          programName: 'Chase Ultimate Rewards',
          type: 'transferred_out',
          amount: -10000,
          description: 'Transfer to United MileagePlus',
          balance: 50000,
        },
        {
          id: '5',
          date: '2024-01-05',
          programId: 'marriott-bonvoy',
          programName: 'Marriott Bonvoy',
          type: 'expired',
          amount: -2500,
          description: 'Points expired due to inactivity',
          balance: 47500,
        },
      ];

      setTransactions(mockTransactions);
      
      // Calculate analytics
      const totalEarned = mockTransactions
        .filter(t => t.type === 'earned' || t.type === 'transferred_in')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const totalRedeemed = mockTransactions
        .filter(t => t.type === 'redeemed' || t.type === 'transferred_out')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const totalExpired = mockTransactions
        .filter(t => t.type === 'expired')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      setAnalytics({
        totalEarned,
        totalRedeemed,
        totalExpired,
        netGain: totalEarned - totalRedeemed - totalExpired,
        averageMonthlyEarning: totalEarned / 3, // Assuming 3 months of data
        topEarningProgram: 'Chase Ultimate Rewards',
        redemptionRate: (totalRedeemed / totalEarned) * 100,
        expirationRate: (totalExpired / totalEarned) * 100,
      });

      setLoadingTransactions(false);
    }, 1000);
  }, [selectedTimeframe, selectedProgram]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'redeemed':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        );
      case 'expired':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'transferred_in':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
          </div>
        );
      case 'transferred_out':
        return (
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'earned':
      case 'transferred_in':
        return 'text-green-600';
      case 'redeemed':
      case 'transferred_out':
        return 'text-blue-600';
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Points History & Analytics</h3>
          <p className="text-sm text-gray-600">Track your points activity and performance</p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last year</option>
          </select>
          
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Programs</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Earned</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(analytics.totalEarned)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Redeemed</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(analytics.totalRedeemed)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Net Gain</p>
                <p className={`text-lg font-semibold ${analytics.netGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.netGain >= 0 ? '+' : ''}{formatNumber(analytics.netGain)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Redemption Rate</p>
                <p className="text-lg font-semibold text-gray-900">{analytics.redemptionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Recent Transactions</h4>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loadingTransactions ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  {getTransactionIcon(transaction.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.programName}
                          {transaction.source && ` • ${transaction.source}`}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getAmountColor(transaction.type)}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatNumber(transaction.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Balance: {formatNumber(transaction.balance)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'earned' ? 'bg-green-100 text-green-800' :
                        transaction.type === 'redeemed' ? 'bg-blue-100 text-blue-800' :
                        transaction.type === 'expired' ? 'bg-red-100 text-red-800' :
                        transaction.type === 'transferred_in' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {transaction.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-500">No transactions found for the selected period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointsHistoryAnalytics;