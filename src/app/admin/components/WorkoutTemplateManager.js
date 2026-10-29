'use client';

import { useState, useEffect } from 'react';
import {
  fetchWorkoutTemplates,
  createWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
} from '@/utils/adminQueries';
import WorkoutTemplateForm from './WorkoutTemplateForm';
import ConfirmModal from '@/components/ConfirmModal';

export default function WorkoutTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchWorkoutTemplates();

      if (error) throw error;

      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load workout templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setDeleting(true);
      setError('');
      const { error } = await deleteWorkoutTemplate(templateToDelete.id);

      if (error) throw error;

      setTemplates(templates.filter((t) => t.id !== templateToDelete.id));
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template: ' + err.message);
      setTemplateToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingTemplate) {
        const { data, error } = await updateWorkoutTemplate(
          editingTemplate.id,
          formData
        );

        if (error) throw error;

        setTemplates(
          templates.map((t) => (t.id === editingTemplate.id ? data[0] : t))
        );
      } else {
        const { data, error } = await createWorkoutTemplate(formData);

        if (error) throw error;

        setTemplates([data[0], ...templates]);
      }

      setShowForm(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
      throw err;
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex justify-center items-center">
          <div className="text-gray-600">Loading templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Workout Templates
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage workout class templates. These are blueprints for
            scheduling sessions.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
        >
          <span>+ Create Template</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Templates Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first workout template to get started
          </p>
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="p-6">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {template.title}
                  </h3>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3 min-h-[60px]">
                  {template.description || 'No description'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium text-gray-900">
                      {template.duration} minutes
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Capacity:</span>
                    <span className="font-medium text-gray-900">
                      {template.max_capacity} people
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setTemplateToDelete(template)}
                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <WorkoutTemplateForm
          template={editingTemplate}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      <ConfirmModal
        isOpen={!!templateToDelete}
        title="Delete Workout Template"
        message={
          templateToDelete
            ? `Are you sure you want to delete "${templateToDelete.title}"?\n\nThis will also delete all sessions created from this template.`
            : ''
        }
        confirmLabel="Delete Template"
        loading={deleting}
        onConfirm={confirmDeleteTemplate}
        onCancel={() => setTemplateToDelete(null)}
      />
    </div>
  );
}
