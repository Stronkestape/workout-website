// src/components/WorkoutIcon.js
import { normalizeWorkoutKey } from '@/utils/workoutThemes';

export default function WorkoutIcon({ title = '', className = 'w-4 h-4' }) {
  const normalized = normalizeWorkoutKey(title);

  if (normalized.includes('walk')) {
    // Walking / Running figure
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="13" cy="4" r="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 21l3-6 3 2 3-5M10 11l3-2 3 3m-3-3v5"
        />
      </svg>
    );
  }

  if (normalized.includes('spin') || normalized.includes('cycle')) {
    // Bicycle
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="5.5" cy="17.5" r="3.5" strokeWidth={2} />
        <circle cx="18.5" cy="17.5" r="3.5" strokeWidth={2} />
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h4M12 17.5V14"
        />
      </svg>
    );
  }

  if (normalized.includes('step')) {
    // Stepper / Stairs
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 19h4v-4h4v-4h4V7h4"
        />
      </svg>
    );
  }

  if (normalized.includes('alakformal')) {
    // Dumbbell
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.5 6.5l11 11M3 8l5-5M16 21l5-5M5 6l2-2M18 19l2-2M8 11l5 5"
        />
      </svg>
    );
  }

  if (normalized.includes('tabata')) {
    // Stopwatch / Interval
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="14" r="7" strokeWidth={2} />
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2M10 3h4M12 10v4l2.5 1.5M18.5 7.5l1-1"
        />
      </svg>
    );
  }

  if (normalized.includes('gymstick')) {
    // Tension Bar
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12h18M6 8v8M18 8v8M9 10v4M15 10v4"
        />
      </svg>
    );
  }

  if (normalized.includes('funkcional')) {
    // Kettlebell / Core
    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 8a3 3 0 016 0v2H9V8z"
        />
        <circle cx="12" cy="15" r="6" strokeWidth={2} />
      </svg>
    );
  }

  // Fallback / General Activity Pulse
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 12h-4l-3 9L9 3l-3 9H2"
      />
    </svg>
  );
}
