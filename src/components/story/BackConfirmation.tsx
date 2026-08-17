import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BackConfirmationProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: any;
}

export const BackConfirmation: React.FC<BackConfirmationProps> = ({
  show,
  onConfirm,
  onCancel,
  t,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-8"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1a1a1a] border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-4 text-center">{t.confirm_exit_title}</h3>
            <p className="text-gray-400 mb-8 text-center">{t.confirm_exit_desc}</p>
            <div className="flex gap-4">
              <button
                onClick={() => onCancel()}
                className="flex-1 py-3 border border-white/10 text-white rounded-xl font-bold hover:bg-white/5 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                {t.confirm}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
