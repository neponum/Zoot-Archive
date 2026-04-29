import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, AlertTriangle, MessageSquare, Send } from 'lucide-react';

interface BugReportModalProps {
  show: boolean;
  onClose: () => void;
  context: {
    chapter: string;
    line: number;
    history: { speaker: string | null; text: string }[];
    translator?: string | null;
  };
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ show, onClose, context }) => {
  const [isCheckingDiscord, setIsCheckingDiscord] = useState(true);
  const [discordUser, setDiscordUser] = useState<any>(null);
  const [isDiscordMember, setIsDiscordMember] = useState(false);
  const [type, setType] = useState<'player' | 'translation'>('translation');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (show) {
      checkDiscordAuth();
      setError(null);
      setSuccess(false);
      setDescription('');
    }
  }, [show]);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DISCORD_AUTH_SUCCESS') {
        checkDiscordAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkDiscordAuth = async () => {
    setIsCheckingDiscord(true);
    try {
      const response = await fetch('/api/auth/discord/user');
      if (response.ok) {
        const data = await response.json();
        setDiscordUser(data.user);
        setIsDiscordMember(data.isMember);
      } else {
        setDiscordUser(null);
        setIsDiscordMember(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingDiscord(false);
    }
  };

  const handleDiscordLogin = () => {
    const width = 600;
    const height = 800;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    
    const authWindow = window.open(
      '/api/auth/discord/redirect',
      'discord_auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!authWindow) {
      alert('Всплывающее окно заблокировано. Пожалуйста, разрешите всплывающие окна для этого сайта.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description, context })
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Произошла ошибка при отправке репорта');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#1a1a1a] border border-white/20 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-medium text-white flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Сообщить об ошибке
              </h2>
              <button 
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {isCheckingDiscord ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : !discordUser ? (
                <div className="text-center py-8">
                  <p className="text-white/80 mb-6">Для отправки репорта необходимо авторизоваться через Discord.</p>
                  <button
                    onClick={handleDiscordLogin}
                    className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg w-full transition-colors font-medium"
                  >
                    Авторизоваться через Discord
                  </button>
                </div>
              ) : !isDiscordMember ? (
                <div className="text-center py-8">
                  <p className="text-white/80 mb-6">Вы должны быть участником Discord-сервера, чтобы отправлять репорты об ошибках.</p>
                  <a
                    href="https://discord.gg/jYvWPeCjC3"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg w-full transition-colors font-medium mb-4"
                  >
                    Присоединиться к Discord <ExternalLink className="w-5 h-5" />
                  </a>
                  <button
                    onClick={checkDiscordAuth}
                    className="flex items-center justify-center border border-white/20 hover:border-white/40 text-white px-6 py-3 rounded-lg w-full transition-colors font-medium"
                  >
                    Я присоединился (проверить снова)
                  </button>
                </div>
              ) : success ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">Отправлено!</h3>
                  <p className="text-white/60 mb-8">Спасибо, ваш репорт успешно отправлен команде.</p>
                  <button
                    onClick={onClose}
                    className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors w-full"
                  >
                    Закрыть
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Readonly Context */}
                  <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Глава:</span>
                      <span className="text-white">{context.chapter}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Строка:</span>
                      <span className="text-white">{context.line}</span>
                    </div>
                  </div>

                  {/* Type Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/80">Тип проблемы:</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setType('translation')}
                        className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                          type === 'translation' 
                            ? 'border-green-500 bg-green-500/10 text-green-400' 
                            : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <MessageSquare className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Перевод / Текст</span>
                        <span className="text-xs opacity-60 mt-1">Опечатки, контекст</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setType('player')}
                        className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                          type === 'player' 
                            ? 'border-red-500 bg-red-500/10 text-red-400' 
                            : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <AlertTriangle className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Плеер / Логика</span>
                        <span className="text-xs opacity-60 mt-1">Креш, нет звука, баги</span>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Описание проблемы:</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Опишите, что пошло не так..."
                      required
                      className="w-full h-32 bg-black/40 border border-white/20 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !description.trim()}
                    className="w-full bg-white text-black py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Отправить репорт
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
