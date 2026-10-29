'use client';

import { useState, useEffect } from 'react';
import { FormInput } from '@/components/FormInput';
import { FormMessage } from '@/components/FormMessage';
import { validateTemplate } from '../../../utils/templateValidation';

export default function WorkoutTemplateForm({ template, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 60,
    max_capacity: 20,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title || '',
        description: template.description || '',
        duration: template.duration || 60,
        max_capacity: template.max_capacity || 20,
      });
    }
  }, [template]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === 'duration' || name === 'max_capacity'
          ? parseInt(value)
          : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validation = validateTemplate(formData);
    setFieldErrors(validation.errors);

    if (!validation.isValid) return;

    setLoading(true);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <FormInput
            id="title"
            name="title"
            label="Workout Title"
            value={formData.title}
            onChange={handleChange}
            error={fieldErrors.title}
            disabled={loading}
            placeholder="e.g., Morning Yoga"
            required
          />

          <FormInput
            id="description"
            name="description"
            label="Description"
            type="textarea"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
            placeholder="Describe the workout type and what participants can expect..."
            rows={4}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              id="duration"
              name="duration"
              label="Duration (minutes)"
              type="number"
              value={formData.duration}
              onChange={handleChange}
              error={fieldErrors.duration}
              disabled={loading}
              min="15"
              max="180"
              required
            />

            <FormInput
              id="max_capacity"
              name="max_capacity"
              label="Max Capacity"
              type="number"
              value={formData.max_capacity}
              onChange={handleChange}
              error={fieldErrors.max_capacity}
              disabled={loading}
              min="1"
              max="100"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This is a template. Create scheduled sessions from this template
              later to assign instructors and set specific dates/times.
            </p>
          </div>

          {error && <FormMessage type="error" message={error} />}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
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
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading
                ? 'Saving...'
                : template
                ? 'Update Template'
                : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
