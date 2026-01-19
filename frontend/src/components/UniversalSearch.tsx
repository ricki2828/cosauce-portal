import { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  url?: string;
  data?: any;
}

export function UniversalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await api.get('/api/search', {
        params: { q: searchQuery }
      });
      setResults(response.data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.length > 0);

    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const getResultIcon = (type: string) => {
    const icons: Record<string, string> = {
      priority: '🎯',
      requisition: '👥',
      hire: '🎓',
      opportunity: '💼',
      metric: '📊',
      account: '🏢',
      agent: '👤',
    };
    return icons[type] || '📄';
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {searching ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          placeholder="Search priorities, people, metrics, opportunities..."
          className="block w-full pl-10 pr-10 py-2.5 md:py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Results */}
          <div className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-[70vh] md:max-h-96 overflow-y-auto">
            {searching && (
              <div className="px-4 py-8 text-center">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                <p className="mt-2 text-sm text-gray-600">Searching...</p>
              </div>
            )}

            {!searching && results.length === 0 && query && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">No results found for "{query}"</p>
                <p className="mt-1 text-xs text-gray-400">Try searching for priorities, requisitions, new hires, or opportunities</p>
              </div>
            )}

            {!searching && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <a
                    key={`${result.type}-${result.id}-${index}`}
                    href={result.url || '#'}
                    onClick={() => setIsOpen(false)}
                    className="block px-3 md:px-4 py-3 md:py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start gap-2 md:gap-3">
                      <span className="text-xl md:text-2xl flex-shrink-0">{getResultIcon(result.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 uppercase">{result.type}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-gray-600 truncate">{result.subtitle}</p>
                        )}
                        {result.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.description}</p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
