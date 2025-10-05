'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/browser';
import WorkoutTemplateManager from './components/WorkoutTemplateManager';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('templates');
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminUser();
  }, []);

  const fetchAdminUser = async () => {
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabaseBrowser
          .from('user_profiles')
          .select('username, full_name, user_tier')
          .eq('id', user.id)
          .single();
        
        setAdminUser({ ...user, profile });
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
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'templates', label: 'Workout Templates', icon: '📋' },
    { id: 'sessions', label: 'Manage Sessions', icon: '📅' },
    { id: 'manual-booking', label: 'Manual Booking', icon: '👥' },
    { id: 'session-details', label: 'Session Details', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {adminUser?.profile?.full_name || adminUser?.profile?.username || 'Admin'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                ⚡ Admin
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors
                  border-b-2 -mb-px
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'templates' && <WorkoutTemplateManager />}
        
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Manager</h3>
            <p className="text-gray-600">Coming soon...</p>
          </div>
        )}
        
        {activeTab === 'manual-booking' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Manual Booking</h3>
            <p className="text-gray-600">Coming soon...</p>
          </div>
        )}
        
        {activeTab === 'session-details' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Details</h3>
            <p className="text-gray-600">Coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}