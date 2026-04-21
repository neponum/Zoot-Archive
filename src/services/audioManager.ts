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

  /**
   * Play background music with optional crossfade and intro
   */
  public async playBGM(url: string, volume: number = 0.5, fadeDuration: number = 1000, introUrl?: string, name?: string, introName?: string) {
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
      this.fadeAudio(oldBgm, oldBgm.volume, 0, fadeDuration, () => {
        oldBgm.pause();
        oldBgm.src = '';
      });
    }

    // Load and fade in new BGM
    const newBgm = new Audio(introUrl || url);
    newBgm.loop = !introUrl;
    newBgm.volume = 0;
    
    // Add error listener to catch native browser errors
    newBgm.onerror = (e: any) => {
      const target = e.target as HTMLAudioElement;
      const errorMsg = target.error ? target.error.message : 'Unknown error';
      console.error(`Failed to load BGM audio resource: ${introName || name || introUrl || url}. Error: ${errorMsg}`);
    };
    
    try {
      await newBgm.play();
      
      // If stopAll or another playBGM was called while waiting for play() to resolve, abort.
      if (playId !== this.currentPlayId) {
        newBgm.pause();
        newBgm.src = '';
        return;
      }

      this.bgm = newBgm;
      this.bgmFadeInterval = this.fadeAudio(newBgm, 0, Math.max(0, Math.min(1, volume * this.masterBGMVolume)), fadeDuration);

      if (introUrl) {
        newBgm.onended = async () => {
          // Only switch to loop if this intro is still the active BGM
          if (this.bgm === newBgm && playId === this.currentPlayId) {
            const loopBgm = new Audio(url);
            loopBgm.loop = true;
            loopBgm.volume = Math.max(0, Math.min(1, volume * this.masterBGMVolume));
            
            loopBgm.onerror = (e: any) => {
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
          currentBgm.src = '';
        });
      } else {
        currentBgm.pause();
        currentBgm.src = '';
      }
      
      this.bgm = null;
      this.bgmUrl = null;
    }
  }

  /**
   * Play sound effect
   */
  public playSFX(url: string, volume: number = 1.0) {
    const sound = new Audio(url);
    sound.volume = Math.max(0, Math.min(1, volume * this.masterSFXVolume));
    
    sound.onerror = (e: any) => {
      const target = e.target as HTMLAudioElement;
      const errorMsg = target.error ? target.error.message : 'Unknown error';
      console.error(`Failed to load SFX audio resource: ${url}. Error: ${errorMsg}`);
    };
    
    sound.addEventListener('ended', () => {
      this.sfx.delete(sound);
      sound.src = '';
    });
    
    this.sfx.add(sound);
    sound.play().catch(e => {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`Failed to play SFX: ${url}. Error: ${errorMsg}`);
    });
  }

  /**
   * Play voice line (stops previous voice)
   */
  public playVoice(url: string, volume: number = 1.0) {
    if (this.voice) {
      this.voice.pause();
      this.voice.src = '';
    }

    this.voice = new Audio(url);
    this.voice.volume = Math.max(0, Math.min(1, volume * this.masterVoiceVolume));
    
    this.voice.onerror = (e: any) => {
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
   * Stop all audio
   */
  public stopAll() {
    this.stopBGM(0);
    
    if (this.voice) {
      this.voice.pause();
      this.voice.src = '';
      this.voice = null;
    }
    
    this.sfx.forEach(sound => {
      sound.pause();
      sound.src = '';
    });
    this.sfx.clear();
  }
}

export const audioManager = AudioManager.getInstance();
