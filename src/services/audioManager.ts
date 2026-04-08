import { Howl } from 'howler';

class AudioManager {
  private static instance: AudioManager;
  
  private bgm: Howl | null = null;
  private bgmUrl: string | null = null;
  private bgmVolume: number = 0.5;
  
  private masterBGMVolume: number = 1.0;
  private masterSFXVolume: number = 1.0;
  private masterVoiceVolume: number = 1.0;
  
  private sfx: Map<string, Howl> = new Map();
  private voice: Howl | null = null;
  
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
      this.bgm.volume(this.bgmVolume * this.masterBGMVolume);
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

  /**
   * Play background music with optional crossfade
   */
  public async playBGM(url: string, volume: number = 0.5, fadeDuration: number = 1000) {
    if (this.bgmUrl === url) {
      if (this.bgm) {
        this.bgm.volume(volume * this.masterBGMVolume);
      }
      return;
    }

    const oldBgm = this.bgm;
    this.bgmUrl = url;
    this.bgmVolume = volume;

    // Fade out old BGM
    if (oldBgm) {
      oldBgm.fade(oldBgm.volume(), 0, fadeDuration);
      setTimeout(() => {
        oldBgm.stop();
        oldBgm.unload();
      }, fadeDuration);
    }

    // Load and fade in new BGM
    this.bgm = new Howl({
      src: [url],
      html5: true, // Use HTML5 Audio for large files (BGM)
      loop: true,
      volume: 0,
    });

    this.bgm.play();
    this.bgm.fade(0, volume * this.masterBGMVolume, fadeDuration);
  }

  /**
   * Stop background music with fade out
   */
  public stopBGM(fadeDuration: number = 1000) {
    if (this.bgm) {
      const currentBgm = this.bgm;
      currentBgm.fade(currentBgm.volume(), 0, fadeDuration);
      setTimeout(() => {
        currentBgm.stop();
        currentBgm.unload();
      }, fadeDuration);
      this.bgm = null;
      this.bgmUrl = null;
    }
  }

  /**
   * Play sound effect
   */
  public playSFX(url: string, volume: number = 1.0) {
    const sound = new Howl({
      src: [url],
      html5: true,
      volume: volume * this.masterSFXVolume,
      onend: () => {
        sound.unload();
      }
    });
    sound.play();
  }

  /**
   * Play voice line (stops previous voice)
   */
  public playVoice(url: string, volume: number = 1.0) {
    if (this.voice) {
      this.voice.stop();
      this.voice.unload();
    }

    this.voice = new Howl({
      src: [url],
      html5: true,
      volume: volume * this.masterVoiceVolume,
      onend: () => {
        this.voice = null;
      }
    });
    this.voice.play();
  }

  /**
   * Stop all audio
   */
  public stopAll() {
    this.stopBGM(0);
    if (this.voice) {
      this.voice.stop();
      this.voice.unload();
      this.voice = null;
    }
    // Howler.stop() stops all sounds
    import('howler').then(({ Howler }) => Howler.stop());
  }
}

export const audioManager = AudioManager.getInstance();
