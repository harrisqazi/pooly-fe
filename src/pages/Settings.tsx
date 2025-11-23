import { useState, useEffect } from 'react';
import { Shield, Bell, Lock, User, CreditCard, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentProvider, setPaymentProvider] = useState<'orum' | 'astra' | 'ach_only'>('orum');
  const [kycStatus, setKycStatus] = useState('required');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('users_extended')
        .select('settings, kyc_status')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        if (data.settings?.payment_provider) {
          setPaymentProvider(data.settings.payment_provider);
        }
        setKycStatus(data.kyc_status || 'required');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handlePaymentProviderChange = async (provider: typeof paymentProvider) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: existingUser } = await supabase
        .from('users_extended')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from('users_extended')
          .update({
            settings: { payment_provider: provider }
          })
          .eq('id', user.id);
      } else {
        await supabase
          .from('users_extended')
          .insert({
            id: user.id,
            settings: { payment_provider: provider },
            kyc_status: 'required'
          });
      }

      setPaymentProvider(provider);
      toast.success('Payment provider updated');
    } catch (error) {
      console.error('Error updating payment provider:', error);
      toast.error('Failed to update payment provider');
    } finally {
      setLoading(false);
    }
  };

  const getKycStatusBadge = () => {
    const styles = {
      required: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Required' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' }
    };

    const style = styles[kycStatus as keyof typeof styles] || styles.required;

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-green-600" />
              Payment Provider
            </h2>

            <div className="space-y-4">
              <div
                onClick={() => !loading && handlePaymentProviderChange('orum')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentProvider === 'orum'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">Orum</h3>
                  {paymentProvider === 'orum' && (
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">Instant transfers via FedNow and RTP, plus ACH</p>
              </div>

              <div
                onClick={() => !loading && handlePaymentProviderChange('astra')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentProvider === 'astra'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">Astra</h3>
                  {paymentProvider === 'astra' && (
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">Push to debit and ACH transfers</p>
              </div>

              <div
                onClick={() => !loading && handlePaymentProviderChange('ach_only')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentProvider === 'ach_only'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">ACH Only</h3>
                  {paymentProvider === 'ach_only' && (
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">Standard ACH transfers only (1-3 business days)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Bell className="w-6 h-6 text-green-600" />
              Notifications
            </h2>

            <div className="space-y-4">
              {[
                { label: 'Email Notifications', description: 'Receive updates via email' },
                { label: 'Push Notifications', description: 'Get notifications on your device' },
                { label: 'SMS Notifications', description: 'Receive text message alerts' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                  <button
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6 text-green-600" />
              Security
            </h2>

            <div className="space-y-4">
              {[
                { label: 'Two-Factor Authentication', description: 'Add an extra layer of security' },
                { label: 'Biometric Login', description: 'Use fingerprint or face recognition' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                  <button
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-green-600" />
              Account Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <div className="mt-1 text-gray-900 font-medium">{user?.email}</div>
              </div>

              <div>
                <label className="text-sm text-gray-600">KYC Status</label>
                <div className="mt-1">{getKycStatusBadge()}</div>
                {kycStatus !== 'approved' && (
                  <button
                    onClick={() => navigate('/kyc')}
                    className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Complete verification
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Our support team is here to help you with any questions or issues.
                </p>
                <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
