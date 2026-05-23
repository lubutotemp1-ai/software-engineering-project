import { useState, useEffect } from 'react';

const DESKTOP_MIN = 900;

export function useSidebarOpen() {
  const [isOpen, setIsOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= DESKTOP_MIN
  );

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= DESKTOP_MIN) setIsOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < DESKTOP_MIN) setIsOpen(false);
  };

  return { isOpen, setIsOpen, closeOnMobile };
}
