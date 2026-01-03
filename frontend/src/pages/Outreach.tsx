import { Megaphone, Plus, Mail, Linkedin } from 'lucide-react';

export function Outreach() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Campaigns</h1>
          <p className="mt-1 text-gray-600">Manage automated LinkedIn and email campaigns</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </button>
      </div>

      {/* Campaign Types */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="p-6 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <Linkedin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">LinkedIn Outreach</h3>
              <p className="text-sm text-gray-500">Connection requests & messages</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Automated connection requests with personalized follow-up sequences
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Email Campaigns</h3>
              <p className="text-sm text-gray-500">Cold email sequences</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Multi-step email sequences with tracking and follow-ups
          </p>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Megaphone className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No active campaigns</h3>
        <p className="text-gray-600 mb-6">
          Create your first outreach campaign to start connecting with prospects
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
          Create Campaign
        </button>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center">
          <Megaphone className="w-5 h-5 text-amber-600 mr-3" />
          <div>
            <p className="font-medium text-amber-800">Full Outreach Module Coming Soon</p>
            <p className="text-sm text-amber-700">
              Template editor, AI personalization, and campaign analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
