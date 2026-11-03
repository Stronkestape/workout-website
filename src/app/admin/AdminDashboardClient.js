'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import WorkoutTemplateManager from './components/WorkoutTemplateManager';
import SessionManager from './components/SessionManager';

const SessionDetailView = dynamic(
  () => import('./components/SessionDetailView'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-8 min-h-[300px] flex items-center justify-center">
        <div className="text-stone-600 font-medium text-sm">Loading session details...</div>
      </div>
    ),
  }
);

export default function AdminDashboardClient({
  initialUser,
  initialSessions = null,
  initialTemplates = null,
  serverNow = null,
}) {
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isInstructor ? 'Coach Dashboard' : 'Admin Dashboard'}
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5 sm:mt-1">
                  Signed in as: <span className="font-semibold text-gray-800">{adminUser?.email}</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                    {adminUser?.profile?.user_tier || 'admin'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - responsive horizontal scroll on mobile */}
          <div className="border-t border-gray-200 -mb-px flex space-x-2 sm:space-x-8 overflow-x-auto no-scrollbar">
            {tabs
              .filter((tab) => !(isInstructor && tab.id === 'templates'))
              .map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-3 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                      isActive
                        ? 'border-warm-terracotta text-[#8c3010]'
                        : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Templates Tab */}
        {!isInstructor && activeTab === 'templates' && (
          <WorkoutTemplateManager
            currentUser={adminUser}
            initialTemplates={initialTemplates}
          />
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <SessionManager
            currentUser={adminUser}
            initialSessions={initialSessions}
            initialTemplates={initialTemplates}
            serverNow={serverNow}
          />
        )}

        {/* Session Details Tab */}
        {activeTab === 'session-details' && (
          <SessionDetailView
            currentUser={adminUser}
            initialSessions={initialSessions}
            serverNow={serverNow}
          />
        )}
      </div>
    </div>
  );
}
