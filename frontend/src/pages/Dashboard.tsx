import { FileText, Users, Megaphone, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  {
    name: 'Contract Generator',
    description: 'Generate MSA, SOW, and Short Form contracts with AI-assisted scope drafting',
    icon: FileText,
    href: '/contracts',
    status: 'ready',
    color: 'bg-blue-500',
  },
  {
    name: 'Sales Outbound',
    description: 'Research companies, manage contacts, and track sales pipeline',
    icon: Users,
    href: '/sales',
    status: 'coming',
    color: 'bg-green-500',
  },
  {
    name: 'Outreach Campaigns',
    description: 'Automated LinkedIn and email outreach with templates',
    icon: Megaphone,
    href: '/outreach',
    status: 'coming',
    color: 'bg-purple-500',
  },
];

export function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Welcome to the CoSauce Portal</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link
            key={module.name}
            to={module.href}
            className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-lg ${module.color}`}>
                <module.icon className="w-6 h-6 text-white" />
              </div>
              {module.status === 'coming' && (
                <span className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                  Coming Soon
                </span>
              )}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{module.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{module.description}</p>
            <div className="mt-4 flex items-center text-sm font-medium text-blue-600">
              {module.status === 'ready' ? 'Open' : 'View'}
              <ArrowRight className="ml-1 w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Contracts Generated</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Companies Tracked</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Active Campaigns</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Messages Sent</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
      </div>
    </div>
  );
}
