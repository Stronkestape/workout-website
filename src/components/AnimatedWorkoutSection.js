'use client';

import { useEffect, useRef, useState } from 'react';

export default function AnimatedWorkoutSection({ children, index = 0 }) {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Trigger reveal when 12% of the element enters the viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const isSlideFromLeft = index % 2 === 0;

  return (
    <div
      ref={sectionRef}
      className={`transform transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100 ${
        isVisible
          ? 'opacity-100 translate-x-0'
          : isSlideFromLeft
          ? 'opacity-0 -translate-x-8 sm:-translate-x-16'
          : 'opacity-0 translate-x-8 sm:translate-x-16'
      }`}
    >
      {children}
    </div>
  );
}
