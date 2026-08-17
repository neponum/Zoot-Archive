// AudioManager uses standard HTML5 Audio to avoid CORS issues with external audio files
// that don't provide Access-Control-Allow-Origin headers.

class AudioManager {
  private static instance: AudioManager;
  
  private bgm: HTMLAudioElement | null = null;
  private bgmUrl: string | null = null;
  private bgmVolume: number = 0.5;
  private bgmFadeInterval: number | null = null;
  private currentPlayId: number = 0;
  
  private masterBGMVolume: number = 1.0;
  private masterSFXVolume: number = 1.0;
  private masterVoiceVolume: number = 1.0;
  
  private sfx: Set<HTMLAudioElement> = new Set();
  private voice: HTMLAudioElement | null = null;
  private isUnlocked = false;
  
  private constructor() {
    // Load volumes from localStorage if available
    try {
      const saved = localStorage.getItem('arknights_avg_volumes');
      if (saved) {
        const { bgm, sfx, voice } = JSON.parse(saved);
        this.masterBGMVolume = bgm ?? 1.0;
        this.masterSFXVolume = sfx ?? 1.0;
        this.masterVoiceVolume = voice ?? 1.0;
      }
    } catch (e) {
      console.error('Failed to load volumes', e);
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public unlock() {
    if (this.isUnlocked) return;
    this.isUnlocked = true;
    
    // Play a tiny silent audio to bless the audio context on iOS Safari
    const silentAudio = new Audio('data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    silentAudio.play().catch(() => {
      // Ignore errors if it fails
    });
  }

  public setVolumes(bgm: number, sfx: number, voice: number) {
    this.masterBGMVolume = bgm;
    this.masterSFXVolume = sfx;
    this.masterVoiceVolume = voice;
    
    if (this.bgm) {
      this.bgm.volume = Math.max(0, Math.min(1, this.bgmVolume * this.masterBGMVolume));
    }
    
    localStorage.setItem('arknights_avg_volumes', JSON.stringify({ bgm, sfx, voice }));
  }

  public getVolumes() {
    return {
      bgm: this.masterBGMVolume,
      sfx: this.masterSFXVolume,
      voice: this.masterVoiceVolume
    };
  }

  private fadeAudio(audio: HTMLAudioElement, startVol: number, endVol: number, duration: number, onComplete?: () => void) {
    const steps = 20;
    // Prevent zero or negative duration. The `duration` here is already passed in milliseconds from playBGM/stopBGM.
    const safeDuration = Math.max(duration, 50);
    const stepTime = safeDuration / steps;
    const volumeStep = (endVol - startVol) / steps;
    let currentStep = 0;

    audio.volume = Math.max(0, Math.min(1, startVol));

    const interval = window.setInterval(() => {
      currentStep++;
      let newVol = startVol + (volumeStep * currentStep);
      // Ensure volume stays between 0 and 1
      newVol = Math.max(0, Math.min(1, newVol));
      audio.volume = newVol;

      if (currentStep >= steps) {
        window.clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, stepTime);

    return interval;
  }

  private formatAudioUrl(url: string): string {
    if (!url) return url;
    if (url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.startsWith('/api/proxy?url=')) return url;
    // HTML5 Audio plays direct cross-origin audio URLs natively without proxying through Vercel
    return url;
  }

  /**
   * Play background music with optional crossfade and intro
   */
  public async playBGM(url: string, volume: number = 0.5, fadeDuration: number = 1000, introUrl?: string, name?: string, introName?: string) {
    if (!url) {
      console.warn('Attempted to play BGM with empty URL');
      return;
    }

    if (this.bgmUrl === url && !introUrl) {
      if (this.bgm) {
        this.bgm.volume = Math.max(0, Math.min(1, volume * this.masterBGMVolume));
      }
      return;
    }

    this.currentPlayId++;
    const playId = this.currentPlayId;

    const oldBgm = this.bgm;
    const oldInterval = this.bgmFadeInterval;
    
    this.bgmUrl = url;
    this.bgmVolume = Math.max(0, volume);

    if (oldInterval) {
      window.clearInterval(oldInterval);
    }

    // Fade out old BGM
    if (oldBgm) {
      oldBgm.onended = null;
      oldBgm.onerror = null;
      this.fadeAudio(oldBgm, oldBgm.volume, 0, fadeDuration, () => {
        oldBgm.pause();
        oldBgm.onerror = null;
        oldBgm.src = '';
      });
    }

    // Load and fade in new BGM
    const newBgm = new Audio(this.formatAudioUrl(introUrl || url));
    newBgm.loop = !introUrl;
    newBgm.volume = 0;
    
    // Add error listener to catch native browser errors
    newBgm.onerror = (e: Event) => {
      if (!newBgm.src) return;
      const target = e.target as HTMLAudioElement;
      const errorMsg = target.error ? target.error.message : 'Unknown error';
      console.error(`Failed to load BGM audio resource: ${introName || name || introUrl || url}. Error: ${errorMsg}`);
    };
    
    try {
      await newBgm.play();
      
      // If stopAll or another playBGM was called while waiting for play() to resolve, abort.
      if (playId !== this.currentPlayId) {
        newBgm.pause();
        newBgm.onerror = null;
        newBgm.src = '';
        return;
      }

      this.bgm = newBgm;
      this.bgmFadeInterval = this.fadeAudio(newBgm, 0, Math.max(0, Math.min(1, volume * this.masterBGMVolume)), fadeDuration);

      if (introUrl) {
        newBgm.onended = async () => {
          // Only switch to loop if this intro is still the active BGM
          if (this.bgm === newBgm && playId === this.currentPlayId) {
            const loopBgm = new Audio(this.formatAudioUrl(url));
            loopBgm.loop = true;
            loopBgm.volume = Math.max(0, Math.min(1, volume * this.masterBGMVolume));
            
            loopBgm.onerror = (e: Event) => {
              if (!loopBgm.src) return;
              const target = e.target as HTMLAudioElement;
              const errorMsg = target.error ? target.error.message : 'Unknown error';
              console.error(`Failed to load loop BGM audio resource: ${name || url}. Error: ${errorMsg}`);
            };
            
            try {
              await loopBgm.play();
              // Double check again after async play
              if (this.bgm === newBgm && playId === this.currentPlayId) {
                this.bgm = loopBgm;
              } else {
                loopBgm.pause();
                loopBgm.onerror = null;
                loopBgm.src = '';
              }
            } catch (e) {
              const errorMsg = e instanceof Error ? e.message : String(e);
              console.error(`Failed to play loop BGM: ${name || url}. Error: ${errorMsg}`);
            }
          }
        };
      }
    } catch (e) {
      if (playId === this.currentPlayId) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`Failed to play BGM: ${introName || name || introUrl || url}. Error: ${errorMsg}`);
      }
    }
  }

  /**
   * Stop background music with fade out
   */
  public stopBGM(fadeDuration: number = 1000) {
    this.currentPlayId++; // Invalidate any pending play requests
    
    if (this.bgm) {
      const currentBgm = this.bgm;
      currentBgm.onended = null;
      if (this.bgmFadeInterval) {
        window.clearInterval(this.bgmFadeInterval);
      }
      
      if (fadeDuration > 0) {
        this.fadeAudio(currentBgm, currentBgm.volume, 0, fadeDuration, () => {
          currentBgm.pause();
          currentBgm.onerror = null;
          currentBgm.src = '';
        });
      } else {
        currentBgm.pause();
        currentBgm.onerror = null;
        currentBgm.src = '';
      }
      
      this.bgm = null;
      this.bgmUrl = null;
    }
  }

  private channelSfx: Map<string, HTMLAudioElement> = new Map();

  /**
   * Play sound effect
   */
  public playSFX(url: string, volume: number = 1.0, loop: boolean = false, channel?: string): Promise<void> {
    if (!url) {
      console.warn('Attempted to play SFX with empty URL');
      return Promise.resolve();
    }

    // If setting a specific channel, stop the previous one on this channel
    if (channel && this.channelSfx.has(channel)) {
      const prevSound = this.channelSfx.get(channel)!;
      prevSound.pause();
      prevSound.onerror = null;
      prevSound.src = '';
      this.sfx.delete(prevSound);
    }

    return new Promise<void>((resolve) => {
      const sound = new Audio(this.formatAudioUrl(url));
      sound.volume = Math.max(0, Math.min(1, volume * this.masterSFXVolume));
      sound.loop = loop;
      
      const finish = () => {
        resolve();
      };
      
      sound.onerror = (e: Event) => {
        if (!sound.src) return;
        const target = e.target as HTMLAudioElement;
        const errorMsg = target.error ? target.error.message : 'Unknown error';
        console.error(`Failed to load SFX audio resource: ${url}. Error: ${errorMsg}`);
        finish();
      };
      
      sound.addEventListener('ended', () => {
        this.sfx.delete(sound);
        if (channel && this.channelSfx.get(channel) === sound) {
          this.channelSfx.delete(channel);
        }
        sound.onerror = null;
        sound.src = '';
        finish();
      });
      
      this.sfx.add(sound);
      if (channel) {
        this.channelSfx.set(channel, sound);
      }

      sound.play().catch(e => {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`Failed to play SFX: ${url}. Error: ${errorMsg}`);
        finish();
      });
      
      if (loop) resolve(); // Don't block indefinitely on loops
    });
  }

