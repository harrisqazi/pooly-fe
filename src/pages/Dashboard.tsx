import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, Clock, TrendingUp, Plus, ArrowUpRight, ArrowDownRight, CreditCard, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { format } from 'date-fns';

interface StatsData {
  totalBalance: number;
  activeGroups: number;
  pendingApprovals: number;
  monthlySpend: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  merchant_name: string | null;
  status: string;
  created_at: string;
  group_id: string;
}

interface Group {
  id: string;
  name: string;
  total_balance: number;
  member_balances: Record<string, number>;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData>({ totalBalance: 0, activeGroups: 0, pendingApprovals: 0, monthlySpend: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string>('required');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [kycData, groupsData, transactionsData, approvalsData] = await Promise.all([
        supabase.from('users_extended').select('kyc_status').eq('id', user.id).maybeSingle(),
        supabase.from('groups').select('*').or(`owner_id.eq.${user.id},member_ids.cs.["${user.id}"]`),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('approvals').select('*').eq('approver_id', user.id).eq('status', 'pending')
      ]);

      if (kycData.data) {
        setKycStatus(kycData.data.kyc_status);
      }

      if (groupsData.data) {
        setGroups(groupsData.data);
        const totalBalance = groupsData.data.reduce((sum, group) => {
          const userBalance = group.member_balances[user.id] || 0;
          return sum + userBalance;
        }, 0);

        setStats({
          totalBalance,
          activeGroups: groupsData.data.length,
          pendingApprovals: approvalsData.data?.length || 0,
          monthlySpend: 0
        });
      }

      if (transactionsData.data) {
        setTransactions(transactionsData.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownRight className="w-5 h-5 text-green-600" />;
      case 'withdrawal': return <ArrowUpRight className="w-5 h-5 text-red-600" />;
      case 'card_spend': return <CreditCard className="w-5 h-5 text-blue-600" />;
      default: return <DollarSign className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-amber-100 text-amber-700',
      failed: 'bg-red-100 text-red-700',
      approved: 'bg-blue-100 text-blue-700',
      denied: 'bg-gray-100 text-gray-700'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (kycStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">KYC Verification Required</h2>
          <p className="text-gray-600 mb-6">
            You need to complete KYC verification before accessing your dashboard and using Pooly.
          </p>
          <button
            onClick={() => navigate('/kyc')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-colors"
          >
            Complete KYC Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back! 👋</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your pooled wallets</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalBalance)}</div>
            <div className="text-sm text-gray-600 mt-1">Total Balance</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.activeGroups}</div>
            <div className="text-sm text-gray-600 mt-1">Active Groups</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</div>
            <div className="text-sm text-gray-600 mt-1">Pending Approvals</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlySpend)}</div>
            <div className="text-sm text-gray-600 mt-1">Monthly Spend</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/funding')}
                  disabled={groups.length === 0}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-8 h-8 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Add Funds</span>
                </button>
                <button
                  onClick={() => navigate('/withdraw')}
                  disabled={groups.length === 0}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpRight className="w-8 h-8 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">Withdraw</span>
                </button>
                <button
                  onClick={() => navigate('/cards')}
                  disabled={groups.length === 0}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-8 h-8 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Card Controls</span>
                </button>
                <button
                  onClick={() => navigate('/groups')}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <Users className="w-8 h-8 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">New Group</span>
                </button>
              </div>
              {groups.length === 0 && (
                <p className="text-sm text-gray-500 text-center mt-4">Create a group to start using quick actions</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Transactions</h2>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No transactions yet</p>
                  <p className="text-sm text-gray-400 mt-1">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {transaction.merchant_name || transaction.description || transaction.type}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          transaction.type === 'deposit' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Groups Summary</h2>
              {groups.length === 0 ? (
                <div className="text-center py-4">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No groups yet</p>
                  <button
                    onClick={() => navigate('/groups')}
                    className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    Create your first group
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div key={group.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{group.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Your balance: <span className="font-semibold text-green-600">{formatCurrency(group.member_balances[user?.id || ''] || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
