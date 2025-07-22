import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { updatePaymentMethod, setBookingStep } from '../../store/slices/bookingSlice';
import { PaymentMethod, CreditCardInfo, PointsPaymentInfo } from '../../store/slices/bookingSlice';
import bookingService from '../../services/bookingService';

const PaymentStep: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedFlight, formData } = useSelector((state: RootState) => state.booking);
  const [paymentType, setPaymentType] = useState<'credit_card' | 'points' | 'mixed'>('credit_card');
  const [creditCard, setCreditCard] = useState<CreditCardInfo>({
    last4: '',
    brand: 'visa',
    expiryMonth: 1,
    expiryYear: new Date().getFullYear(),
    holderName: '',
  });
  const [pointsPayment, setPointsPayment] = useState<PointsPaymentInfo>({
    program: '',
    points: 0,
    cashComponent: 0,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [availablePrograms] = useState([
    { id: 'chase-ur', name: 'Chase Ultimate Rewards', transferRatio: 1.25 },
    { id: 'amex-mr', name: 'American Express Membership Rewards', transferRatio: 1.0 },
    { id: 'citi-ty', name: 'Citi ThankYou Points', transferRatio: 1.0 },
    { id: 'capital-one', name: 'Capital One Miles', transferRatio: 1.0 },
    { id: 'united', name: 'United MileagePlus', transferRatio: 1.5 },
    { id: 'american', name: 'American Airlines AAdvantage', transferRatio: 1.4 },
    { id: 'delta', name: 'Delta SkyMiles', transferRatio: 1.2 },
  ]);

  useEffect(() => {
    if (formData.paymentMethod) {
      setPaymentType(formData.paymentMethod.type);
      if (formData.paymentMethod.creditCard) {
        setCreditCard(formData.paymentMethod.creditCard);
      }
      if (formData.paymentMethod.pointsUsed) {
        setPointsPayment(formData.paymentMethod.pointsUsed);
      }
    }
  }, [formData.paymentMethod]);

  const calculatePointsRequired = (): number => {
    if (!selectedFlight) return 0;
    const bestPointsOption = selectedFlight.pricing.pointsOptions.find(option => option.bestValue);
    return bestPointsOption?.pointsRequired || 0;
  };

  const calculateMixedPayment = () => {
    if (!selectedFlight) return { points: 0, cash: 0 };
    const totalPrice = selectedFlight.pricing.totalPrice;
    const pointsValue = pointsPayment.points * (availablePrograms.find(p => p.id === pointsPayment.program)?.transferRatio || 1) / 100;
    const cashComponent = Math.max(0, totalPrice - pointsValue);
    return { points: pointsPayment.points, cash: cashComponent };
  };

  const validatePayment = (): boolean => {
    const errors: string[] = [];

    if (paymentType === 'credit_card' || paymentType === 'mixed') {
      if (!creditCard.holderName.trim()) {
        errors.push('Cardholder name is required');
      }
      if (!creditCard.last4 || creditCard.last4.length !== 4) {
        errors.push('Valid card number is required');
      }
      if (creditCard.expiryMonth < 1 || creditCard.expiryMonth > 12) {
        errors.push('Valid expiry month is required');
      }
      if (creditCard.expiryYear < new Date().getFullYear()) {
        errors.push('Card expiry year cannot be in the past');
      }
    }

    if (paymentType === 'points' || paymentType === 'mixed') {
      if (!pointsPayment.program) {
        errors.push('Reward program selection is required');
      }
      if (pointsPayment.points <= 0) {
        errors.push('Points amount must be greater than 0');
      }
      if (paymentType === 'points') {
        const requiredPoints = calculatePointsRequired();
        if (pointsPayment.points < requiredPoints) {
          errors.push(`Insufficient points. Required: ${requiredPoints.toLocaleString()}`);
        }
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleContinue = () => {
    if (validatePayment() && selectedFlight) {
      const paymentMethod: PaymentMethod = {
        type: paymentType,
        totalAmount: selectedFlight.pricing.totalPrice,
        currency: selectedFlight.pricing.currency,
      };

      if (paymentType === 'credit_card' || paymentType === 'mixed') {
        paymentMethod.creditCard = creditCard;
      }

      if (paymentType === 'points' || paymentType === 'mixed') {
        paymentMethod.pointsUsed = pointsPayment;
      }

      if (paymentType === 'mixed') {
        const mixedPayment = calculateMixedPayment();
        paymentMethod.totalAmount = mixedPayment.cash;
        if (paymentMethod.pointsUsed) {
          paymentMethod.pointsUsed.cashComponent = mixedPayment.cash;
        }
      }

      dispatch(updatePaymentMethod(paymentMethod));
      dispatch(setBookingStep('review'));
    }
  };

  const handleBack = () => {
    dispatch(setBookingStep('passengers'));
  };

  if (!selectedFlight) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Flight Selected</h2>
          <p className="text-gray-600 mb-4">Please select a flight to continue with booking.</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-green-600">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              ✓
            </div>
            <span className="ml-2 text-sm font-medium">Passenger Info</span>
          </div>
          <div className="flex items-center text-blue-600">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span className="ml-2 text-sm font-medium">Payment</span>
          </div>
          <div className="flex items-center text-gray-400">
            <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <span className="ml-2 text-sm font-medium">Review</span>
          </div>
          <div className="flex items-center text-gray-400">
            <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-medium">
              4
            </div>
            <span className="ml-2 text-sm font-medium">Confirmation</span>
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>

      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <ul className="text-sm text-red-600 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Payment Method Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="paymentType"
              value="credit_card"
              checked={paymentType === 'credit_card'}
              onChange={(e) => setPaymentType(e.target.value as any)}
              className="mr-3"
            />
            <span className="text-gray-700">Credit Card</span>
            <span className="ml-auto text-lg font-semibold">
              ${selectedFlight.pricing.totalPrice.toFixed(2)}
            </span>
          </label>

          {selectedFlight.pricing.pointsOptions.length > 0 && (
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentType"
                value="points"
                checked={paymentType === 'points'}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="mr-3"
              />
              <span className="text-gray-700">Points Only</span>
              <span className="ml-auto text-lg font-semibold">
                {calculatePointsRequired().toLocaleString()} points
              </span>
            </label>
          )}

          <label className="flex items-center">
            <input
              type="radio"
              name="paymentType"
              value="mixed"
              checked={paymentType === 'mixed'}
              onChange={(e) => setPaymentType(e.target.value as any)}
              className="mr-3"
            />
            <span className="text-gray-700">Points + Cash</span>
            <span className="ml-auto text-sm text-gray-600">
              Customize your payment mix
            </span>
          </label>
        </div>
      </div>

      {/* Credit Card Form */}
      {(paymentType === 'credit_card' || paymentType === 'mixed') && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Card Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="holderName" className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name *
              </label>
              <input
                type="text"
                id="holderName"
                value={creditCard.holderName}
                onChange={(e) => setCreditCard({ ...creditCard, holderName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter cardholder name"
                required
              />
            </div>

            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Card Number *
              </label>
              <input
                type="text"
                id="cardNumber"
                value={creditCard.last4}
                onChange={(e) => setCreditCard({ ...creditCard, last4: e.target.value.slice(-4) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="**** **** **** 1234"
                maxLength={4}
                required
              />
            </div>

            <div>
              <label htmlFor="cardBrand" className="block text-sm font-medium text-gray-700 mb-1">
                Card Brand *
              </label>
              <select
                id="cardBrand"
                value={creditCard.brand}
                onChange={(e) => setCreditCard({ ...creditCard, brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="discover">Discover</option>
              </select>
            </div>

            <div>
              <label htmlFor="expiryMonth" className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Month *
              </label>
              <select
                id="expiryMonth"
                value={creditCard.expiryMonth}
                onChange={(e) => setCreditCard({ ...creditCard, expiryMonth: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expiryYear" className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Year *
              </label>
              <select
                id="expiryYear"
                value={creditCard.expiryYear}
                onChange={(e) => setCreditCard({ ...creditCard, expiryYear: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Points Payment Form */}
      {(paymentType === 'points' || paymentType === 'mixed') && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Points Payment</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rewardProgram" className="block text-sm font-medium text-gray-700 mb-1">
                Reward Program *
              </label>
              <select
                id="rewardProgram"
                value={pointsPayment.program}
                onChange={(e) => setPointsPayment({ ...pointsPayment, program: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a program</option>
                {availablePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pointsAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Points to Use *
              </label>
              <input
                type="number"
                id="pointsAmount"
                value={pointsPayment.points || ''}
                onChange={(e) => setPointsPayment({ ...pointsPayment, points: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter points amount"
                min="0"
                required
              />
            </div>
          </div>

          {paymentType === 'mixed' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Payment Breakdown</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Points:</span>
                  <span>{pointsPayment.points.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Component:</span>
                  <span>${calculateMixedPayment().cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-900 border-t pt-1">
                  <span>Total:</span>
                  <span>{pointsPayment.points.toLocaleString()} points + ${calculateMixedPayment().cash.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Continue to Review
        </button>
      </div>
    </div>
  );
};

export default PaymentStep;