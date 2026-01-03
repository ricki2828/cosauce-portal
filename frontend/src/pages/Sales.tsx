import { Users, Search, Plus, Building2 } from 'lucide-react';

export function Sales() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Outbound</h1>
          <p className="mt-1 text-gray-600">Research companies and manage your sales pipeline</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search companies..."
          />
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No companies yet</h3>
        <p className="text-gray-600 mb-6">
          Start building your sales pipeline by adding companies to research
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
          Add Your First Company
        </button>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center">
          <Users className="w-5 h-5 text-amber-600 mr-3" />
          <div>
            <p className="font-medium text-amber-800">Full Sales Module Coming Soon</p>
            <p className="text-sm text-amber-700">
              AI-powered company research, contact enrichment, and pipeline tracking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
