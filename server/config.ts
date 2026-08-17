import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  discord: {
    clientId: process.env.VITE_DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    guildId: process.env.VITE_DISCORD_GUILD_ID,
  },
  isProduction: process.env.NODE_ENV === 'production',
  isVercel: !!process.env.VERCEL,
};
