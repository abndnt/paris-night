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

interface TransferRecommendationsProps {
  accounts: RewardAccount[];
  programs: RewardProgram[];
  balances: PointsBalance[];
}

const TransferRecommendations: React.FC<TransferRecommendationsProps> = ({
  accounts,
  programs,
  balances,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedFromProgram, setSelectedFromProgram] = useState<string>('');
  const [selectedToProgram, setSelectedToProgram] = useState<string>('');
  const [pointsNeeded, setPointsNeeded] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<TransferRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleCalculateTransfers = async () => {
    if (!selectedFromProgram || !selectedToProgram || pointsNeeded <= 0) {
      return;
    }

    setLoading(true);
    try {
      const result = await dispatch(fetchTransferRecommendations({
        fromProgramId: selectedFromProgram,
        toProgramId: selectedToProgram,
        pointsNeeded,
      })).unwrap();
      setRecommendations(result);
    } catch (error) {
      console.error('Failed to fetch transfer recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get available transfer opportunities based on current balances
  const getAvailableTransfers = () => {
    const transfers: Array<{
      fromProgram: RewardProgram;
      toProgram: RewardProgram;
      fromBalance: number;
      transferRatio: number;
      maxTransfer: number;
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
          transfers.push({
            fromProgram,
            toProgram,
            fromBalance: balance.balance,
            transferRatio: partner.transferRatio,
            maxTransfer,
          });
        }
      });
    });

    return transfers;
  };

  const availableTransfers = getAvailableTransfers();

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
      {/* Transfer Calculator Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Transfer Calculator</h3>
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showCalculator ? 'Hide Calculator' : 'Show Calculator'}
        </button>
      </div>

      {/* Transfer Calculator */}
      {showCalculator && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Program
            </label>
            <select
              value={selectedFromProgram}
              onChange={(e) => setSelectedFromProgram(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select program...</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Program
            </label>
            <select
              value={selectedToProgram}
              onChange={(e) => setSelectedToProgram(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select program...</option>
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
              value={pointsNeeded || ''}
              onChange={(e) => setPointsNeeded(parseInt(e.target.value) || 0)}
              placeholder="Enter points needed..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleCalculateTransfers}
            disabled={!selectedFromProgram || !selectedToProgram || pointsNeeded <= 0 || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Calculate Transfer'}
          </button>
        </div>
      )}

      {/* Transfer Recommendations Results */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Transfer Recommendations</h4>
          {recommendations.map((rec, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
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
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Transfer Ratio:</span>
                  <span className="ml-2 font-medium">{rec.transferRatio}:1</span>
                </div>
                <div>
                  <span className="text-gray-600">Transfer Fee:</span>
                  <span className="ml-2 font-medium">{formatCurrency(rec.transferFee)}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Cost:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(rec.totalCost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Transfer Opportunities */}
      {availableTransfers.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Available Transfers</h4>
          <div className="space-y-2">
            {availableTransfers.slice(0, 5).map((transfer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                </div>
              </div>
            ))}
          </div>
          
          {availableTransfers.length > 5 && (
            <p className="text-sm text-gray-600 text-center">
              +{availableTransfers.length - 5} more transfer options available
            </p>
          )}
        </div>
      )}

      {/* No transfers available */}
      {availableTransfers.length === 0 && balances.length > 0 && (
        <div className="text-center py-6">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            No transfer opportunities available with current balances
          </p>
        </div>
      )}
    </div>
  );
};

export default TransferRecommendations;