export const TEMPLATE_LIMITS = {
  TITLE_MIN: 1,
  DURATION_MIN: 15,
  DURATION_MAX: 180,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 100,
};

export function validateTemplate(data) {
  const errors = {};

  if (!data.title?.trim()) {
    errors.title = "Title is required";
  }

  if (data.duration < TEMPLATE_LIMITS.DURATION_MIN || data.duration > TEMPLATE_LIMITS.DURATION_MAX) {
    errors.duration = `Duration must be between ${TEMPLATE_LIMITS.DURATION_MIN} and ${TEMPLATE_LIMITS.DURATION_MAX} minutes`;
  }

  if (data.max_capacity < TEMPLATE_LIMITS.CAPACITY_MIN || data.max_capacity > TEMPLATE_LIMITS.CAPACITY_MAX) {
    errors.max_capacity = `Capacity must be between ${TEMPLATE_LIMITS.CAPACITY_MIN} and ${TEMPLATE_LIMITS.CAPACITY_MAX}`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
