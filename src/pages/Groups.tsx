import { useState, useEffect } from 'react';
import { Plus, Copy, Crown, Users as UsersIcon, CreditCard, Settings as SettingsIcon, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  description: string | null;
  group_code: string;
  owner_id: string;
  member_ids: string[];
  approval_threshold: number;
  total_balance: number;
  member_balances: Record<string, number>;
  spending_limits: {
    daily_limit: number;
    monthly_limit: number;
    per_transaction_limit: number;
  };
  card_status: string;
  created_at: string;
}

export const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'member'>('all');

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    approvalThreshold: 1,
    dailyLimit: 50000,
    monthlyLimit: 500000,
    perTransactionLimit: 10000,
  });

  const [joinCode, setJoinCode] = useState('');

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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const groupCode = await generateUniqueCode();

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: createForm.name,
          description: createForm.description,
          group_code: groupCode,
          owner_id: user.id,
          member_ids: [user.id],
          approval_threshold: createForm.approvalThreshold,
          total_balance: 0,
          member_balances: { [user.id]: 0 },
          spending_limits: {
            daily_limit: createForm.dailyLimit,
            monthly_limit: createForm.monthlyLimit,
            per_transaction_limit: createForm.perTransactionLimit,
          },
          card_status: 'active',
          blocked_mcc: [],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Group created successfully!');
      setGroups([data, ...groups]);
      setShowCreateDialog(false);
      setCreateForm({
        name: '',
        description: '',
        approvalThreshold: 1,
        dailyLimit: 50000,
        monthlyLimit: 500000,
        perTransactionLimit: 10000,
      });
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('group_code', joinCode.toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!group) {
        toast.error('Invalid group code');
        return;
      }

      if (group.member_ids.includes(user.id)) {
        toast.error('You are already a member of this group');
        return;
      }

      const updatedMemberIds = [...group.member_ids, user.id];
      const updatedBalances = { ...group.member_balances, [user.id]: 0 };

      await supabase
        .from('groups')
        .update({
          member_ids: updatedMemberIds,
          member_balances: updatedBalances,
        })
        .eq('id', group.id);

      toast.success('Joined group successfully!');
      loadGroups();
      setShowJoinDialog(false);
      setJoinCode('');
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  const generateUniqueCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { data } = await supabase
        .from('groups')
        .select('id')
        .eq('group_code', code)
        .maybeSingle();

      if (!data) isUnique = true;
    }

    return code;
  };

  const copyGroupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Group code copied to clipboard');
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const filteredGroups = groups.filter(group => {
    if (activeTab === 'owned') return group.owner_id === user?.id;
    if (activeTab === 'member') return group.owner_id !== user?.id;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-600 mt-1">Manage your pooled wallets</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinDialog(true)}
              className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
            >
              Join Group
            </button>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Group
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8">
              {[
                { key: 'all', label: 'All Groups' },
                { key: 'owned', label: 'Owned Groups' },
                { key: 'member', label: 'Member Groups' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-600 mb-6">Create your first group to get started with pooled wallets</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors"
            >
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map(group => (
              <div key={group.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
                      {group.owner_id === user?.id && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600">{group.description}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    group.card_status === 'active' ? 'bg-green-100 text-green-700' :
                    group.card_status === 'paused' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {group.card_status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-600">Your Balance</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(group.member_balances[user?.id || ''] || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UsersIcon className="w-4 h-4" />
                    <span>{group.member_ids.length} members</span>
                    <span className="mx-2">•</span>
                    <span>{group.approval_threshold} approval{group.approval_threshold > 1 ? 's' : ''} needed</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyGroupCode(group.group_code)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {group.group_code}
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Daily: {formatCurrency(group.spending_limits.daily_limit)}</div>
                    <div>Monthly: {formatCurrency(group.spending_limits.monthly_limit)}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/cards')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Cards
                  </button>
                  <button
                    onClick={() => navigate('/funding')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Add Money
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Group</h2>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="My Group"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="What is this group for?"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Approval Threshold</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={createForm.approvalThreshold}
                      onChange={(e) => setCreateForm({ ...createForm, approvalThreshold: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of approvals needed for transactions</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Spending Limits</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Daily Limit</label>
                        <input
                          type="number"
                          value={createForm.dailyLimit / 100}
                          onChange={(e) => setCreateForm({ ...createForm, dailyLimit: parseFloat(e.target.value) * 100 })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Monthly Limit</label>
                        <input
                          type="number"
                          value={createForm.monthlyLimit / 100}
                          onChange={(e) => setCreateForm({ ...createForm, monthlyLimit: parseFloat(e.target.value) * 100 })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Per Transaction</label>
                        <input
                          type="number"
                          value={createForm.perTransactionLimit / 100}
                          onChange={(e) => setCreateForm({ ...createForm, perTransactionLimit: parseFloat(e.target.value) * 100 })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateDialog(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors"
                    >
                      Create Group
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showJoinDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Join Group</h2>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase text-center text-2xl tracking-widest font-mono"
                    placeholder="ABC123"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowJoinDialog(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors"
                  >
                    Join Group
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
