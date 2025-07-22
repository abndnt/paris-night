import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { 
  RewardAccount, 
  RewardProgram, 
  PointsBalance,
  TransferRecommendation,
  fetchTransferRecommendations,
} from '../../store/slices/rewardsSlice';
import LoadingSpinner from '../UI/LoadingSpinner';

interface EnhancedTransferRecommendationsProps {
  accounts: RewardAccount[];
  programs: RewardProgram[];
  balances: PointsBalance[];
}

interface TransferScenario {
  id: string;
  name: string;
  description: string;
  targetProgram: string;
  pointsNeeded: number;
  recommendations: TransferRecommendation[];
}

const EnhancedTransferRecommendations: React.FC<EnhancedTransferRecommendationsProps> = ({
  accounts,
  programs,
  balances,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [customPointsNeeded, setCustomPointsNeeded] = useState<number>(0);
  const [customTargetProgram, setCustomTargetProgram] = useState<string>('');
  const [recommendations, setRecommendations] = useState<TransferRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'custom' | 'opportunities'>('scenarios');

  // Predefined transfer scenarios
  const transferScenarios: TransferScenario[] = [
    {
      id: 'domestic-flight',
      name: 'Domestic Flight',
      description: 'Round-trip domestic flight in economy',
      targetProgram: 'american-aadvantage',
      pointsNeeded: 25000,
      recommendations: [],
    },
    {
      id: 'international-flight',
      name: 'International Flight',
      description: 'Round-trip international flight in economy',
      targetProgram: 'delta-skymiles',
      pointsNeeded: 60000,
      recommendations: [],
    },
    {
      id: 'business-class',
      name: 'Business Class',
      description: 'One-way business class to Europe',
      targetProgram: 'united-mileageplus',
      pointsNeeded: 70000,
      recommendations: [],
    },
    {
      id: 'hotel-stay',
      name: 'Hotel Stay',
      description: '5-night luxury hotel stay',
      targetProgram: 'marriott-bonvoy',
      pointsNeeded: 50000,
      recommendations: [],
    },
  ];

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleScenarioSelect = async (scenarioId: string) => {
    const scenario = transferScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    setSelectedScenario(scenarioId);
    setLoading(true);

    try {
      // Find the best transfer options for this scenario
      const allRecommendations: TransferRecommendation[] = [];
      
      for (const account of accounts) {
        const balance = balances.find(b => b.accountId === account.id);
        if (!balance || balance.balance === 0) continue;

        const result = await dispatch(fetchTransferRecommendations({
          fromProgramId: account.programId,
          toProgramId: scenario.targetProgram,
          pointsNeeded: scenario.pointsNeeded,
        })).unwrap();

        allRecommendations.push(...result);
      }

      setRecommendations(allRecommendations);
    } catch (error) {
      console.error('Failed to fetch transfer recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTransfer = async () => {
    if (!customTargetProgram || customPointsNeeded <= 0) return;

    setLoading(true);
    try {
      const allRecommendations: TransferRecommendation[] = [];
      
      for (const account of accounts) {
        const balance = balances.find(b => b.accountId === account.id);
        if (!balance || balance.balance === 0) continue;

        const result = await dispatch(fetchTransferRecommendations({
          fromProgramId: account.programId,
          toProgramId: customTargetProgram,
          pointsNeeded: customPointsNeeded,
        })).unwrap();

        allRecommendations.push(...result);
      }

      setRecommendations(allRecommendations);
    } catch (error) {
      console.error('Failed to fetch transfer recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTransfers = () => {
    const transfers: Array<{
      fromProgram: RewardProgram;
      toProgram: RewardProgram;
      fromBalance: number;
      transferRatio: number;
      maxTransfer: number;
      efficiency: number;
    }> = [];

    programs.forEach(fromProgram => {
      const balance = balances.find(b => b.programId === fromProgram.id);
      if (!balance || balance.balance === 0) return;

      fromProgram.transferPartners.forEach(partner => {
        const toProgram = programs.find(p => p.id === partner.id);
        if (!toProgram || !partner.isActive) return;

        const maxTransfer = partner.maximumTransfer 
          ? Math.min(balance.balance, partner.maximumTransfer)
          : balance.balance;

        if (maxTransfer >= partner.minimumTransfer) {
          // Calculate efficiency (value gained per point transferred)
          const efficiency = (toProgram.valuationRate / fromProgram.valuationRate) * partner.transferRatio;
          
          transfers.push({
            fromProgram,
            toProgram,
            fromBalance: balance.balance,
            transferRatio: partner.transferRatio,
            maxTransfer,
            efficiency,
          });
        }
      });
    });

    return transfers.sort((a, b) => b.efficiency - a.efficiency);
  };

  const getBestRecommendation = () => {
    if (recommendations.length === 0) return null;
    return recommendations.reduce((best, current) => 
      current.isRecommended || current.totalCost < best.totalCost ? current : best
    );
  };

  const availableTransfers = getAvailableTransfers();
  const bestRecommendation = getBestRecommendation();

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Transfer Options</h3>
        <p className="text-gray-600">Add reward accounts to see transfer opportunities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Transfer Optimizer</h3>
        <p className="text-sm text-gray-600">Find the best ways to transfer points for your travel goals</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scenarios'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Travel Scenarios
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'custom'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Custom Transfer
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'opportunities'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Best Opportunities
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Travel Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transferScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => handleScenarioSelect(scenario.id)}
                  className={`p-4 border rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedScenario === scenario.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                  <p className="text-sm text-blue-600 mt-2">
                    {formatNumber(scenario.pointsNeeded)} points needed
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Transfer Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Program
                </label>
                <select
                  value={customTargetProgram}
                  onChange={(e) => setCustomTargetProgram(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select target program...</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points Needed
                </label>
                <input
                  type="number"
                  value={customPointsNeeded || ''}
                  onChange={(e) => setCustomPointsNeeded(parseInt(e.target.value) || 0)}
                  placeholder="Enter points needed..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleCustomTransfer}
              disabled={!customTargetProgram || customPointsNeeded <= 0 || loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Find Transfer Options'}
            </button>
          </div>
        )}

        {/* Best Opportunities Tab */}
        {activeTab === 'opportunities' && (
          <div className="space-y-4">
            {availableTransfers.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Most Efficient Transfers</h4>
                {availableTransfers.slice(0, 10).map((transfer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {transfer.fromProgram.name} → {transfer.toProgram.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {transfer.transferRatio}:1 ratio • Max: {formatNumber(transfer.maxTransfer)} points
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatNumber(transfer.fromBalance)} available
                      </p>
                      <p className={`text-xs font-medium ${
                        transfer.efficiency > 1 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(transfer.efficiency * 100).toFixed(0)}% efficiency
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600">
                  No transfer opportunities available with current balances
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommendations Results */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Transfer Recommendations</h4>
            {bestRecommendation && (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                Best Option Available
              </span>
            )}
          </div>

          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 ${
                  rec === bestRecommendation ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {rec.fromProgramName} → {rec.toProgramName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Transfer {formatNumber(rec.pointsToTransfer)} points to get {formatNumber(rec.pointsReceived)} points
                    </p>
                  </div>
                  {rec.isRecommended && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Transfer Ratio:</span>
                    <span className="ml-2 font-medium">{rec.transferRatio}:1</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Transfer Fee:</span>
                    <span className="ml-2 font-medium">{formatCurrency(rec.transferFee)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="ml-2 font-medium">{formatCurrency(rec.totalCost)}</span>
                  </div>
                </div>

                {rec === bestRecommendation && (
                  <div className="pt-3 border-t border-green-200">
                    <div className="flex items-center text-sm text-green-700">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This is the most cost-effective transfer option
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      )}
    </div>
  );
};

export default EnhancedTransferRecommendations;