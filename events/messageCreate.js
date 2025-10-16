const { Events } = require('discord.js');
const { getUserProfile, updateUserProfile } = require('../utils/database');
const chalk = require('chalk');

// Simple in-memory rate limiting
const userMessageTimestamps = new Map();
const XP_COOLDOWN_MS = 60 * 1000; // 1 minute

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const { author, guild } = message;

        // --- Rate Limiting ---
        const now = Date.now();
        const lastMessageTimestamp = userMessageTimestamps.get(author.id);
        if (lastMessageTimestamp && (now - lastMessageTimestamp) < XP_COOLDOWN_MS) {
            return; // User is on cooldown
        }
        userMessageTimestamps.set(author.id, now);

        // --- XP Calculation ---
        const userProfile = getUserProfile(guild.id, author.id);
        if (!userProfile || !userProfile.onboarded) {
            return; // Only grant XP to onboarded users
        }

        let xpGained = 0;
        // Base XP for message length
        if (message.content.length > 5) {
            xpGained += Math.min(5, Math.floor(message.content.length / 10)); // 1-5 XP based on length
        }

        // Bonus for official server emojis/stickers
        const hasServerEmoji = message.content.match(/<a?:\w+:\d+>/g)?.some(e => message.guild.emojis.cache.has(e.split(':')[2].slice(0, -1)));
        const hasServerSticker = message.stickers.some(s => s.guildId === message.guild.id);

        if (hasServerEmoji || hasServerSticker) {
            xpGained += 2; // Bonus XP
        }

        if (xpGained === 0) return;

        // --- Update Profile & Check for Level Up ---
        const newXp = userProfile.xp + xpGained;
        const xpNeededForNextLevel = 100 + (0.5 * userProfile.level);

        let newLevel = userProfile.level;
        let newCiTokens = userProfile.ci_tokens;
        let leveledUp = false;

        let dailyCiEarned = userProfile.daily_ci_earned || 0;

        if (newXp >= xpNeededForNextLevel) {
            newLevel++;
            leveledUp = true;

            const ciForLevelUp = 1 + (0.5 * (newLevel - 1));
            const remainingCiCap = 70 - dailyCiEarned;

            const ciGranted = Math.min(ciForLevelUp, remainingCiCap);

            if (ciGranted > 0) {
                newCiTokens += ciGranted;
                dailyCiEarned += ciGranted;
            }

            console.log(chalk.cyan(`${author.tag} has leveled up to Level ${newLevel} in guild ${guild.name}! Granted ${ciGranted} CI Tokens.`));
        }

        updateUserProfile(guild.id, author.id, {
            xp: newXp,
            level: newLevel,
            ci_tokens: newCiTokens,
            daily_ci_earned: dailyCiEarned,
        });
    },
};