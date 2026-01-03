import { useState } from 'react';
import { FileText, Sparkles, Download, Loader2 } from 'lucide-react';
import { contractsApi } from '../lib/api';

type ContractType = 'msa' | 'sow' | 'shortform';

const contractTypes = [
  {
    id: 'msa' as ContractType,
    name: 'Master Services Agreement',
    description: 'Standard MSA for ongoing client relationships',
  },
  {
    id: 'sow' as ContractType,
    name: 'Statement of Work',
    description: 'Project-specific scope, deliverables, and terms',
  },
  {
    id: 'shortform' as ContractType,
    name: 'Short Form Agreement',
    description: 'Simplified contract for smaller engagements',
  },
];

export function Contracts() {
  const [selectedType, setSelectedType] = useState<ContractType>('msa');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [aiDraft, setAiDraft] = useState('');

  // Form fields
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Singapore');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [scopeBullets, setScopeBullets] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [timeline, setTimeline] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [totalValue, setTotalValue] = useState('');

  const handleAIDraft = async () => {
    if (!projectName || !scopeBullets) {
      alert('Please enter project name and scope bullets');
      return;
    }
    setIsDrafting(true);
    try {
      const response = await contractsApi.draft({
        contract_type: selectedType.toUpperCase(),
        project_name: projectName,
        scope_bullets: scopeBullets,
      });
      setAiDraft(response.data.draft);
      setScopeOfWork(response.data.draft);
    } catch (error) {
      console.error('Failed to generate draft:', error);
      alert('Failed to generate AI draft. Check console for details.');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleGenerate = async () => {
    if (!clientName) {
      alert('Please enter client name');
      return;
    }

    setIsGenerating(true);
    try {
      let response;

      if (selectedType === 'msa') {
        response = await contractsApi.generateMSA({
          client_name: clientName,
          jurisdiction,
        });
      } else if (selectedType === 'sow') {
        response = await contractsApi.generateSOW({
          client_name: clientName,
          project_name: projectName,
          scope_of_work: scopeOfWork,
          deliverables,
          timeline,
          payment_terms: paymentTerms,
        });
      } else {
        response = await contractsApi.generateShortForm({
          client_name: clientName,
          project_name: projectName,
          scope_summary: scopeOfWork,
          total_value: totalValue,
        });
      }

      // Download the file
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType.toUpperCase()}_${clientName.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Failed to generate contract:', error);
      alert('Failed to generate contract. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Contract Generator</h1>
        <p className="mt-1 text-gray-600">Generate professional contracts with AI assistance</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Contract Type Selection */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Contract Type</h2>
          <div className="space-y-3">
            {contractTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedType === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <FileText className={`w-5 h-5 mr-3 ${
                    selectedType === type.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      selectedType === type.id ? 'text-blue-900' : 'text-gray-900'
                    }`}>{type.name}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Contract Details</h2>

          <div className="space-y-6">
            {/* Client Name - Always shown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Acme Corporation"
              />
            </div>

            {/* MSA-specific fields */}
            {selectedType === 'msa' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jurisdiction
                </label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Singapore">Singapore</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="Australia">Australia</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                </select>
              </div>
            )}

            {/* SOW/ShortForm-specific fields */}
            {(selectedType === 'sow' || selectedType === 'shortform') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Digital Transformation Initiative"
                  />
                </div>

                {/* AI Draft Section */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Sparkles className="w-5 h-5 text-purple-500 mr-2" />
                      <span className="font-medium text-gray-900">AI Scope Drafting</span>
                    </div>
                    <button
                      onClick={handleAIDraft}
                      disabled={isDrafting}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
                    >
                      {isDrafting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {isDrafting ? 'Drafting...' : 'Generate Draft'}
                    </button>
                  </div>
                  <textarea
                    value={scopeBullets}
                    onChange={(e) => setScopeBullets(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={3}
                    placeholder="Enter bullet points for scope, e.g.:&#10;- Build customer portal&#10;- Integrate with Salesforce&#10;- Training for 20 users"
                  />
                  {aiDraft && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">AI Generated Draft:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiDraft}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scope of Work
                  </label>
                  <textarea
                    value={scopeOfWork}
                    onChange={(e) => setScopeOfWork(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Detailed scope of work..."
                  />
                </div>
              </>
            )}

            {/* SOW-only fields */}
            {selectedType === 'sow' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deliverables
                  </label>
                  <textarea
                    value={deliverables}
                    onChange={(e) => setDeliverables(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="List of deliverables..."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeline
                    </label>
                    <input
                      type="text"
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 12 weeks"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Net 30"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ShortForm-only fields */}
            {selectedType === 'shortform' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Value
                </label>
                <input
                  type="text"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., $25,000"
                />
              </div>
            )}

            {/* Generate Button */}
            <div className="pt-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !clientName}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Generate & Download Contract
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
