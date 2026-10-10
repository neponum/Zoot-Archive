import fs from 'fs';
import path from 'path';

export interface VoteState {
  episodeVotes: Record<string, number>;
  userVotes: Record<string, { episodeId?: string; updatedAt?: number }>;
}

export interface VotePayload {
  episodeId?: string | null;
}

function emptyState(): VoteState {
  return { episodeVotes: {}, userVotes: {} };
}

function normalizeState(parsed: Partial<VoteState> | null | undefined): VoteState {
  return {
    episodeVotes: (parsed?.episodeVotes && typeof parsed.episodeVotes === 'object') ? parsed.episodeVotes : {},
    userVotes: (parsed?.userVotes && typeof parsed.userVotes === 'object') ? parsed.userVotes : {},
  };
}

/**
 * Persistent vote storage with two backends:
 *
 * 1. Vercel KV / Upstash Redis (production): the serverless filesystem is
 *    read-only and in-memory state is lost between invocations, so state is
 *    kept in Redis via its REST API. Activated automatically when
 *    KV_REST_API_URL and KV_REST_API_TOKEN are present (Vercel injects both
 *    once the project is linked to a KV store). No extra dependencies needed.
 * 2. Local JSON file (development): votes.json next to the project root.
 */
class VoteStorageService {
  private readonly kvUrl: string;
  private readonly kvToken: string;
  private readonly stateKey = 'zoot:votes:state';
  private readonly filePath = path.join(process.cwd(), 'votes.json');
  private state: VoteState = emptyState();
  private isInitialized = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.kvUrl = (process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
    this.kvToken = process.env.KV_REST_API_TOKEN || '';
  }

  private get kvEnabled(): boolean {
    return !!(this.kvUrl && this.kvToken);
  }

  private async kvCommand<T>(command: (string | number)[]): Promise<T> {
    const res = await fetch(this.kvUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      throw new Error(`KV REST request failed: ${res.status}`);
    }
    const data = (await res.json()) as { result: T };
    return data.result;
  }

  private async loadState(): Promise<VoteState> {
    if (this.kvEnabled) {
      try {
        const raw = await this.kvCommand<string | null>(['GET', this.stateKey]);
        if (!raw) return emptyState();
        return normalizeState(JSON.parse(raw) as Partial<VoteState>);
      } catch (error) {
        console.warn('[VoteStorage] KV read failed, using last known state:', error);
        return normalizeState(this.state);
      }
    }
    return normalizeState(this.state);
  }

  private async saveState(state: VoteState): Promise<void> {
    this.state = state;
    if (this.kvEnabled) {
      await this.kvCommand(['SET', this.stateKey, JSON.stringify(state)]);
      return;
    }
    this.enqueuePersist();
  }

  /**
   * Initializes the in-memory cache from persistent storage.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (this.kvEnabled) {
      this.state = await this.loadState();
      this.isInitialized = true;
      return;
    }

    try {
      if (fs.existsSync(this.filePath)) {
        const raw = await fs.promises.readFile(this.filePath, 'utf8');
        this.state = normalizeState(JSON.parse(raw) as Partial<VoteState>);
      } else {
        await this.persist();
      }
    } catch (error) {
      console.warn('[VoteStorage] Failed to read votes file, initializing in-memory store:', error);
      this.state = emptyState();
    } finally {
      this.isInitialized = true;
    }
  }

  /**
   * Returns current aggregated votes and specific user's vote.
   */
  public async getVoteState(voterId: string | null): Promise<{
    episodeVotes: Record<string, number>;
    userVote: { episodeId: string | null };
  }> {
    if (!this.isInitialized) {
      await this.init();
    }

    const state = await this.loadState();
    const userVote = voterId ? (state.userVotes[voterId] || {}) : {};

    return {
      episodeVotes: { ...state.episodeVotes },
      userVote: {
        episodeId: userVote.episodeId || null,
      },
    };
  }

  /**
   * Atomically records or retracts a user's episode vote and persists the result.
   */
  public async applyVote(voterId: string, payload: VotePayload): Promise<{
    episodeVotes: Record<string, number>;
    userVote: { episodeId: string | null };
  }> {
    if (!this.isInitialized) {
      await this.init();
    }

    const state = await this.loadState();
    const { episodeId } = payload;
    const existingVote = state.userVotes[voterId] || {};

    // Process episode vote (retract previous, apply new)
    if (episodeId !== undefined) {
      if (existingVote.episodeId && existingVote.episodeId !== episodeId) {
        const oldEp = existingVote.episodeId;
        state.episodeVotes[oldEp] = Math.max(0, (state.episodeVotes[oldEp] || 1) - 1);
        if (state.episodeVotes[oldEp] === 0) {
          delete state.episodeVotes[oldEp];
        }
      }

      if (episodeId && existingVote.episodeId !== episodeId) {
        state.episodeVotes[episodeId] = (state.episodeVotes[episodeId] || 0) + 1;
        existingVote.episodeId = episodeId;
      } else if (episodeId === null && existingVote.episodeId) {
        const oldEp = existingVote.episodeId;
        state.episodeVotes[oldEp] = Math.max(0, (state.episodeVotes[oldEp] || 1) - 1);
        if (state.episodeVotes[oldEp] === 0) {
          delete state.episodeVotes[oldEp];
        }
        existingVote.episodeId = undefined;
      }
    }

    // Update or purge user registry
    if (!existingVote.episodeId) {
      delete state.userVotes[voterId];
    } else {
      existingVote.updatedAt = Date.now();
      state.userVotes[voterId] = existingVote;
    }

    await this.saveState(state);

    return {
      episodeVotes: { ...state.episodeVotes },
      userVote: {
        episodeId: existingVote.episodeId || null,
      },
    };
  }

  /**
   * Enqueues an atomic file write to prevent concurrent write collisions (local mode only).
   */
  private enqueuePersist(): void {
    this.writeQueue = this.writeQueue
      .then(() => this.persist())
      .catch((err) => {
        console.error('[VoteStorage] Background persist error:', err);
      });
  }

  /**
   * Performs an atomic file write by saving to a temporary file and renaming it (local mode only).
   */
  private async persist(): Promise<void> {
    const tempPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    const serialized = JSON.stringify(this.state, null, 2);

    try {
      await fs.promises.writeFile(tempPath, serialized, 'utf8');
      await fs.promises.rename(tempPath, this.filePath);
    } catch (error) {
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch {
        // ignore cleanup error
      }
      console.warn('[VoteStorage] Could not write to disk (read-only environment or permissions), state maintained in memory:', error);
    }
  }
}

export const voteStorage = new VoteStorageService();
