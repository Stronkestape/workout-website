'use client';

import { useState, useEffect } from 'react';
import { createSession, updateSession, fetchInstructors } from '@/utils/adminQueries';
import InstructorSelect from './InstructorSelect';

export default function SessionForm({ session, templates, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    class_id: '',
    start_time: '',
    end_time: '',
    instructor_id: '',
    is_active: true,
  });
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadInstructors();
  }, []);

  useEffect(() => {
    if (session) {
      // Editing existing session
      const startDate = new Date(session.start_time);
      const endDate = new Date(session.end_time);

      setFormData({
        class_id: session.class_id,
        start_time: formatDateTimeLocal(startDate),
        end_time: formatDateTimeLocal(endDate),
        instructor_id: session.instructor_id || '',
        is_active: session.is_active !== false,
      });

      const template = templates.find(t => t.id === session.class_id);
      setSelectedTemplate(template);
    }
  }, [session, templates]);

  const loadInstructors = async () => {
    try {
      const { data, error } = await fetchInstructors();
      
      if (error) throw error;
      
      setInstructors(data || []);
    } catch (err) {
      console.error('Error loading instructors:', err);
      setError('Failed to load instructors');
    } finally {
      setLoadingInstructors(false);
    }
  };

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleTemplateChange = (e) => {
    const templateId = parseInt(e.target.value);
    const template = templates.find(t => t.id === templateId);
    
    setFormData({
      ...formData,
      class_id: templateId,
    });
    
    setSelectedTemplate(template);

    // Auto-calculate end time based on template duration
    if (formData.start_time && template) {
      const startDate = new Date(formData.start_time);
      const endDate = new Date(startDate.getTime() + template.duration * 60000);
      setFormData(prev => ({
        ...prev,
        end_time: formatDateTimeLocal(endDate),
      }));
    }
  };

  const handleStartTimeChange = (e) => {
    const startTime = e.target.value;
    setFormData({
      ...formData,
      start_time: startTime,
    });

    // Auto-calculate end time based on template duration
    if (startTime && selectedTemplate) {
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + selectedTemplate.duration * 60000);
      setFormData(prev => ({
        ...prev,
        end_time: formatDateTimeLocal(endDate),
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.class_id) {
      setError('Please select a workout template');
      setLoading(false);
      return;
    }

    if (!formData.start_time) {
      setError('Start time is required');
      setLoading(false);
      return;
    }

    if (!formData.end_time) {
      setError('End time is required');
      setLoading(false);
      return;
    }

    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);

    if (endDate <= startDate) {
      setError('End time must be after start time');
      setLoading(false);
      return;
    }

    // Check if start time is in the past
    if (!session && startDate < new Date()) {
      setError('Cannot schedule sessions in the past');
      setLoading(false);
      return;
    }

    try {
      const sessionData = {
        class_id: formData.class_id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        instructor_id: formData.instructor_id || null,
        is_active: formData.is_active,
      };

      if (session) {
        // Update existing session
        const { error } = await updateSession(session.id, sessionData);
        if (error) throw error;
      } else {
        // Create new session
        const { error } = await createSession(sessionData);
        if (error) throw error;
      }

      onSubmit();
    } catch (err) {
      console.error('Error saving session:', err);
      setError(err.message || 'Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {session ? 'Edit Session' : 'Schedule New Session'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Workout Template */}
          <div>
            <label
              htmlFor="class_id"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Workout Template *
            </label>
            <select
              id="class_id"
              name="class_id"
              value={formData.class_id}
              onChange={handleTemplateChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              disabled={!!session} // Can't change template when editing
            >
              <option value="">Select a workout template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} ({template.duration} min, max {template.max_capacity} people)
                </option>
              ))}
            </select>
            {session && (
              <p className="text-xs text-gray-500 mt-1">
                Template cannot be changed after session creation
              </p>
            )}
          </div>

          {/* Selected Template Info */}
          {selectedTemplate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                {selectedTemplate.title}
              </h4>
              {selectedTemplate.description && (
                <p className="text-sm text-blue-800 mb-2">
                  {selectedTemplate.description}
                </p>
              )}
              <div className="text-sm text-blue-700">
                Duration: {selectedTemplate.duration} minutes • Capacity: {selectedTemplate.max_capacity} people
              </div>
            </div>
          )}

          {/* Start Time */}
          <div>
            <label
              htmlFor="start_time"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Start Time *
            </label>
            <input
              id="start_time"
              name="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={handleStartTimeChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label
              htmlFor="end_time"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              End Time *
            </label>
            <input
              id="end_time"
              name="end_time"
              type="datetime-local"
              value={formData.end_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-calculated based on template duration, but can be adjusted
            </p>
          </div>

          {/* Instructor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructor (Optional)
            </label>
            {loadingInstructors ? (
              <div className="text-sm text-gray-600">Loading instructors...</div>
            ) : (
              <InstructorSelect
                instructors={instructors}
                value={formData.instructor_id}
                onChange={(value) => setFormData({ ...formData, instructor_id: value })}
              />
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label
              htmlFor="is_active"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Active (visible to users for booking)
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Saving...' : session ? 'Update Session' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}