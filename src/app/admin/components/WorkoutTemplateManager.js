'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  fetchWorkoutTemplates,
  createWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
} from '@/utils/adminQueries';
import { useToast } from '@/context/ToastContext';

const WorkoutTemplateForm = dynamic(() => import('./WorkoutTemplateForm'), {
  ssr: false,
});
const ConfirmModal = dynamic(() => import('@/components/ConfirmModal'), {
  ssr: false,
});

export default function WorkoutTemplateManager({
  currentUser,
  initialTemplates = null,
}) {
  const hasInitialTemplates = Array.isArray(initialTemplates);
  const [templates, setTemplates] = useState(initialTemplates || []);
  const [loading, setLoading] = useState(!hasInitialTemplates);
  const hasInitialTemplatesRef = useRef(hasInitialTemplates);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (hasInitialTemplatesRef.current) {
      return;
    }
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplates = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const { data, error } = await fetchWorkoutTemplates();

      if (error) throw error;

      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Nem sikerült betölteni az edzéssablonokat.');
      toast.error('Nem sikerült betölteni az edzéssablonokat.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
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

      const deletedTitle = templateToDelete.title;
      setTemplates(templates.filter((t) => t.id !== templateToDelete.id));
      setTemplateToDelete(null);
      toast.success(`A(z) "${deletedTitle}" sablon sikeresen törölve!`, 'Sablon törölve');
    } catch (err) {
      console.error('Error deleting template:', err);
      const errMsg = err.message || 'Hiba történt a sablon törlése során.';
      setError(errMsg);
      toast.error(errMsg, 'Törlési hiba');
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
        toast.success(`A(z) "${formData.title}" sablon sikeresen frissítve!`, 'Sablon frissítve');
      } else {
        const { data, error } = await createWorkoutTemplate(formData);

        if (error) throw error;

        setTemplates([data[0], ...templates]);
        toast.success(`Új edzéssablon ("${formData.title}") sikeresen létrehozva!`, 'Sablon létrehozva');
      }

      setShowForm(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error(err.message || 'Nem sikerült elmenteni az edzéssablont.', 'Mentési hiba');
      throw err;
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  if (loading && templates.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-8">
        <div className="flex justify-center items-center">
          <div className="text-stone-600 font-medium">Sablonok betöltése...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            Edzés Sablonok
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Kezeld a csoportos edzéstípusokat (időtartam, maximális férőhely, leírás).
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="w-full sm:w-auto justify-center bg-warm-terracotta text-white px-5 py-2.5 rounded-xl hover:bg-warm-terracotta/90 transition-colors font-medium text-sm flex items-center gap-2 shrink-0 shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Új Sablon Létrehozása</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-rose-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-12 text-center">
          <h3 className="text-xl font-bold text-stone-900 mb-2">
            Még nincsenek edzéssablonok
          </h3>
          <p className="text-stone-600 mb-6 max-w-sm mx-auto text-sm">
            Hozz létre egy edzéssablont a csoportos órák kiírásához!
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 bg-warm-terracotta text-white px-5 py-2.5 rounded-xl hover:bg-warm-terracotta/90 transition-colors font-medium text-sm shadow-xs"
          >
            <span>Első Sablon Létrehozása</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl shadow-xs hover:shadow-md transition-shadow border border-stone-200/80 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-stone-900">
                    {template.title}
                  </h3>
                </div>

                <p className="text-sm text-stone-600 mb-4 line-clamp-3 min-h-[60px] leading-relaxed">
                  {template.description || 'Nincs leírás megadva.'}
                </p>

                <div className="space-y-2 mb-4 bg-stone-50 rounded-xl p-3 border border-stone-200/60">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600 font-medium">Időtartam:</span>
                    <span className="font-bold text-stone-900">
                      {template.duration} perc
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-600 font-medium">Férőhely:</span>
                    <span className="font-bold text-stone-900">
                      {template.max_capacity} fő
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-stone-200/80">
                <button
                  type="button"
                  onClick={() => handleEdit(template)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2 rounded-xl transition-colors font-semibold text-xs text-center"
                >
                  Módosítás
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateToDelete(template)}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-xl transition-colors font-semibold text-xs text-center"
                >
                  Törlés
                </button>
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

      {!!templateToDelete && (
        <ConfirmModal
          isOpen={!!templateToDelete}
          title="Edzés sablon törlése"
          message={
            templateToDelete
              ? `Biztosan törölni szeretnéd a(z) "${templateToDelete.title}" sablont?\n\nFigyelem: Ez a művelet hatással lehet a sablonhoz kapcsolódó jövőbeli edzésekre.`
              : ''
          }
          confirmLabel="Sablon törlése"
          loading={deleting}
          onConfirm={confirmDeleteTemplate}
          onCancel={() => setTemplateToDelete(null)}
        />
      )}
    </div>
  );
}
