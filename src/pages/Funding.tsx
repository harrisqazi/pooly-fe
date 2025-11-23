import { useState, useEffect } from 'react';
import { DollarSign, Zap, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  member_balances: Record<string, number>;
}

export const Funding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'instant' | 'ach'>('instant');
  const [loading, setLoading] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'orum' | 'astra' | 'ach_only'>('orum');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [groupsData, userData] = await Promise.all([
        supabase.from('groups').select('*').or(`owner_id.eq.${user.id},member_ids.cs.["${user.id}"]`),
        supabase.from('users_extended').select('settings').eq('id', user.id).maybeSingle()
      ]);

      if (groupsData.data) setGroups(groupsData.data);
      if (userData.data?.settings?.payment_provider) {
        setPaymentProvider(userData.data.settings.payment_provider);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroupId) return;

    setLoading(true);

    try {
      const amountInCents = parseFloat(amount) * 100;

      const { data: group } = await supabase
        .from('groups')
        .select('member_balances, total_balance')
        .eq('id', selectedGroupId)
        .single();

      if (!group) throw new Error('Group not found');

      const updatedBalances = {
        ...group.member_balances,
        [user.id]: (group.member_balances[user.id] || 0) + amountInCents
      };

      await Promise.all([
        supabase
          .from('groups')
          .update({
            member_balances: updatedBalances,
            total_balance: group.total_balance + amountInCents
          })
          .eq('id', selectedGroupId),
        supabase
          .from('transactions')
          .insert({
            group_id: selectedGroupId,
            user_id: user.id,
            type: 'deposit',
            amount: amountInCents,
            description: `Deposit via ${paymentMethod === 'instant' ? 'Instant Transfer' : 'ACH'}`,
            status: 'completed',
            payment_method: paymentMethod === 'instant' ? 'fedNow' : 'ach'
          })
      ]);

      toast.success('Funds added successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error depositing funds:', error);
      toast.error('Failed to add funds');
    } finally {
      setLoading(false);
    }
  };

  const getFee = () => {
    if (paymentMethod === 'instant') return '2.99';
    return '0.00';
  };

  const getSpeed = () => {
    if (paymentMethod === 'instant') return 'Instant';
    return '1-3 business days';
  };

  const getPaymentMethods = () => {
    if (paymentProvider === 'orum') {
      return [
        { value: 'instant', label: 'Instant Transfer (FedNow/RTP)', fee: '$2.99' },
        { value: 'ach', label: 'ACH Transfer', fee: 'Free' }
      ];
    } else if (paymentProvider === 'astra') {
      return [
        { value: 'instant', label: 'Push to Debit', fee: '$2.99' },
        { value: 'ach', label: 'ACH Transfer', fee: 'Free' }
      ];
    } else {
      return [
        { value: 'ach', label: 'ACH Transfer', fee: 'Free' }
      ];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Funds</h1>
          <p className="text-gray-600">Deposit money to your group wallet</p>
        </div>

        <form onSubmit={handleDeposit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Group</label>
            <select
              required
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Choose a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
            <div className="space-y-3">
              {getPaymentMethods().map((method) => (
                <label
                  key={method.value}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === method.value
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                      className="w-4 h-4 text-green-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {method.value === 'instant' && <Zap className="w-4 h-4 text-amber-500" />}
                        {method.value === 'ach' && <Clock className="w-4 h-4 text-blue-500" />}
                        {method.label}
                      </div>
                      <div className="text-sm text-gray-600">{method.fee}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {amount && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium text-gray-900">${parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fee</span>
                <span className="font-medium text-gray-900">${getFee()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Processing Time</span>
                <span className="font-medium text-gray-900">{getSpeed()}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-green-600 text-lg">
                  ${(parseFloat(amount) + parseFloat(getFee())).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !amount || !selectedGroupId}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Deposit Funds'}
          </button>
        </form>
      </div>
    </div>
  );
};
