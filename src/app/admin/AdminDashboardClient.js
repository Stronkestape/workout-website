'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const WorkoutTemplateManager = dynamic(
  () => import('./components/WorkoutTemplateManager'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-8 min-h-[300px] flex items-center justify-center">
        <div className="text-stone-500 font-medium text-sm">Sablonok betöltése...</div>
      </div>
    ),
  }
);

const SessionManager = dynamic(
  () => import('./components/SessionManager'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-8 min-h-[300px] flex items-center justify-center">
        <div className="text-stone-500 font-medium text-sm">Edzések betöltése...</div>
      </div>
    ),
  }
);

const SessionDetailView = dynamic(
  () => import('./components/SessionDetailView'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-8 min-h-[300px] flex items-center justify-center">
        <div className="text-stone-500 font-medium text-sm">Részletek betöltése...</div>
      </div>
    ),
  }
);

export default function AdminDashboardClient({ initialUser }) {
  const isInstructor = initialUser?.profile?.user_tier === 'instructor';
  const [activeTab, setActiveTab] = useState(isInstructor ? 'sessions' : 'templates');
  const adminUser = initialUser;

  const tabs = [
    { id: 'templates', label: 'Workout Templates' },
    {
      id: 'sessions',
      label: isInstructor ? 'My Sessions' : 'Manage Sessions',
    },
    { id: 'session-details', label: 'Session Details & Bookings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-4 sm:py-6">
            <div className="flex items-center justify-between sm:block">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isInstructor ? 'Instructor Dashboard' : 'Admin Dashboard'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Welcome back,{' '}
                  {adminUser?.profile?.full_name ||
                    adminUser?.profile?.username ||
                    (isInstructor ? 'Coach' : 'Admin')}
                </p>
              </div>
              <span
                className={`sm:hidden px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                  isInstructor
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {isInstructor ? 'Instructor' : 'Admin'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isInstructor
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {isInstructor ? 'Instructor' : 'Admin'}
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex overflow-x-auto overflow-y-hidden scrollbar-hidden space-x-1 border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap
                  border-b-2 -mb-px
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'templates' && (
          <WorkoutTemplateManager currentUser={adminUser} />
        )}
        {activeTab === 'sessions' && (
          <SessionManager currentUser={adminUser} />
        )}
        {activeTab === 'session-details' && (
          <SessionDetailView currentUser={adminUser} />
        )}
      </div>
    </div>
  );
}
