import React from 'react';

export interface FormFieldProps {
  id: string;
  name?: string;
  label: string;
  hint?: string;
  error?: string | null;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
  disabled?: boolean;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}

export function FormField({
  id,
  name,
  label,
  hint,
  error,
  value,
  defaultValue,
  onChange,
  disabled,
  type = "text",
  autoComplete = "off",
  required,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={name || id}
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        autoComplete={autoComplete}
        required={required}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        }`}
      />
      {hint && <p className="text-xs text-stone-600 mt-1 font-medium">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
