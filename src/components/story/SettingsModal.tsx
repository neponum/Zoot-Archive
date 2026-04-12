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
          className="absolute inset-0 z-[100] bg-black flex flex-col"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="p-8 flex items-center justify-between">
            <button 
              onClick={onClose}
              className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-10 h-10" />
            </button>
            <h2 className="text-2xl font-bold text-white tracking-wider uppercase">
              {t.settings || 'Settings'}
            </h2>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Content */}
          <div className="flex-grow overflow-y-auto scrollbar-none px-4 pb-24">
            <div className="max-w-3xl mx-auto space-y-12 pt-8">
              {/* Sound Settings */}
              <section className="space-y-8">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-4">
                  <Volume2 className="w-5 h-5" />
                  {t.sound_settings || 'Sound Settings'}
                </h3>
                
                <div className="grid gap-8">
                  {[
                    { id: 'bgm', label: t.bgm_volume || 'BGM Volume', value: settings.bgmVolume },
                    { id: 'sfx', label: t.sfx_volume || 'SFX Volume', value: settings.sfxVolume },
                    { id: 'voice', label: t.voice_volume || 'Voice Volume', value: settings.voiceVolume },
                  ].map((item) => (
                    <div key={item.id} className="space-y-4">
                      <div className="flex justify-between text-lg">
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
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Font Settings */}
              <section className="space-y-8">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-4">
                  <Type className="w-5 h-5" />
                  {t.display_settings || 'Display Settings'}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-lg">
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
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="p-6 bg-white/5 rounded-lg border border-white/10 mt-6">
                    <p 
                      className="text-white/80 leading-relaxed transition-all duration-200"
                      style={{ fontSize: `${(settings.fontSize / 100) * 1.25}rem` }}
                    >
                      {t.font_preview || 'The quick brown fox jumps over the lazy dog.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Reset Button */}
              <div className="pt-8 flex justify-center">
                <button
                  onClick={resetSettings}
                  className="flex items-center gap-2 text-sm font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white/5"
                >
                  <RotateCcw className="w-5 h-5" />
                  {t.reset_settings || 'Reset to Default'}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Gradient for readability */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
