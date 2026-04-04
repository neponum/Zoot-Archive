import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BackConfirmDialogProps {
  showBackConfirm: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: any;
}

export const BackConfirmDialog: React.FC<BackConfirmDialogProps> = ({
  showBackConfirm,
  onCancel,
  onConfirm,
  t
}) => {
  return (
    <AnimatePresence>
      {showBackConfirm && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div className="bg-zinc-900 border border-white/10 p-8 max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-white mb-8 tracking-wider">{t.confirmBack}</h3>
            <div className="flex gap-4 justify-center">
              <button
                onClick={onCancel}
                className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold tracking-widest transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={onConfirm}
                className="px-8 py-3 bg-white hover:bg-gray-200 text-black font-bold tracking-widest transition-colors"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