  /**
   * Stop specific sound effect channel or all
   */
  public stopSFX(channel?: string, fadeDuration: number = 0) {
    if (channel) {
      const sound = this.channelSfx.get(channel);
      if (sound) {
        if (fadeDuration > 0) {
          this.fadeAudio(sound, sound.volume, 0, fadeDuration, () => {
             sound.pause();
             sound.onerror = null;
             sound.src = '';
             this.sfx.delete(sound);
             this.channelSfx.delete(channel);
          });
        } else {
          sound.pause();
          sound.onerror = null;
          sound.src = '';
          this.sfx.delete(sound);
          this.channelSfx.delete(channel);
        }
      }
    } else {
       // stop all sfx
       this.sfx.forEach(sound => {
         sound.pause();
         sound.onerror = null;
         sound.src = '';
       });
       this.sfx.clear();
       this.channelSfx.clear();
    }
  }

  /**
   * Set specific sound effect channel volume (with optional fade)
   */
  public setSFXVolume(channel: string, volume: number, fadeDuration: number = 0) {
    if (!channel) return;
    const sound = this.channelSfx.get(channel);
    if (sound) {
      const targetVolume = Math.max(0, Math.min(1, volume * this.masterSFXVolume));
      if (fadeDuration > 0) {
        this.fadeAudio(sound, sound.volume, targetVolume, fadeDuration);
      } else {
        sound.volume = targetVolume;
      }
    }
  }

