import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { KYC } from './pages/KYC';
import { Dashboard } from './pages/Dashboard';
import { Groups } from './pages/Groups';
import { Cards } from './pages/Cards';
import { Approvals } from './pages/Approvals';
import { Funding } from './pages/Funding';
import { Settings } from './pages/Settings';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <KYC />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Groups />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cards"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Cards />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/approvals"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Approvals />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/funding"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Funding />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/withdraw"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Funding />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
