'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchUsers } from '@/utils/adminQueries';

export default function UserSearchSelect({ 
  onUserSelect, 
  excludeUserIds = [], 
  placeholder = "Search by username, email, or name...",
  disabled = false 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSearch = useCallback(async (value) => {
    try {
      setLoading(true);
      const { data, error } = await searchUsers(value.trim());

      if (error) throw error;

      // Filter out excluded users
      const filteredResults = (data || []).filter(
        user => !excludeUserIds.includes(user.id)
      );

      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [excludeUserIds]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        handleSearch(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce for 300ms

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, handleSearch]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchTerm(user.username);
    setSearchResults([]);
    onUserSelect(user);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setSearchTerm('');
    setSearchResults([]);
    onUserSelect(null);
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {/* Clear Button */}
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-10 top-2.5 text-gray-400 hover:text-gray-600"
          >
            x
          </button>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {searchResults.map((user) => {
            const isExcluded = excludeUserIds.includes(user.id);

            return (
              <button
                key={user.id}
                onClick={() => !isExcluded && handleSelectUser(user)}
                disabled={isExcluded}
                className={`w-full text-left p-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                  isExcluded 
                    ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                    : 'hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* User Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {user.username}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {user.email}
                    </div>
                    {user.full_name && (
                      <div className="text-xs text-gray-500 truncate">
                        {user.full_name}
                      </div>
                    )}
                  </div>

                  {/* Excluded Badge */}
                  {isExcluded && (
                    <span className="text-xs text-orange-600 font-medium flex-shrink-0">
                      Already booked
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {searchTerm.length >= 2 && searchResults.length === 0 && !loading && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          No users found matching &quot;{searchTerm}&quot;
        </div>
      )}

      {/* Selected User Card */}
      {selectedUser && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-blue-900">
                  {selectedUser.username}
                </div>
                <div className="text-sm text-blue-700">
                  {selectedUser.email}
                </div>
                {selectedUser.full_name && (
                  <div className="text-xs text-blue-600">
                    {selectedUser.full_name}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClear}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Helper Text */}
      {!disabled && searchTerm.length < 2 && searchTerm.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}