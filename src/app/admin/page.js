'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/browser';
import WorkoutTemplateManager from './components/WorkoutTemplateManager';
import SessionManager from './components/SessionManager';
import ManualBookingManager from './components/ManualBookingManager';
import SessionDetailView from './components/SessionDetailView';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('templates');
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminUser();
  }, []);

  const fetchAdminUser = async () => {
    try {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (user) {
        const { data: profile } = await supabaseBrowser
          .from('user_profiles')
          .select('username, full_name, user_tier')
          .eq('id', user.id)
          .single();

        setAdminUser({ ...user, profile });
        if (profile?.user_tier === 'instructor') {
          setActiveTab('sessions');
        }
      }
    } catch (error) {
      console.error('Error fetching admin user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const isInstructor = adminUser?.profile?.user_tier === 'instructor';

  const tabs = [
    ...(!isInstructor
      ? [{ id: 'templates', label: 'Workout Templates' }]
      : []),
    {
      id: 'sessions',
      label: isInstructor ? 'My Sessions' : 'Manage Sessions',
    },
    { id: 'manual-booking', label: 'Manual Booking' },
    { id: 'session-details', label: 'Session Details' },
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
          <div className="flex overflow-x-auto space-x-1 border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
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
        {activeTab === 'templates' && !isInstructor && (
          <WorkoutTemplateManager />
        )}
        {activeTab === 'sessions' && (
          <SessionManager currentUser={adminUser} />
        )}
        {activeTab === 'manual-booking' && (
          <ManualBookingManager currentUser={adminUser} />
        )}
        {activeTab === 'session-details' && (
          <SessionDetailView currentUser={adminUser} />
        )}
      </div>
    </div>
  );
}
