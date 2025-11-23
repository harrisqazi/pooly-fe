import { useState, useEffect } from 'react';
import { Check, X, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Approval {
  id: string;
  transaction_id: string;
  group_id: string;
  requester_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'denied';
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

interface TransactionWithDetails extends Approval {
  transaction?: {
    type: string;
    amount: number;
    description: string | null;
    merchant_name: string | null;
    created_at: string;
  };
  group?: {
    name: string;
  };
  requester?: {
    email: string;
  };
}

export const Approvals = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [approvals, setApprovals] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadApprovals();
    }
  }, [user, activeTab]);

  const loadApprovals = async () => {
    if (!user) return;

    try {
      const query = supabase
        .from('approvals')
        .select(`
          *,
          transaction:transactions(type, amount, description, merchant_name, created_at),
          group:groups(name)
        `)
        .eq('approver_id', user.id)
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        query.eq('status', 'pending');
      } else {
        query.in('status', ['approved', 'denied']);
      }

      const { data, error } = await query;

      if (error) throw error;

      const approvalsWithRequester = await Promise.all(
        (data || []).map(async (approval: any) => {
          const { data: userData } = await supabase.auth.admin.getUserById(approval.requester_id);
          return {
            ...approval,
            requester: userData?.user ? { email: userData.user.email } : { email: 'Unknown' }
          };
        })
      );

      setApprovals(approvalsWithRequester);
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string, transactionId: string, groupId: string) => {
    setProcessingId(approvalId);

    try {
      await supabase
        .from('approvals')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          notes: notes[approvalId] || null
        })
        .eq('id', approvalId);

      const { data: transaction } = await supabase
        .from('transactions')
        .select('approval_count, approved_by')
        .eq('id', transactionId)
        .single();

      if (transaction) {
        const newApprovalCount = (transaction.approval_count || 0) + 1;
        const newApprovedBy = [...(transaction.approved_by || []), user!.id];

        await supabase
          .from('transactions')
          .update({
            approval_count: newApprovalCount,
            approved_by: newApprovedBy
          })
          .eq('id', transactionId);

        const { data: group } = await supabase
          .from('groups')
          .select('approval_threshold')
          .eq('id', groupId)
          .single();

        if (group && newApprovalCount >= group.approval_threshold) {
          await supabase
            .from('transactions')
            .update({ status: 'approved' })
            .eq('id', transactionId);
        }
      }

      toast.success('Transaction approved');
      loadApprovals();
    } catch (error) {
      console.error('Error approving transaction:', error);
      toast.error('Failed to approve transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (approvalId: string, transactionId: string) => {
    setProcessingId(approvalId);

    try {
      await supabase
        .from('approvals')
        .update({
          status: 'denied',
          approved_at: new Date().toISOString(),
          notes: notes[approvalId] || null
        })
        .eq('id', approvalId);

      const { data: transaction } = await supabase
        .from('transactions')
        .select('denied_by')
        .eq('id', transactionId)
        .single();

      if (transaction) {
        const newDeniedBy = [...(transaction.denied_by || []), user!.id];

        await supabase
          .from('transactions')
          .update({
            denied_by: newDeniedBy,
            status: 'denied'
          })
          .eq('id', transactionId);
      }

      toast.success('Transaction denied');
      loadApprovals();
    } catch (error) {
      console.error('Error denying transaction:', error);
      toast.error('Failed to deny transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const getTypeIcon = (type: string) => {
    return type === 'card_spend' ? '💳' : type === 'withdrawal' ? '💸' : '💰';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  const stats = {
    pending: approvals.filter(a => a.status === 'pending').length,
    approvedToday: approvals.filter(a =>
      a.status === 'approved' &&
      a.approved_at &&
      new Date(a.approved_at).toDateString() === new Date().toDateString()
    ).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Approvals</h1>
          <p className="text-gray-600 mt-1">Review and manage transaction approvals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.approvedToday}</div>
                <div className="text-sm text-gray-600">Approved Today</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8">
              {[
                { key: 'pending', label: 'Pending', count: stats.pending },
                { key: 'history', label: 'History' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                    activeTab === tab.key
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {approvals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">
              {activeTab === 'pending'
                ? 'No pending approvals at the moment'
                : 'No approval history yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div key={approval.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getTypeIcon(approval.transaction?.type || '')}</span>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {approval.transaction?.merchant_name || approval.transaction?.description || approval.transaction?.type}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {approval.group?.name} • Requested by {approval.requester?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(approval.transaction?.amount || 0)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {approval.transaction?.created_at && format(new Date(approval.transaction.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>

                {approval.status === 'pending' ? (
                  <div className="space-y-3">
                    <textarea
                      value={notes[approval.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [approval.id]: e.target.value })}
                      placeholder="Add a note (optional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={2}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDeny(approval.id, approval.transaction_id)}
                        disabled={processingId === approval.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-500 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                        Deny
                      </button>
                      <button
                        onClick={() => handleApprove(approval.id, approval.transaction_id, approval.group_id)}
                        disabled={processingId === approval.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-5 h-5" />
                        Approve
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                        approval.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {approval.status === 'approved' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {approval.status === 'approved' ? 'Approved' : 'Denied'}
                      </span>
                      {approval.approved_at && (
                        <span className="text-sm text-gray-500">
                          {format(new Date(approval.approved_at), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                    {approval.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Your note:</div>
                        <div className="text-sm text-gray-900">{approval.notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
