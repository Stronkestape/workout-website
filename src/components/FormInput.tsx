import React from 'react';

export interface FormInputProps {
  id: string;
  name?: string;
  label: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  rows?: number;
  autoComplete?: string;
}

export function FormInput({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  error,
  disabled,
  required,
  placeholder,
  min,
  max,
  rows,
  autoComplete = "off",
}: FormInputProps) {
  const isTextarea = type === "textarea";

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {isTextarea ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          rows={rows}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            error
              ? "border-red-300 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          min={min}
          max={max}
          autoComplete={autoComplete}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            error
              ? "border-red-300 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
