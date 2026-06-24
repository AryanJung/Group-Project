import { useEffect, useRef } from 'react';

/**
 * Custom hook to trigger scroll animations using IntersectionObserver
 * Applies 'in-view' class to elements with scroll-animate classes as they enter viewport
 */
export const useScrollAnimation = (animationType = 'scroll-animate') => {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Create intersection observer with options
    const observerOptions = {
      threshold: 0.15, // Trigger when 15% of element is visible
      rootMargin: '0px 0px -50px 0px' // Trigger slightly before element is fully visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Add in-view class when element enters viewport
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          // Optional: Remove observer after animation to improve performance
          // observer.unobserve(entry.target);
        } else {
          // Uncomment below to repeat animation on scroll out (remove for persistent animation)
          // entry.target.classList.remove('in-view');
        }
      });
    }, observerOptions);

    // Observe the element
    observer.observe(element);

    // Cleanup
    return () => {
      if (element) {
        observer.unobserve(element);
      }
      observer.disconnect();
    };
  }, []);

  return ref;
};

export default useScrollAnimation;
