import { Link, useLocation, Outlet } from 'react-router-dom';
import { FileText, Users, Megaphone, LayoutDashboard, Settings, Flag, UserCog, BarChart3, Users2, DollarSign } from 'lucide-react';
import UserMenu from './auth/UserMenu';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Priorities', href: '/priorities', icon: Flag },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'Contracts', href: '/contracts', icon: FileText },
  { name: 'Sales', href: '/sales', icon: Users },
  { name: 'Outreach', href: '/outreach', icon: Megaphone },
  { name: 'People', href: '/people', icon: UserCog },
  { name: 'Talent', href: '/talent', icon: Users2 },
  { name: 'Business Updates', href: '/business-updates', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-gray-900">CoSauce</span>
          <span className="ml-2 text-sm text-gray-500">Portal</span>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <UserMenu />
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
