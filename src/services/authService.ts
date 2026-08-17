export interface DiscordUserData {
  id: string;
  username: string;
  avatar: string | null;
}

export interface AuthState {
  user: DiscordUserData | null;
  isMember: boolean;
  token: string | null;
}

const TOKEN_KEY = 'ak_discord_token';
const USER_CACHE_KEY = 'ak_discord_user_v1';

type AuthListener = (state: AuthState) => void;

class AuthService {
  private listeners: Set<AuthListener> = new Set();
  private currentUser: DiscordUserData | null = null;
  private isMember: boolean = false;
  private token: string | null = null;
  private isChecking: boolean = false;
  private hasInitialized: boolean = false;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      this.initWindowListeners();
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      this.token = localStorage.getItem(TOKEN_KEY);
      const cached = localStorage.getItem(USER_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.user) {
          this.currentUser = parsed.user;
          this.isMember = !!parsed.isMember;
        }
      }
    } catch {
      // Storage unavailable or blocked
    }
  }

  private saveToStorage(user: DiscordUserData | null, isMember: boolean, token: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }

      if (user) {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, isMember }));
      } else {
        localStorage.removeItem(USER_CACHE_KEY);
      }
    } catch {
      // Storage quota or privacy mode
    }
  }

  private initWindowListeners(): void {
    // 1. Listen for OAuth callback postMessage
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'DISCORD_AUTH_SUCCESS') {
        if (typeof event.data.token === 'string' && event.data.token) {
          this.setToken(event.data.token);
        }
        this.fetchUser();
      }
    });

    // 2. Check URL for direct redirect OAuth parameters
    if (window.location.search.includes('auth=success') || window.location.search.includes('discord_token')) {
      const params = new URLSearchParams(window.location.search);
      const directToken = params.get('discord_token');
      if (directToken) {
        this.setToken(directToken);
      }
      // Clean query params from URL without page reload
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      this.fetchUser();
    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.error('[AuthService] Listener error:', e);
      }
    });
  }

  public getState(): AuthState {
    return {
      user: this.currentUser,
      isMember: this.isMember,
      token: this.token,
    };
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string): void {
    this.token = token;
    this.saveToStorage(this.currentUser, this.isMember, token);
  }

  public getAuthHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...additionalHeaders };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-discord-token'] = this.token;
    }
    return headers;
  }

  public async fetchUser(force: boolean = false): Promise<AuthState> {
    if (this.isChecking && !force) {
      return this.getState();
    }

    this.isChecking = true;
    try {
      const headers = this.getAuthHeaders();
      const response = await fetch('/api/auth/discord/user', {
        headers,
        credentials: 'include', // Ensures HTTP-only cookie is passed
      });

      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.user || null;
        this.isMember = !!data.isMember;
        if (data.token) {
          this.token = data.token;
        }
        this.saveToStorage(this.currentUser, this.isMember, this.token);
      } else if (response.status === 401) {
        // Token invalidated or logged out
        this.currentUser = null;
        this.isMember = false;
        this.token = null;
        this.saveToStorage(null, false, null);
      }
    } catch (e) {
      console.warn('[AuthService] Failed to check Discord auth state:', e);
      // Keep cached state if offline/network blip
    } finally {
      this.isChecking = false;
      this.hasInitialized = true;
      this.notify();
    }

    return this.getState();
  }

  public login(): void {
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
      alert('Всплывающее окно было заблокировано браузером.\n\nПожалуйста, разрешите всплывающие окна для этого сайта в настройках браузера.');
    }
  }

  public async logout(): Promise<void> {
    try {
      const headers = this.getAuthHeaders();
      await fetch('/api/auth/discord/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch (e) {
      console.error('[AuthService] Logout request error:', e);
    } finally {
      this.currentUser = null;
      this.isMember = false;
      this.token = null;
      this.saveToStorage(null, false, null);
      this.notify();
    }
  }
}

export const authService = new AuthService();
