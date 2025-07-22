import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { 
  RewardAccount, 
  RewardProgram,
  updateRewardAccount,
} from '../../store/slices/rewardsSlice';
import LoadingSpinner from '../UI/LoadingSpinner';

interface RewardProgramPreferencesProps {
  account: RewardAccount;
  program: RewardProgram;
  onClose: () => void;
}

interface NotificationPreferences {
  balanceUpdates: boolean;
  pointsExpiration: boolean;
  transferOpportunities: boolean;
  promotionalOffers: boolean;
  weeklyDigest: boolean;
}

interface AutoTransferSettings {
  enabled: boolean;
  minimumBalance: number;
  targetProgram: string;
  transferRatio: number;
}

const RewardProgramPreferences: React.FC<RewardProgramPreferencesProps> = ({
  account,
  program,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Notification preferences state
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    balanceUpdates: true,
    pointsExpiration: true,
    transferOpportunities: false,
    promotionalOffers: false,
    weeklyDigest: true,
  });

  // Auto-transfer settings state
  const [autoTransfer, setAutoTransfer] = useState<AutoTransferSettings>({
    enabled: false,
    minimumBalance: 10000,
    targetProgram: '',
    transferRatio: 1,
  });

  // Tracking preferences
  const [trackingPreferences, setTrackingPreferences] = useState({
    trackExpiration: true,
    expirationWarningDays: 30,
    trackPromotions: true,
    trackTransferBonuses: true,
    trackValueChanges: true,
  });

  const handleSavePreferences = async () => {
    setLoading(true);
    setError('');

    try {
      // In a real implementation, this would save preferences to the backend
      await dispatch(updateRewardAccount({
        accountId: account.id,
        updates: {
          // Store preferences in additional fields
          // This would be properly structured in the backend
        },
      })).unwrap();
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationPreferences) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAutoTransferChange = (key: keyof AutoTransferSettings, value: any) => {
    setAutoTransfer(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTrackingChange = (key: string, value: any) => {
    setTrackingPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {program.name} - Preferences
            </h3>
            <p className="text-sm text-gray-600">
              Customize your experience and notifications for this reward program
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Notification Preferences */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Balance Updates</label>
                  <p className="text-xs text-gray-500">Get notified when your points balance changes</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.balanceUpdates}
                  onChange={() => handleNotificationChange('balanceUpdates')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Points Expiration Alerts</label>
                  <p className="text-xs text-gray-500">Receive warnings before points expire</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.pointsExpiration}
                  onChange={() => handleNotificationChange('pointsExpiration')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Transfer Opportunities</label>
                  <p className="text-xs text-gray-500">Get alerts about beneficial transfer opportunities</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.transferOpportunities}
                  onChange={() => handleNotificationChange('transferOpportunities')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Promotional Offers</label>
                  <p className="text-xs text-gray-500">Receive notifications about bonus point opportunities</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.promotionalOffers}
                  onChange={() => handleNotificationChange('promotionalOffers')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Weekly Digest</label>
                  <p className="text-xs text-gray-500">Get a weekly summary of your points activity</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.weeklyDigest}
                  onChange={() => handleNotificationChange('weeklyDigest')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Auto-Transfer Settings */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Auto-Transfer Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Auto-Transfer</label>
                  <p className="text-xs text-gray-500">Automatically transfer points when conditions are met</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoTransfer.enabled}
                  onChange={() => handleAutoTransferChange('enabled', !autoTransfer.enabled)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {autoTransfer.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Balance Threshold
                    </label>
                    <input
                      type="number"
                      value={autoTransfer.minimumBalance}
                      onChange={(e) => handleAutoTransferChange('minimumBalance', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Transfer when balance exceeds this amount</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Program
                    </label>
                    <select
                      value={autoTransfer.targetProgram}
                      onChange={(e) => handleAutoTransferChange('targetProgram', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select target program...</option>
                      {program.transferPartners.map(partner => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name} ({partner.transferRatio}:1 ratio)
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tracking Preferences */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Tracking Preferences</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Track Point Expiration</label>
                  <p className="text-xs text-gray-500">Monitor when your points will expire</p>
                </div>
                <input
                  type="checkbox"
                  checked={trackingPreferences.trackExpiration}
                  onChange={() => handleTrackingChange('trackExpiration', !trackingPreferences.trackExpiration)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {trackingPreferences.trackExpiration && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Warning (Days)
                  </label>
                  <input
                    type="number"
                    value={trackingPreferences.expirationWarningDays}
                    onChange={(e) => handleTrackingChange('expirationWarningDays', parseInt(e.target.value))}
                    className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max="365"
                  />
                  <p className="text-xs text-gray-500 mt-1">Warn me this many days before expiration</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Track Promotions</label>
                  <p className="text-xs text-gray-500">Monitor promotional bonus opportunities</p>
                </div>
                <input
                  type="checkbox"
                  checked={trackingPreferences.trackPromotions}
                  onChange={() => handleTrackingChange('trackPromotions', !trackingPreferences.trackPromotions)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Track Transfer Bonuses</label>
                  <p className="text-xs text-gray-500">Monitor special transfer bonus offers</p>
                </div>
                <input
                  type="checkbox"
                  checked={trackingPreferences.trackTransferBonuses}
                  onChange={() => handleTrackingChange('trackTransferBonuses', !trackingPreferences.trackTransferBonuses)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Track Value Changes</label>
                  <p className="text-xs text-gray-500">Monitor changes in point valuation rates</p>
                </div>
                <input
                  type="checkbox"
                  checked={trackingPreferences.trackValueChanges}
                  onChange={() => handleTrackingChange('trackValueChanges', !trackingPreferences.trackValueChanges)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Account Security</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <h5 className="text-sm font-medium text-gray-900">Secure Connection</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Your account credentials are encrypted and stored securely. 
                    Last connection test: {new Date(account.lastUpdated).toLocaleDateString()}
                  </p>
                  <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Test Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardProgramPreferences;