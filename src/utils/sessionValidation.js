export function validateSession(formData, isEditing = false) {
  const errors = {};

  if (!formData.class_id) {
    errors.class_id = "Please select a workout template";
  }

  if (!formData.start_time) {
    errors.start_time = "Start time is required";
  }

  if (!formData.end_time) {
    errors.end_time = "End time is required";
  }

  if (formData.start_time && formData.end_time) {
    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);

    if (endDate <= startDate) {
      errors.end_time = "End time must be after start time";
    }

    if (!isEditing && startDate < new Date()) {
      errors.start_time = "Cannot schedule sessions in the past";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function calculateEndTime(startTime, durationMinutes) {
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return formatDateTimeLocal(endDate);
}
