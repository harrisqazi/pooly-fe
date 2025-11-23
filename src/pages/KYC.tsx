import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, Upload, ChevronRight, Clock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

export const KYC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [kycStatus, setKycStatus] = useState('required');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    dateOfBirth: '',
    ssnLastFour: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    documents: [] as string[]
  });

  useEffect(() => {
    loadKycStatus();
  }, [user]);

  const loadKycStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('users_extended')
      .select('kyc_status')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setKycStatus(data.kyc_status);
      if (data.kyc_status === 'approved') {
        navigate('/dashboard');
      } else if (data.kyc_status === 'pending') {
        setStep(3);
      }
    }
  };

  const handleSubmitPersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: existingUser } = await supabase
        .from('users_extended')
        .select('id')
        .eq('id', user!.id)
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from('users_extended')
          .update({
            date_of_birth: formData.dateOfBirth,
            ssn_last_four: formData.ssnLastFour,
            address: {
              street: formData.street,
              city: formData.city,
              state: formData.state,
              zip: formData.zip
            }
          })
          .eq('id', user!.id);
      } else {
        await supabase
          .from('users_extended')
          .insert({
            id: user!.id,
            date_of_birth: formData.dateOfBirth,
            ssn_last_four: formData.ssnLastFour,
            address: {
              street: formData.street,
              city: formData.city,
              state: formData.state,
              zip: formData.zip
            },
            kyc_status: 'required'
          });
      }

      setStep(2);
      toast.success('Personal information saved');
    } catch (error) {
      console.error('Error saving personal info:', error);
      toast.error('Failed to save personal information');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const filePath = `kyc-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const newDocuments = [...formData.documents, publicUrl];
      setFormData({ ...formData, documents: newDocuments });

      await supabase
        .from('users_extended')
        .update({
          kyc_documents: newDocuments,
          kyc_status: 'pending'
        })
        .eq('id', user!.id);

      setStep(3);
      setKycStatus('pending');
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepNumber: number) => {
    if (step > stepNumber) return 'complete';
    if (step === stepNumber) return 'active';
    return 'inactive';
  };

  const progressPercentage = kycStatus === 'approved' ? 100 : step === 3 ? 66 : step === 2 ? 33 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KYC Verification</h1>
          <p className="text-gray-600">Complete verification to start using Pooly</p>
        </div>

        <div className="mb-8">
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-4">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      getStepStatus(stepNum) === 'complete'
                        ? 'bg-green-500 text-white'
                        : getStepStatus(stepNum) === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {getStepStatus(stepNum) === 'complete' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span className="text-xs text-gray-600 text-center">
                    {stepNum === 1 ? 'Personal Info' : stepNum === 2 ? 'Documents' : 'Review'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleSubmitPersonalInfo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last 4 digits of SSN</label>
              <input
                type="text"
                required
                maxLength={4}
                pattern="[0-9]{4}"
                value={formData.ssnLastFour}
                onChange={(e) => setFormData({ ...formData, ssnLastFour: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                required
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
              <input
                type="text"
                required
                pattern="[0-9]{5}"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="12345"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Continue'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Government ID</h3>
              <p className="text-gray-600">Please upload a clear photo of your driver's license or passport</p>
            </div>

            <label className="block">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={loading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
              />
            </label>

            {loading && (
              <div className="text-center text-gray-600">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                <p>Uploading...</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6">
            {kycStatus === 'pending' && (
              <>
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Pending</h3>
                  <p className="text-gray-600">
                    Your documents are being reviewed. This usually takes 24-48 hours.
                    We'll notify you once your verification is complete.
                  </p>
                </div>
              </>
            )}
            {kycStatus === 'approved' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Complete!</h3>
                  <p className="text-gray-600">You're all set to start using Pooly</p>
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </>
            )}
            {kycStatus === 'failed' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h3>
                  <p className="text-gray-600">
                    We couldn't verify your information. Please contact support or try again.
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
