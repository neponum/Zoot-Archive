import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { voteStorage, VotePayload } from '../services/voteStorage.js';
import { extractDiscordToken } from '../utils/authHelper.js';

const router = Router();

// Helper to verify Discord user status and guild membership
async function verifyDiscordUser(req: Request): Promise<{ id: string; isMember: boolean } | null> {
  const token = extractDiscordToken(req);
  if (!token) {
    return null;
  }
  try {
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userResponse.ok) return null;
    const userData = (await userResponse.json()) as { id: string };

    let isMember = true;
    if (config.discord.guildId) {
      const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (guildsResponse.ok) {
        const guilds = (await guildsResponse.json()) as Array<{ id: string }>;
        isMember = Array.isArray(guilds) && guilds.some((g) => g.id === config.discord.guildId);
      } else {
        isMember = false;
      }
    }

    return { id: userData.id, isMember };
  } catch (error) {
    console.error('[VoteRoute] Error verifying Discord user token:', error);
    return null;
  }
}

// GET current results
router.get('/', async (req: Request, res: Response) => {
  try {
    const discordUser = await verifyDiscordUser(req);
    const voterId = discordUser ? `discord_${discordUser.id}` : null;
    const voteData = await voteStorage.getVoteState(voterId);

    return res.json({
      episodeVotes: voteData.episodeVotes,
      songVotes: voteData.songVotes,
      userVote: {
        voterId,
        episodeId: voteData.userVote.episodeId,
        songCid: voteData.userVote.songCid,
        isDiscordUser: !!discordUser,
        isDiscordMember: discordUser ? discordUser.isMember : false
      }
    });
  } catch (error) {
    console.error('[VoteRoute] GET error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vote state' });
  }
});

// POST vote
router.post('/', async (req: Request, res: Response) => {
  try {
    const { episodeId, songCid } = req.body as VotePayload;

    // Verify user is authenticated with Discord and in the correct server
    const discordUser = await verifyDiscordUser(req);
    if (!discordUser) {
      return res.status(401).json({ error: "Only authenticated Discord users can vote." });
    }
    if (config.discord.guildId && !discordUser.isMember) {
      return res.status(403).json({ error: "Only members of the authorized Discord server can vote." });
    }

    const voterId = `discord_${discordUser.id}`;
    const voteData = await voteStorage.applyVote(voterId, { episodeId, songCid });

    return res.json({
      success: true,
      episodeVotes: voteData.episodeVotes,
      songVotes: voteData.songVotes,
      userVote: {
        voterId,
        episodeId: voteData.userVote.episodeId,
        songCid: voteData.userVote.songCid
      }
    });
  } catch (error) {
    console.error('[VoteRoute] POST error:', error);
    return res.status(500).json({ error: 'Failed to process vote' });
  }
});

export default router;
