import React from 'react';

export type FormMessageType = 'error' | 'success';

export interface FormMessageProps {
  type: FormMessageType;
  message: string;
}

export function FormMessage({ type, message }: FormMessageProps) {
  const styles: Record<FormMessageType, string> = {
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };

  return (
    <div className={`border rounded-md p-3 ${styles[type] || styles.error}`}>
      <p className="text-sm">{message}</p>
    </div>
  );
}
