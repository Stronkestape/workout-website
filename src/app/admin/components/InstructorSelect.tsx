'use client';

import React from 'react';

export interface InstructorOption {
  id: string;
  username: string;
  full_name?: string | null;
}

export interface InstructorSelectProps {
  instructors?: InstructorOption[];
  value?: string;
  selectedId?: string;
  currentInstructor?: Partial<InstructorOption> | null;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  error?: string | null;
}

export default function InstructorSelect({
  instructors = [],
  value,
  selectedId,
  currentInstructor,
  onChange,
  name = 'instructor_id',
  id = 'instructor_id',
  disabled = false,
  error,
}: InstructorSelectProps) {
  const currentValue = value ?? selectedId ?? '';
  const hasSelectedInList = instructors.some((inst) => inst.id === currentValue);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (typeof onChange === 'function') {
      onChange(e);
    }
  };

  return (
    <select
      id={id}
      name={name}
      value={currentValue}
      onChange={handleChange}
      disabled={disabled}
      autoComplete="off"
      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-stone-900 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-terracotta/40 focus:border-warm-terracotta disabled:bg-stone-100 disabled:cursor-not-allowed ${
        error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-stone-300'
      }`}
    >
      <option value="">Nincs kijelölt oktató</option>
      {currentValue && !hasSelectedInList && (
        <option key={currentValue} value={currentValue}>
          {currentInstructor?.full_name ||
            currentInstructor?.username ||
            'Kijelölt oktató'}
        </option>
      )}
      {instructors.map((instructor) => (
        <option key={instructor.id} value={instructor.id}>
          {instructor.full_name || instructor.username} (@{instructor.username})
        </option>
      ))}
    </select>
  );
}
