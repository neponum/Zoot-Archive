export class AudioManager {
  private static instance: AudioManager;
  
  private bgmAudio: HTMLAudioElement;
  private sfxAudio: HTMLAudioElement;
  private voiceAudio: HTMLAudioElement;

  private currentBgmUrl: string | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = true;
    
    this.sfxAudio = new Audio();
    this.voiceAudio = new Audio();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public playBGM(url: string, volume: number = 0.5, fade: boolean = true) {
    if (this.currentBgmUrl === url) {
      this.bgmAudio.volume = volume;
      return;
    }

    this.currentBgmUrl = url;

    if (fade && !this.bgmAudio.paused) {
      this.fadeOut(() => {
        this.bgmAudio.src = url;
        this.bgmAudio.load();
        this.bgmAudio.play().catch(e => console.warn('BGM play failed:', e));
        this.fadeIn(volume);
      });
    } else {
      this.bgmAudio.src = url;
      this.bgmAudio.load();
      this.bgmAudio.volume = volume;
      this.bgmAudio.play().catch(e => console.warn('BGM play failed:', e));
    }
  }

  public stopBGM(fade: boolean = true) {
    this.currentBgmUrl = null;
    if (fade) {
      this.fadeOut(() => {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      });
    } else {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  public playSFX(url: string, volume: number = 1) {
    this.sfxAudio.pause();
    this.sfxAudio.currentTime = 0;
    this.sfxAudio.src = url;
    this.sfxAudio.volume = volume;
    this.sfxAudio.play().catch(e => {
      if (e.name !== 'AbortError') {
        console.warn('SFX play failed:', e);
      }
    });
  }

  public playVoice(url: string, volume: number = 1) {
    this.voiceAudio.pause();
    this.voiceAudio.currentTime = 0;
    this.voiceAudio.src = url;
    this.voiceAudio.volume = volume;
    this.voiceAudio.play().catch(e => {
      if (e.name !== 'AbortError') {
        console.warn('Voice play failed:', e);
      }
    });
  }

  public stopVoice() {
    this.voiceAudio.pause();
    this.voiceAudio.currentTime = 0;
  }

  public stopAll() {
    this.stopBGM(false);
    this.sfxAudio.pause();
    this.voiceAudio.pause();
  }

  private fadeOut(callback: () => void) {
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    
    const startVolume = this.bgmAudio.volume;
    const steps = 20;
    const stepTime = 50; // 1 second total fade
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    this.fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
      this.bgmAudio.volume = newVolume;
      
      if (currentStep >= steps) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        callback();
      }
    }, stepTime);
  }

  private fadeIn(targetVolume: number) {
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    
    this.bgmAudio.volume = 0;
    const steps = 20;
    const stepTime = 50; // 1 second total fade
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    this.fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = Math.min(targetVolume, volumeStep * currentStep);
      this.bgmAudio.volume = newVolume;
      
      if (currentStep >= steps) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
      }
    }, stepTime);
  }
}
