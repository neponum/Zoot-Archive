// AudioManager uses standard HTML5 Audio to avoid CORS issues with external audio files
// that don't provide Access-Control-Allow-Origin headers.

class AudioManager {
  private static instance: AudioManager;
  
  private bgm: HTMLAudioElement | null = null;
  private bgmUrl: string | null = null;
  private bgmVolume: number = 0.5;
  private bgmFadeInterval: number | null = null;
  
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
      this.bgm.volume = this.bgmVolume * this.masterBGMVolume;
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
    const stepTime = duration / steps;
    const volumeStep = (endVol - startVol) / steps;
    let currentStep = 0;

    audio.volume = startVol;

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
  public async playBGM(url: string, volume: number = 0.5, fadeDuration: number = 1000, introUrl?: string) {
    if (this.bgmUrl === url && !introUrl) {
      if (this.bgm) {
        this.bgm.volume = volume * this.masterBGMVolume;
      }
      return;
    }

    const oldBgm = this.bgm;
    const oldInterval = this.bgmFadeInterval;
    
    this.bgmUrl = url;
    this.bgmVolume = volume;

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
    
    try {
      await newBgm.play();
      this.bgm = newBgm;
      this.bgmFadeInterval = this.fadeAudio(newBgm, 0, volume * this.masterBGMVolume, fadeDuration);

      if (introUrl) {
        newBgm.onended = async () => {
          // Only switch to loop if this intro is still the active BGM
          if (this.bgm === newBgm) {
            const loopBgm = new Audio(url);
            loopBgm.loop = true;
            loopBgm.volume = volume * this.masterBGMVolume;
            try {
              await loopBgm.play();
              // Double check again after async play
              if (this.bgm === newBgm) {
                this.bgm = loopBgm;
              } else {
                loopBgm.pause();
                loopBgm.src = '';
              }
            } catch (e) {
              console.error('Failed to play loop BGM', e);
            }
          }
        };
      }
    } catch (e) {
      console.error('Failed to play BGM', e);
    }
  }

  /**
   * Stop background music with fade out
   */
  public stopBGM(fadeDuration: number = 1000) {
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
    sound.volume = volume * this.masterSFXVolume;
    
    sound.addEventListener('ended', () => {
      this.sfx.delete(sound);
      sound.src = '';
    });
    
    this.sfx.add(sound);
    sound.play().catch(e => console.error('Failed to play SFX', e));
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
    this.voice.volume = volume * this.masterVoiceVolume;
    
    this.voice.addEventListener('ended', () => {
      this.voice = null;
    });
    
    this.voice.play().catch(e => console.error('Failed to play voice', e));
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
