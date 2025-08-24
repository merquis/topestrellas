'use client';

import { useState, useEffect, useCallback } from 'react';

interface MobileDetectResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

export function useMobileDetect(): MobileDetectResult {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Añadir listener con throttle para mejor rendimiento
    let timeoutId: ReturnType<typeof setTimeout>;
    const throttledResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', throttledResize);
    handleResize(); // Llamar inmediatamente para obtener el tamaño inicial

    return () => {
      window.removeEventListener('resize', throttledResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return {
    isMobile: windowWidth < 768,
    isTablet: windowWidth >= 768 && windowWidth < 1024,
    isDesktop: windowWidth >= 1024,
    width: windowWidth
  };
}

// Hook mejorado para gestionar el sidebar en móvil
export function useMobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile, isTablet, isDesktop } = useMobileDetect();

  // Cerrar sidebar cuando cambiamos a desktop
  useEffect(() => {
    if (isDesktop && isOpen) {
      setIsOpen(false);
    }
  }, [isDesktop, isOpen]);

  // Prevenir scroll del body cuando el sidebar está abierto
  useEffect(() => {
    if (isOpen && (isMobile || isTablet)) {
      // Guardar posición actual del scroll
      const scrollY = window.scrollY;
      
      // Prevenir scroll con mejor manejo
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Añadir clase para animaciones CSS si es necesario
      document.body.classList.add('sidebar-open');
      
      return () => {
        // Restaurar scroll
        const bodyTop = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.classList.remove('sidebar-open');
        
        // Restaurar posición del scroll
        if (bodyTop) {
          window.scrollTo(0, parseInt(bodyTop.replace('-', '').replace('px', ''), 10));
        }
      };
    }
  }, [isOpen, isMobile, isTablet]);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Cerrar al hacer clic en enlaces (para mejor UX)
  const handleLinkClick = useCallback(() => {
    if (isMobile || isTablet) {
      setIsOpen(false);
    }
  }, [isMobile, isTablet]);

  const toggle = useCallback(() => setIsOpen((prev: boolean) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    toggle,
    open,
    close,
    isMobile,
    isTablet,
    isDesktop,
    handleLinkClick
  };
}
