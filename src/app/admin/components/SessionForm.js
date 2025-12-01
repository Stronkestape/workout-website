'use client';

import { useState, useEffect } from 'react';
import { createSession, updateSession, fetchInstructors } from '@/utils/adminQueries';
import { FormInput } from '@/components/FormInput';
import { FormMessage } from '@/components/FormMessage';
import { validateSession, formatDateTimeLocal, calculateEndTime } from '@/utils/sessionValidation';
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadInstructors();
  }, []);

  useEffect(() => {
    if (session) {
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
      setError('Failed to load instructors');
    } finally {
      setLoadingInstructors(false);
    }
  };

  const handleTemplateChange = (e) => {
    const templateId = parseInt(e.target.value);
    const template = templates.find(t => t.id === templateId);

    setFormData({
      ...formData,
      class_id: templateId,
    });

    setSelectedTemplate(template);

    if (formData.start_time && template) {
      setFormData(prev => ({
        ...prev,
        end_time: calculateEndTime(formData.start_time, template.duration),
      }));
    }
  };

  const handleStartTimeChange = (e) => {
    const startTime = e.target.value;
    setFormData({
      ...formData,
      start_time: startTime,
    });

    if (startTime && selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        end_time: calculateEndTime(startTime, selectedTemplate.duration),
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
    setError('');

    const validation = validateSession(formData, !!session);
    setFieldErrors(validation.errors);

    if (!validation.isValid) return;

    setLoading(true);

    try {
      const sessionData = {
        class_id: formData.class_id,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        instructor_id: formData.instructor_id || null,
        is_active: formData.is_active,
      };

      if (session) {
        const { error } = await updateSession(session.id, sessionData);
        if (error) throw error;
      } else {
        const { error } = await createSession(sessionData);
        if (error) throw error;
      }

      onSubmit();
    } catch (err) {
      setError(err.message || 'Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="class_id" className="block text-sm font-medium text-gray-700 mb-2">
              Workout Template {!session && <span className="text-red-500">*</span>}
            </label>
            <select
              id="class_id"
              name="class_id"
              value={formData.class_id}
              onChange={handleTemplateChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                fieldErrors.class_id
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              required
              disabled={!!session}
            >
              <option value="">Select a workout template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} ({template.duration} min, max {template.max_capacity} people)
                </option>
              ))}
            </select>
            {fieldErrors.class_id && <p className="text-xs text-red-600 mt-1">{fieldErrors.class_id}</p>}
            {session && <p className="text-xs text-gray-500 mt-1">Template cannot be changed after creation</p>}
          </div>

          {selectedTemplate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">{selectedTemplate.title}</h4>
              {selectedTemplate.description && (
                <p className="text-sm text-blue-800 mb-2">{selectedTemplate.description}</p>
              )}
              <div className="text-sm text-blue-700">
                Duration: {selectedTemplate.duration} minutes • Capacity: {selectedTemplate.max_capacity} people
              </div>
            </div>
          )}

          <FormInput
            id="start_time"
            name="start_time"
            label="Start Time"
            type="datetime-local"
            value={formData.start_time}
            onChange={handleStartTimeChange}
            error={fieldErrors.start_time}
            required
          />

          <FormInput
            id="end_time"
            name="end_time"
            label="End Time"
            type="datetime-local"
            value={formData.end_time}
            onChange={handleChange}
            error={fieldErrors.end_time}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructor (Optional)</label>
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

          <div className="flex items-center">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
              Active (visible to users for booking)
            </label>
          </div>

          {error && <FormMessage type="error" message={error} />}

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