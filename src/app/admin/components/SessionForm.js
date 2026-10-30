'use client';

import { useState, useEffect } from 'react';
import { createSession, fetchInstructors } from '@/utils/adminQueries';
import { updateSessionAction } from '../actions';
import { FormInput } from '@/components/FormInput';
import { FormMessage } from '@/components/FormMessage';
import { validateSession, formatDateTimeLocal, calculateEndTime } from '@/utils/sessionValidation';
import InstructorSelect from './InstructorSelect';
import { useToast } from '@/context/ToastContext';

export default function SessionForm({
  session,
  templates,
  currentUser,
  onSubmit,
  onCancel,
}) {
  const isInstructor = currentUser?.profile?.user_tier === 'instructor';
  const [formData, setFormData] = useState({
    class_id: '',
    start_time: '',
    end_time: '',
    instructor_id: isInstructor ? currentUser?.id || '' : '',
    is_active: true,
    is_recurring: true,
  });
  const [instructors, setInstructors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const toast = useToast();

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
        is_recurring: session.is_recurring !== false,
      });

      const template = templates.find((t) => t.id === session.class_id);
      setSelectedTemplate(template);
    }
  }, [session, templates]);

  const loadInstructors = async () => {
    try {
      const { data, error } = await fetchInstructors();
      if (error) throw error;
      setInstructors(data || []);
    } catch {
      setError('Nem sikerült betölteni az oktatókat.');
    } finally {
      setLoadingInstructors(false);
    }
  };

  const handleTemplateChange = (e) => {
    const templateId = parseInt(e.target.value);
    const template = templates.find((t) => t.id === templateId);

    setFormData({
      ...formData,
      class_id: templateId,
    });

    setSelectedTemplate(template);

    if (formData.start_time && template) {
      setFormData((prev) => ({
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
      setFormData((prev) => ({
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
    if (loading) return; // Prevent accidental double-submit
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
        is_recurring: formData.is_recurring,
      };

      if (session) {
        const result = await updateSessionAction(session.id, sessionData);
        if (!result.success) throw new Error(result.error);
        toast.success('Az edzés időpontja és adatai sikeresen módosítva!', 'Sikeres módosítás');
      } else {
        const { error } = await createSession(sessionData);
        if (error) throw error;
        toast.success('Az új edzés sikeresen meghirdetve a naptárban!', 'Sikeres létrehozás');
      }

      onSubmit();
    } catch (err) {
      const errMsg = err.message || 'Nem sikerült elmenteni az edzést.';
      setError(errMsg);
      toast.error(errMsg, 'Mentési hiba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-stone-200/80">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            {session ? 'Edzésidőpont szerkesztése' : 'Új edzés ütemezése'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition-colors focus:outline-none"
            aria-label="Ablak bezárása"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label
              htmlFor="class_id"
              className="block text-sm font-semibold text-stone-900 mb-2"
            >
              Edzéssablon{' '}
              {!session && <span className="text-warm-terracotta">*</span>}
            </label>
            <select
              id="class_id"
              name="class_id"
              value={formData.class_id}
              onChange={handleTemplateChange}
              className={`w-full px-4 py-2.5 bg-white border rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-warm-terracotta transition-colors ${
                fieldErrors.class_id
                  ? 'border-rose-400 focus:ring-rose-500'
                  : 'border-stone-300'
              }`}
              required
              disabled={!!session || loading}
            >
              <option value="">Válassz egy edzéssablont...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} ({template.duration} perc, max{' '}
                  {template.max_capacity} fő)
                </option>
              ))}
            </select>
            {fieldErrors.class_id && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {fieldErrors.class_id}
              </p>
            )}
            {session && (
              <p className="text-xs text-stone-500 mt-1">
                A sablontípus utólag már nem módosítható.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              id="start_time"
              name="start_time"
              label="Kezdési időpont"
              type="datetime-local"
              value={formData.start_time}
              onChange={handleStartTimeChange}
              error={fieldErrors.start_time}
              disabled={loading}
              required
            />

            <div>
              <FormInput
                id="end_time"
                name="end_time"
                label="Befejezési időpont"
                type="datetime-local"
                value={formData.end_time}
                onChange={handleChange}
                error={fieldErrors.end_time}
                disabled={loading}
                required
              />
              {selectedTemplate && (
                <p className="text-xs text-stone-500 mt-1">
                  Automatikusan kiszámítva a(z) {selectedTemplate.duration} perces sablon alapján.
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="instructor_id"
              className="block text-sm font-semibold text-stone-900 mb-2"
            >
              Oktató / Edző
            </label>
            {isInstructor ? (
              <div className="w-full px-4 py-2.5 bg-stone-100 border border-stone-300 rounded-xl text-stone-700 text-sm">
                {currentUser?.profile?.full_name ||
                  currentUser?.profile?.username ||
                  'Én vagyok az oktató'}
                <span className="text-xs text-stone-500 ml-2 font-normal">
                  (Saját edzésként rögzítve)
                </span>
              </div>
            ) : (
              <InstructorSelect
                instructors={instructors}
                selectedId={formData.instructor_id}
                onChange={handleChange}
                disabled={loading || loadingInstructors}
                error={fieldErrors.instructor_id}
              />
            )}
            {fieldErrors.instructor_id && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {fieldErrors.instructor_id}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-stone-200/80">
            <div className="flex items-start">
              <input
                id="is_recurring"
                name="is_recurring"
                type="checkbox"
                checked={formData.is_recurring}
                onChange={handleChange}
                disabled={loading}
                className="w-4 h-4 mt-0.5 text-warm-terracotta border-stone-300 rounded focus:ring-warm-terracotta"
              />
              <div className="ml-2.5">
                <label
                  htmlFor="is_recurring"
                  className="text-sm font-semibold text-stone-900"
                >
                  Heti ismétlődés (4 hetes gördülő ütemezés)
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  {session
                    ? 'A rendszer automatikusan fenntartja az óra heti ismétlődését.'
                    : 'Automatikusan legenerálja az edzést a következő 4 hét azonos időpontjaira.'}
                </p>
              </div>
            </div>

            <div className="flex items-center pt-2 border-t border-stone-200/80">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={loading}
                className="w-4 h-4 text-warm-terracotta border-stone-300 rounded focus:ring-warm-terracotta"
              />
              <label
                htmlFor="is_active"
                className="ml-2.5 text-sm font-semibold text-stone-700"
              >
                Aktív (megjelenik a naptárban a tagok számára foglalásra)
              </label>
            </div>
          </div>

          {error && <FormMessage type="error" message={error} />}

          <div className="flex gap-3 pt-3 border-t border-stone-200/80">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-5 py-2.5 border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors font-medium text-stone-700 text-sm"
              disabled={loading}
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-warm-terracotta text-white px-5 py-2.5 rounded-xl hover:bg-warm-terracotta/90 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-xs flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              <span>
                {loading
                  ? 'Mentés folyamatban...'
                  : session
                  ? 'Módosítások mentése'
                  : 'Edzés meghirdetése'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
