'use client';

import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, text = "Procesando..." }) => {
  if (!isLoading) {
    return null;
  }

  return (
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500"></div>
        <p className="text-lg font-semibold text-gray-700">{text}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
