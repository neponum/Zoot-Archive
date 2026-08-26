import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PRTSArchiveLayout } from './archive/PRTSArchiveLayout';
import { ErrorBoundary } from './ErrorBoundary';

interface PRTSArchiveViewProps {
  onBackToHome?: () => void;
}

export const PRTSArchiveView: React.FC<PRTSArchiveViewProps> = ({ onBackToHome }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="w-full h-full bg-[#08080a] text-white flex flex-col relative overflow-hidden font-sans select-none">
      <ErrorBoundary
        sectionName="PRTS Archive Suite"
        fallbackTitle="Сбой архива PRTS"
        fallbackMessage="Произошла ошибка при отрисовке интерфейса архива PRTS."
        onReset={handleBack}
      >
        <PRTSArchiveLayout onBackToHome={handleBack} />
      </ErrorBoundary>
    </div>
  );
};




