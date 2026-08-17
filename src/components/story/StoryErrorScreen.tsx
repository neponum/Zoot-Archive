import React from 'react';
import { AlertCircle } from 'lucide-react';

interface StoryErrorScreenProps {
  error: string;
  t: Record<string, string>;
  onBack: () => void;
  onRetry: () => void;
}

export const StoryErrorScreen: React.FC<StoryErrorScreenProps> = ({
  error,
  t,
  onBack,
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black text-white p-8">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <p className="text-2xl font-bold mb-2">{t.error || 'Error'}</p>
      <p className="text-gray-400 mb-6 text-center">{error}</p>
      <div className="flex gap-4">
        <button 
          onClick={onBack}
          className="px-6 py-2 border border-white/20 text-white rounded-full font-bold hover:bg-white/10 transition-colors"
        >
          {t.back_to_menu || 'Back to Menu'}
        </button>
        <button 
          onClick={onRetry}
          className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
        >
          {t.retry || 'Retry'}
        </button>
      </div>
    </div>
  );
};
