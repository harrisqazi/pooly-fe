import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CheckCircle, CreditCard, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';

export const Sidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/groups', label: 'Groups', icon: Users },
    { path: '/approvals', label: 'Approvals', icon: CheckCircle },
    { path: '/cards', label: 'Cards', icon: CreditCard },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl">
            P
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Pooly
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive(item.path)
                  ? 'bg-green-50 text-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};
