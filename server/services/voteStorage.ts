import fs from 'fs';
import path from 'path';

export interface VoteState {
  episodeVotes: Record<string, number>;
  songVotes: Record<string, number>;
  userVotes: Record<string, { episodeId?: string; songCid?: string; updatedAt?: number }>;
}

export interface UserVoteResponse {
  voterId: string | null;
  episodeId: string | null;
  songCid: string | null;
  isDiscordUser: boolean;
  isDiscordMember: boolean;
}

export interface VotePayload {
  episodeId?: string | null;
  songCid?: string | null;
}

/**
 * Enterprise-grade persistent Vote Storage service.
 * - Thread-safe write queue with atomic file swap (temp-file -> rename)
 * - In-memory write-through cache for microsecond reads
 * - Resilient error handling with memory fallback if filesystem is read-only
 */
class VoteStorageService {
  private filePath: string;
  private state: VoteState;
  private isInitialized: boolean = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.filePath = path.join(process.cwd(), 'votes.json');
    this.state = {
      episodeVotes: {},
      songVotes: {},
      userVotes: {}
    };
  }

  /**
   * Initializes the in-memory cache from persistent storage.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (fs.existsSync(this.filePath)) {
        const raw = await fs.promises.readFile(this.filePath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<VoteState>;
        this.state = {
          episodeVotes: parsed.episodeVotes || {},
          songVotes: parsed.songVotes || {},
          userVotes: parsed.userVotes || {}
        };
      } else {
        await this.persist();
      }
    } catch (error) {
      console.warn('[VoteStorage] Failed to read votes file, initializing in-memory store:', error);
      this.state = {
        episodeVotes: {},
        songVotes: {},
        userVotes: {}
      };
    } finally {
      this.isInitialized = true;
    }
  }

  /**
   * Returns current aggregated votes and specific user's vote.
   */
  public async getVoteState(voterId: string | null): Promise<{
    episodeVotes: Record<string, number>;
    songVotes: Record<string, number>;
    userVote: { episodeId: string | null; songCid: string | null };
  }> {
    if (!this.isInitialized) {
      await this.init();
    }

    const userVote = voterId ? (this.state.userVotes[voterId] || {}) : {};

    return {
      episodeVotes: { ...this.state.episodeVotes },
      songVotes: { ...this.state.songVotes },
      userVote: {
        episodeId: userVote.episodeId || null,
        songCid: userVote.songCid || null
      }
    };
  }

  /**
   * Atomically records or retracts a user's vote and queues safe disk persistence.
   */
  public async applyVote(voterId: string, payload: VotePayload): Promise<{
    episodeVotes: Record<string, number>;
    songVotes: Record<string, number>;
    userVote: { episodeId: string | null; songCid: string | null };
  }> {
    if (!this.isInitialized) {
      await this.init();
    }

    const { episodeId, songCid } = payload;
    const existingVote = this.state.userVotes[voterId] || {};

    // 1. Process Episode Vote
    if (episodeId !== undefined) {
      // Retract previous vote if different
      if (existingVote.episodeId && existingVote.episodeId !== episodeId) {
        const oldEp = existingVote.episodeId;
        this.state.episodeVotes[oldEp] = Math.max(0, (this.state.episodeVotes[oldEp] || 1) - 1);
        if (this.state.episodeVotes[oldEp] === 0) {
          delete this.state.episodeVotes[oldEp];
        }
      }

      // Apply new vote or retraction
      if (episodeId && existingVote.episodeId !== episodeId) {
        this.state.episodeVotes[episodeId] = (this.state.episodeVotes[episodeId] || 0) + 1;
        existingVote.episodeId = episodeId;
      } else if (episodeId === null && existingVote.episodeId) {
        const oldEp = existingVote.episodeId;
        this.state.episodeVotes[oldEp] = Math.max(0, (this.state.episodeVotes[oldEp] || 1) - 1);
        if (this.state.episodeVotes[oldEp] === 0) {
          delete this.state.episodeVotes[oldEp];
        }
        existingVote.episodeId = undefined;
      }
    }

    // 2. Process Song Vote
    if (songCid !== undefined) {
      // Retract previous vote if different
      if (existingVote.songCid && existingVote.songCid !== songCid) {
        const oldSong = existingVote.songCid;
        this.state.songVotes[oldSong] = Math.max(0, (this.state.songVotes[oldSong] || 1) - 1);
        if (this.state.songVotes[oldSong] === 0) {
          delete this.state.songVotes[oldSong];
        }
      }

      // Apply new vote or retraction
      if (songCid && existingVote.songCid !== songCid) {
        this.state.songVotes[songCid] = (this.state.songVotes[songCid] || 0) + 1;
        existingVote.songCid = songCid;
      } else if (songCid === null && existingVote.songCid) {
        const oldSong = existingVote.songCid;
        this.state.songVotes[oldSong] = Math.max(0, (this.state.songVotes[oldSong] || 1) - 1);
        if (this.state.songVotes[oldSong] === 0) {
          delete this.state.songVotes[oldSong];
        }
        existingVote.songCid = undefined;
      }
    }

    // 3. Update or purge user registry
    if (!existingVote.episodeId && !existingVote.songCid) {
      delete this.state.userVotes[voterId];
    } else {
      existingVote.updatedAt = Date.now();
      this.state.userVotes[voterId] = existingVote;
    }

    // 4. Trigger non-blocking atomic persistence via mutex write queue
    this.enqueuePersist();

    return {
      episodeVotes: { ...this.state.episodeVotes },
      songVotes: { ...this.state.songVotes },
      userVote: {
        episodeId: existingVote.episodeId || null,
        songCid: existingVote.songCid || null
      }
    };
  }

  /**
   * Enqueues an atomic file write to prevent concurrent write collisions.
   */
  private enqueuePersist(): void {
    this.writeQueue = this.writeQueue
      .then(() => this.persist())
      .catch((err) => {
        console.error('[VoteStorage] Background persist error:', err);
      });
  }

  /**
   * Performs an atomic file write by saving to a temporary file and renaming it.
   */
  private async persist(): Promise<void> {
    const tempPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    const serialized = JSON.stringify(this.state, null, 2);

    try {
      await fs.promises.writeFile(tempPath, serialized, 'utf8');
      await fs.promises.rename(tempPath, this.filePath);
    } catch (error) {
      // In case temp file was created before rename failure, clean it up
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
