"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface County {
  id: string;
  name: string;
  state: string;
  active: boolean;
  created_at: string;
}

const CountyManagement: React.FC = () => {
  const [counties, setCounties] = useState<County[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCountyName, setNewCountyName] = useState('');
  const [newCountyState, setNewCountyState] = useState('FL');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCounties();
  }, []);

  const fetchCounties = async () => {
    try {
      const { data, error } = await supabase
        .from('counties')
        .select('*')
        .order('name');

      if (error) throw error;
      setCounties(data || []);
    } catch (err) {
      console.error('Error fetching counties:', err);
      setError('Failed to load counties');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCounty = async () => {
    if (!newCountyName.trim()) {
      setError('County name is required');
      return;
    }

    setError('');
    try {
      const { error } = await supabase
        .from('counties')
        .insert([{
          name: newCountyName.trim(),
          state: newCountyState,
          active: true
        }]);

      if (error) throw error;

      setNewCountyName('');
      setIsAdding(false);
      await fetchCounties();
    } catch (err: any) {
      console.error('Error adding county:', err);
      if (err.message?.includes('duplicate')) {
        setError('This county already exists');
      } else {
        setError('Failed to add county');
      }
    }
  };

  const handleToggleActive = async (county: County) => {
    try {
      const { error } = await supabase
        .from('counties')
        .update({ active: !county.active })
        .eq('id', county.id);

      if (error) throw error;
      await fetchCounties();
    } catch (err) {
      console.error('Error toggling county:', err);
      setError('Failed to update county');
    }
  };

  const handleDeleteCounty = async (county: County) => {
    if (!confirm(`Are you sure you want to delete ${county.name}? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('counties')
        .delete()
        .eq('id', county.id);

      if (error) throw error;
      await fetchCounties();
    } catch (err) {
      console.error('Error deleting county:', err);
      setError('Failed to delete county. It may be in use by properties.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading counties...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            County Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage available counties for property listings
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add County
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add County Form */}
      {isAdding && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Add New County
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                County Name *
              </label>
              <input
                type="text"
                value={newCountyName}
                onChange={(e) => setNewCountyName(e.target.value)}
                placeholder="e.g., Martin"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                State
              </label>
              <input
                type="text"
                value={newCountyState}
                onChange={(e) => setNewCountyState(e.target.value)}
                placeholder="FL"
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddCounty}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save County
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewCountyName('');
                setError('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Counties List */}
      <div className="space-y-2">
        {counties.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No counties added yet. Click "Add County" to get started.
          </p>
        ) : (
          counties.map((county) => (
            <div
              key={county.id}
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {county.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {county.state}
                  </p>
                </div>
                {county.active ? (
                  <span className="px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(county)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title={county.active ? 'Deactivate' : 'Activate'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {county.active ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteCounty(county)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CountyManagement;
