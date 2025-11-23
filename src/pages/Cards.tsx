import { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Users, Shield, Zap } from 'lucide-react';
import { VirtualCard3D } from '../components/VirtualCard3D';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  total_balance: number;
  member_balances: Record<string, number>;
  spending_limits: {
    daily_limit: number;
    monthly_limit: number;
    per_transaction_limit: number;
  };
  card_status: 'active' | 'paused' | 'locked';
  card_image_url: string | null;
  approval_threshold: number;
  member_ids: string[];
}

export const Cards = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSpendingDialog, setShowSpendingDialog] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const [spendDescription, setSpendDescription] = useState('');

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .or(`owner_id.eq.${user.id},member_ids.cs.["${user.id}"]`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleCardStatusToggle = async () => {
    if (!selectedGroup) return;

    const newStatus = selectedGroup.card_status === 'active' ? 'paused' : 'active';

    try {
      await supabase
        .from('groups')
        .update({ card_status: newStatus })
        .eq('id', selectedGroup.id);

      toast.success(`Card ${newStatus === 'active' ? 'activated' : 'paused'}`);
      loadGroups();
    } catch (error) {
      console.error('Error updating card status:', error);
      toast.error('Failed to update card status');
    }
  };

  const handleTapToPay = () => {
    setShowSpendingDialog(true);
  };

  const handleSpendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !user) return;

    const amountInCents = parseFloat(spendAmount) * 100;

    if (amountInCents > selectedGroup.member_balances[user.id]) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      const needsApproval = selectedGroup.approval_threshold > 1;

      const { error } = await supabase
        .from('transactions')
        .insert({
          group_id: selectedGroup.id,
          user_id: user.id,
          type: 'card_spend',
          amount: amountInCents,
          description: spendDescription,
          status: needsApproval ? 'pending' : 'completed',
          merchant_name: spendDescription || 'Tap to Pay',
        });

      if (error) throw error;

      if (needsApproval) {
        toast.success('Transaction pending approval');
      } else {
        toast.success('Payment successful!');
      }

      setShowSpendingDialog(false);
      setSpendAmount('');
      setSpendDescription('');
      loadGroups();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to process payment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center max-w-md">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Groups Yet</h3>
          <p className="text-gray-600 mb-6">Create or join a group to access virtual cards</p>
        </div>
      </div>
    );
  }

  const selectedGroup = groups[selectedGroupIndex];
  const cardNumber = '4532 1234 5678 9010';
  const expiry = '12/25';
  const cvc = '123';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Virtual Cards</h1>
          <p className="text-gray-600 mt-1">Manage your group cards and spending</p>
        </div>

        {groups.length > 1 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {groups.map((group, index) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupIndex(index)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedGroupIndex === index
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <VirtualCard3D
            groupName={selectedGroup.name}
            cardStatus={selectedGroup.card_status}
            cardImageUrl={selectedGroup.card_image_url}
            cardNumber={cardNumber}
            expiry={expiry}
            cvc={cvc}
            onTapToPay={handleTapToPay}
          />

          <div className="mt-8 text-center">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition-colors"
            >
              {showDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              {showDetails ? 'Hide' : 'Show'} Card Details
            </button>
          </div>

          {showDetails && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Card Number</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-gray-900">{cardNumber}</span>
                  <button
                    onClick={() => copyToClipboard(cardNumber.replace(/\s/g, ''), 'Card number')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Expiry Date</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-gray-900">{expiry}</span>
                  <button
                    onClick={() => copyToClipboard(expiry, 'Expiry date')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">CVC</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-gray-900">{cvc}</span>
                  <button
                    onClick={() => copyToClipboard(cvc, 'CVC')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-sm p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Tap to Pay Enabled</h3>
              <p className="text-blue-100 text-sm">Click the EMV chip on the back of your card to make instant payments</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Card Controls
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Card Status</div>
                  <div className="text-sm text-gray-600">Enable or disable card spending</div>
                </div>
                <button
                  onClick={handleCardStatusToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    selectedGroup.card_status === 'active' ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      selectedGroup.card_status === 'active' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="font-medium text-gray-900 mb-2">Group Balance</div>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(selectedGroup.member_balances[user?.id || ''] || 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Spending Limits</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Daily Limit</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(selectedGroup.spending_limits.daily_limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '30%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Monthly Limit</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(selectedGroup.spending_limits.monthly_limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '45%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Per Transaction</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(selectedGroup.spending_limits.per_transaction_limit)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{selectedGroup.member_ids.length} members in this group</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showSpendingDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Tap to Pay</h2>
              <form onSubmit={handleSpendSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={spendAmount}
                      onChange={(e) => setSpendAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Available: {formatCurrency(selectedGroup.member_balances[user?.id || ''] || 0)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={spendDescription}
                    onChange={(e) => setSpendDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="What is this for?"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSpendingDialog(false);
                      setSpendAmount('');
                      setSpendDescription('');
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors"
                  >
                    Pay Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