  /**
   * Play voice line (stops previous voice)
   */
  public playVoice(url: string, volume: number = 1.0) {
    if (!url) {
      console.warn('Attempted to play Voice with empty URL');
      return;
    }

    if (this.voice) {
      this.voice.pause();
      this.voice.onerror = null;
      this.voice.src = '';
    }

    this.voice = new Audio(this.formatAudioUrl(url));
    this.voice.volume = Math.max(0, Math.min(1, volume * this.masterVoiceVolume));
    
    this.voice.onerror = (e: Event) => {
      if (!this.voice || !this.voice.src) return;
      const target = e.target as HTMLAudioElement;
      const errorMsg = target.error ? target.error.message : 'Unknown error';
      console.error(`Failed to load voice audio resource: ${url}. Error: ${errorMsg}`);
    };
    
    this.voice.addEventListener('ended', () => {
      this.voice = null;
    });
    
    this.voice.play().catch(e => {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`Failed to play voice: ${url}. Error: ${errorMsg}`);
    });
  }

  /**
   * Stop currently playing voice
   */
  public stopVoice() {
    if (this.voice) {
      this.voice.pause();
      this.voice.onerror = null;
      this.voice.src = '';
      this.voice = null;
    }
  }

  /**
   * Stop all audio
   */
  public stopAll() {
    this.stopBGM(0);
    
    if (this.voice) {
      this.voice.pause();
      this.voice.onerror = null;
      this.voice.src = '';
      this.voice = null;
    }
    
    this.sfx.forEach(sound => {
      sound.pause();
      sound.onerror = null;
      sound.src = '';
    });
    this.sfx.clear();
    this.channelSfx.clear();
  }
}

export const audioManager = AudioManager.getInstance();
