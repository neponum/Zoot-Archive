import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Type, RotateCcw } from 'lucide-react';
import { audioManager } from '../../services/audioManager';

interface SettingsModalProps {
  show: boolean;
  settings: {
    fontSize: number;
    bgmVolume: number;
    sfxVolume: number;
    voiceVolume: number;
  };
  onUpdateSettings: (settings: any) => void;
  onClose: () => void;
  t: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  settings,
  onUpdateSettings,
  onClose,
  t
}) => {
  const handleVolumeChange = (type: 'bgm' | 'sfx' | 'voice', value: number) => {
    const newSettings = { ...settings };
    if (type === 'bgm') newSettings.bgmVolume = value;
    if (type === 'sfx') newSettings.sfxVolume = value;
    if (type === 'voice') newSettings.voiceVolume = value;
    
    onUpdateSettings(newSettings);
    audioManager.setVolumes(newSettings.bgmVolume, newSettings.sfxVolume, newSettings.voiceVolume);
  };

  const handleFontSizeChange = (value: number) => {
    onUpdateSettings({ fontSize: value });
  };

  const resetSettings = () => {
    const defaultSettings = {
      fontSize: 100,
      bgmVolume: 1.0,
      sfxVolume: 1.0,
      voiceVolume: 1.0
    };
    onUpdateSettings(defaultSettings);
    audioManager.setVolumes(1.0, 1.0, 1.0);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-2xl font-bold text-white tracking-wider uppercase flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-500" />
                {t.settings || 'Settings'}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-10 overflow-y-auto max-h-[70vh]">
              {/* Sound Settings */}
              <section className="space-y-6">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  {t.sound_settings || 'Sound Settings'}
                </h3>
                
                <div className="grid gap-6">
                  {[
                    { id: 'bgm', label: t.bgm_volume || 'BGM Volume', value: settings.bgmVolume },
                    { id: 'sfx', label: t.sfx_volume || 'SFX Volume', value: settings.sfxVolume },
                    { id: 'voice', label: t.voice_volume || 'Voice Volume', value: settings.voiceVolume },
                  ].map((item) => (
                    <div key={item.id} className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">{item.label}</span>
                        <span className="text-blue-400 font-mono">{Math.round(item.value * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={item.value}
                        onChange={(e) => handleVolumeChange(item.id as any, parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Font Settings */}
              <section className="space-y-6">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  {t.display_settings || 'Display Settings'}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">{t.font_size || 'Font Size'}</span>
                    <span className="text-blue-400 font-mono">{settings.fontSize}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="150"
                    step="5"
                    value={settings.fontSize}
                    onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="p-4 bg-white/5 rounded border border-white/5 mt-4">
                    <p 
                      className="text-white/60 leading-relaxed transition-all duration-200"
                      style={{ fontSize: `${(settings.fontSize / 100) * 1}rem` }}
                    >
                      {t.font_preview || 'The quick brown fox jumps over the lazy dog.'}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 bg-white/5 flex justify-between items-center">
              <button
                onClick={resetSettings}
                className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest"
              >
                <RotateCcw className="w-4 h-4" />
                {t.reset_settings || 'Reset to Default'}
              </button>
              
              <button
                onClick={onClose}
                className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded transition-all uppercase tracking-widest shadow-lg shadow-blue-900/20"
              >
                {t.close || 'Close'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
