export const TEMPLATE_LIMITS = {
  TITLE_MIN: 1,
  DURATION_MIN: 15,
  DURATION_MAX: 180,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 100,
} as const;

export interface TemplateData {
  title?: string | null;
  duration?: number | string | null;
  max_capacity?: number | string | null;
  [key: string]: unknown;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateTemplate(
  data?: TemplateData | null
): TemplateValidationResult {
  const errors: Record<string, string> = {};

  if (!data?.title?.trim()) {
    errors.title = "Title is required";
  }

  const duration = Number(data?.duration);
  if (
    !Number.isFinite(duration) ||
    duration < TEMPLATE_LIMITS.DURATION_MIN ||
    duration > TEMPLATE_LIMITS.DURATION_MAX
  ) {
    errors.duration = `Duration must be between ${TEMPLATE_LIMITS.DURATION_MIN} and ${TEMPLATE_LIMITS.DURATION_MAX} minutes`;
  }

  const maxCapacity = Number(data?.max_capacity);
  if (
    !Number.isFinite(maxCapacity) ||
    maxCapacity < TEMPLATE_LIMITS.CAPACITY_MIN ||
    maxCapacity > TEMPLATE_LIMITS.CAPACITY_MAX
  ) {
    errors.max_capacity = `Capacity must be between ${TEMPLATE_LIMITS.CAPACITY_MIN} and ${TEMPLATE_LIMITS.CAPACITY_MAX}`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
