'use client';

import { useState, useEffect } from 'react';
import {
  fetchAllSessions,
  deleteSession,
  fetchWorkoutTemplates,
} from '@/utils/adminQueries';
import SessionForm from './SessionForm';
import { formatDate, formatTime } from '@/utils/calendarHelpers';

export default function SessionManager() {
  const [sessions, setSessions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'today'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load sessions and templates in parallel
      const [sessionsResult, templatesResult] = await Promise.all([
        fetchAllSessions(),
        fetchWorkoutTemplates(),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (templatesResult.error) throw templatesResult.error;

      setSessions(sessionsResult.data || []);
      setTemplates(templatesResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSession(null);
    setShowForm(true);
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setShowForm(true);
  };

  const handleDelete = async (session) => {
    const instructorName = session.instructor 
      ? (session.instructor.full_name || session.instructor.username)
      : 'TBA';
    
    if (!confirm(
      `Are you sure you want to delete this session?\n\n` +
      `${session.workout_classes.title}\n` +
      `Instructor: ${instructorName}\n` +
      `Time: ${formatDate(session.start_time)} at ${formatTime(session.start_time)}\n\n` +
      `This will cancel all bookings for this session.`
    )) {
      return;
    }

    try {
      const { error } = await deleteSession(session.id);

      if (error) throw error;

      setSessions(sessions.filter((s) => s.id !== session.id));
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session: ' + err.message);
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingSession(null);
    await loadData(); // Reload all data
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingSession(null);
  };

  // Filter sessions
  const getFilteredSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (filter) {
      case 'today':
        return sessions.filter(s => {
          const sessionDate = new Date(s.start_time);
          return sessionDate >= today && sessionDate < tomorrow;
        });
      case 'upcoming':
        return sessions.filter(s => new Date(s.start_time) >= now);
      case 'all':
      default:
        return sessions;
    }
  };

  const filteredSessions = getFilteredSessions();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex justify-center items-center">
          <div className="text-gray-600">Loading sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Sessions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Schedule workout sessions from templates and assign instructors
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          <span>Schedule Session</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            filter === 'today'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            filter === 'upcoming'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upcoming
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* No Templates Warning */}
      {templates.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>No templates available.</strong> Create workout templates first before scheduling sessions.
          </p>
        </div>
      )}

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No Sessions Scheduled' : `No ${filter} Sessions`}
          </h3>
          <p className="text-gray-600 mb-6">
            {templates.length > 0
              ? 'Schedule your first workout session from a template'
              : 'Create a workout template first, then schedule sessions'}
          </p>
          {templates.length > 0 && (
            <button
              onClick={handleCreate}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Schedule Your First Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const instructorName = session.instructor 
              ? (session.instructor.full_name || session.instructor.username)
              : 'No instructor assigned';
            
            const spotsLeft = session.workout_classes.max_capacity - (session.current_bookings || 0);
            const isFull = spotsLeft <= 0;
            const isAlmostFull = spotsLeft <= 3 && spotsLeft > 0;

            return (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 p-6"
              >
                <div className="flex justify-between items-start">
                  {/* Left: Session Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="bg-blue-50 rounded-lg p-3 text-center min-w-[80px]">
                        <div className="text-2xl font-bold text-blue-600">
                          {new Date(session.start_time).getDate()}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {new Date(session.start_time).toLocaleDateString('en-US', { 
                            month: 'short' 
                          })}
                        </div>
                      </div>

                      {/* Session Details */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {session.workout_classes.title}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>👤</span>
                            <span>{instructorName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🕐</span>
                            <span>
                              {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>{formatDate(session.start_time)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status and Actions */}
                  <div className="flex flex-col items-end gap-3 ml-4">
                    {/* Capacity Badge */}
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isFull
                        ? 'bg-red-100 text-red-800'
                        : isAlmostFull
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isFull 
                        ? 'Full' 
                        : `${spotsLeft}/${session.workout_classes.max_capacity} spots`
                      }
                    </div>

                    {/* Active Status */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      session.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.is_active ? 'Active' : 'Inactive'}
                    </span>

                    {/* Bookings Count */}
                    {session.current_bookings > 0 && (
                      <div className="text-sm text-gray-600">
                        {session.current_bookings} {session.current_bookings === 1 ? 'booking' : 'bookings'}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(session)}
                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(session)}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <SessionForm
          session={editingSession}
          templates={templates}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}