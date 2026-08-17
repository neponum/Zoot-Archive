import React from 'react';
import { motion } from 'motion/react';
import { Loader2, ArrowLeft, Play } from 'lucide-react';
import { Language } from '../../types';

interface StoryLoadingScreenProps {
  loading: boolean;
  preloadProgress: { loaded: number; total: number; currentFile: string };
  lang: Language;
  t: Record<string, string>;
  onStart: () => void;
  onBack: () => void;
}

export const StoryLoadingScreen: React.FC<StoryLoadingScreenProps> = ({
  loading,
  preloadProgress,
  lang,
  t,
  onStart,
  onBack
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-black to-black z-0 pointer-events-none" />
      <div className="z-10 flex flex-col items-center">
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="text-xl font-medium mb-4">{t.loading_story || 'Loading story...'}</p>
            {preloadProgress.total > 0 && (
              <div className="w-64">
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(preloadProgress.loaded / preloadProgress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-white/40 text-xs mt-2 text-center">
                  {preloadProgress.loaded} / {preloadProgress.total}
                </p>
                {preloadProgress.currentFile && (
                  <p className="text-white/30 text-[10px] mt-1 text-center truncate" title={preloadProgress.currentFile}>
                    {preloadProgress.currentFile}
                  </p>
                )}
              </div>
            )}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 bg-white/5 border border-white/10 px-4 py-3 rounded-xl max-w-sm"
            >
              <p className="text-sm text-white/60 text-center leading-relaxed">
                <span className="text-yellow-500/80 mr-2">💡</span>
                {lang === 'ru_RU' ? (
                  <>
                    Для пропуска удерживайте <strong className="text-white/90 bg-white/10 px-1.5 py-0.5 rounded text-xs mx-1">Ctrl</strong> или зажмите экран
                  </>
                ) : (
                  <>
                    To skip, hold <strong className="text-white/90 bg-white/10 px-1.5 py-0.5 rounded text-xs mx-1">Ctrl</strong> or press and hold the screen
                  </>
                )}
              </p>
            </motion.div>
          </>
        ) : (
          <button 
            onClick={onStart}
            className="group flex flex-col items-center justify-center gap-4 pl-[48px] pt-[32px] pr-12 pb-8 rounded-xl hover:bg-white/5 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-full border border-white/20 bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/10 group-hover:border-white/40 transition-all duration-300">
              <Play className="w-6 h-6 ml-[1px] text-white/80 group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.3em] text-white/60 group-hover:text-white transition-colors ml-[8px] pr-0">
              {t.play || 'НАЧАТЬ'}
            </span>
          </button>
        )}

        <button 
          onClick={onBack}
          className="mt-8 flex items-center gap-2 px-6 py-2 border border-white/20 text-white/60 rounded-full font-medium hover:bg-white/10 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back_to_menu || 'Back to Menu'}
        </button>
      </div>
    </div>
  );
};
