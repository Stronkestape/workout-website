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
          ? parseInt(value) || 0
          : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double-submit
    setError('');

    const validation = validateTemplate(formData);
    setFieldErrors(validation.errors);

    if (!validation.isValid) return;

    setLoading(true);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'Hiba történt a sablon mentése során.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-stone-200/80">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            {template ? 'Edzéssablon szerkesztése' : 'Új edzéssablon létrehozása'}
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
          <FormInput
            id="title"
            name="title"
            label="Edzés megnevezése"
            value={formData.title}
            onChange={handleChange}
            error={fieldErrors.title}
            disabled={loading}
            placeholder="pl. Spinning, WALKenergie, Cross Training"
            required
          />

          <FormInput
            id="description"
            name="description"
            label="Leírás"
            type="textarea"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
            placeholder="Részletes ismertető a mozgásformáról, az edzés menetéről és intenzitásáról..."
            rows={4}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              id="duration"
              name="duration"
              label="Időtartam (perc)"
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
              label="Maximális férőhely (fő)"
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

          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 text-xs text-stone-600 leading-relaxed">
            Ez az edzés egy általános sablonként szolgál. Az időpontok menüpontban ebből a sablonból hozhatsz létre konkrét órákat kijelölt edzővel és kezdési időponttal.
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
                  : template
                  ? 'Módosítások mentése'
                  : 'Sablon létrehozása'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
