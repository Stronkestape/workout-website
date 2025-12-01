import { useState } from "react";

export function useFormState(initialData = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reset = () => {
    setData(initialData);
    setError("");
    setSuccess("");
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  return {
    data,
    setData,
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess,
    reset,
    clearMessages,
  };
}
