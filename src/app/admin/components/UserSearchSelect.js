'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchUsers } from '@/utils/adminQueries';

export default function UserSearchSelect({
  onUserSelect,
  excludeUserIds = [],
  placeholder = 'Keresés felhasználónév vagy teljes név alapján...',
  disabled = false,
  resetKey = 0,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Reset internal state when parent requests a reset (e.g. after successful booking)
  useEffect(() => {
    if (resetKey > 0) {
      setSelectedUser(null);
      setSearchTerm('');
      setSearchResults([]);
      setIsOpen(false);
    }
  }, [resetKey]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearch = useCallback(
    async (value) => {
      try {
        setLoading(true);
        const { data, error } = await searchUsers(value.trim());

        if (error) throw error;

        // In-flight guard: if input was cleared while the request was in-flight, discard
        if (!inputRef.current?.value || inputRef.current.value.trim().length < 2) {
          return;
        }

        // Keep all matches so existing attendees render with disabled state & 'Már jelentkezett' badge
        setSearchResults(data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // Only search if user actually typed a query and no user is currently chosen
    if (selectedUser) return;

    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        handleSearch(searchTerm);
      } else {
        setSearchResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedUser, handleSearch]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchTerm('');
    setSearchResults([]);
    setIsOpen(false); // Explicitly close dropdown
    onUserSelect(user);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setSearchTerm('');
    setSearchResults([]);
    setIsOpen(false);
    onUserSelect(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* If a user is selected, show the Selected User Card */}
      {selectedUser ? (
        <div className="bg-stone-50 border border-green-600/40 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs">
              {(selectedUser.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-stone-900 truncate">
                  @{selectedUser.username}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">
                  Kiválasztva
                </span>
              </div>
              {selectedUser.full_name && (
                <div className="text-xs text-stone-600 truncate mt-0.5">
                  {selectedUser.full_name}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-200/80 hover:bg-stone-300 rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Módosítás
          </button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
            <SearchIcon className="w-4 h-4" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsOpen(true);
            }}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all disabled:bg-stone-100 disabled:cursor-not-allowed"
          />

          {/* Clear search query button */}
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                setIsOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              aria-label="Keresés törlése"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && !selectedUser && (
        <div className="absolute z-20 w-full mt-1.5 bg-white border border-stone-300 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {searchResults.length > 0 ? (
            <ul className="divide-y divide-stone-200" role="listbox">
              {searchResults.map((user) => {
                const isExcluded = excludeUserIds.includes(user.id);

                return (
                  <li key={user.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => !isExcluded && handleSelectUser(user)}
                      disabled={isExcluded}
                      className={`w-full text-left p-3 transition-colors flex items-center justify-between gap-3 ${
                        isExcluded
                          ? 'opacity-50 cursor-not-allowed bg-stone-100'
                          : 'hover:bg-stone-100/80 active:bg-stone-200/70 focus-visible:bg-stone-100 focus-visible:outline-none'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar Initial */}
                        <div className="w-9 h-9 rounded-full bg-stone-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {(user.username || 'U').charAt(0).toUpperCase()}
                        </div>

                        {/* User Identifiers (NO email exposed) */}
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-stone-900 truncate">
                            @{user.username}
                          </div>
                          {user.full_name && (
                            <div className="text-xs text-stone-600 truncate mt-0.5">
                              {user.full_name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Excluded Badge */}
                      {isExcluded && (
                        <span className="text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-medium shrink-0">
                          Már jelentkezett
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            searchTerm.trim().length >= 2 &&
            !loading && (
              <div className="p-4 text-center text-sm text-stone-500 font-medium">
                Nem található felhasználó a megadott keresési kifejezésre.
              </div>
            )
          )}
        </div>
      )}

      {/* Helper text */}
      {!disabled && !selectedUser && searchTerm.length > 0 && searchTerm.length < 2 && (
        <p className="text-xs text-stone-500 mt-1.5 ml-1">
          Írj be legalább 2 karaktert a kereséshez
        </p>
      )}
    </div>
  );
}

function SearchIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function CloseIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
