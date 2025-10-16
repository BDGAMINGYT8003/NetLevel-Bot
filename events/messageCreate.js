const { Events } = require('discord.js');
const { getUserProfile, updateUserProfile } = require('../utils/database');
const { processLevelUp } = require('../utils/levelUp');
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
        // Base XP for message length (guaranteed 1-5 XP for messages > 5 chars)
        if (message.content.length > 5) {
            const base_xp = Math.floor(message.content.length / 10);
            xpGained += Math.max(1, Math.min(5, base_xp));
        }

        // Bonus for official server emojis/stickers
        const hasServerEmoji = message.content.match(/<a?:\w+:\d+>/g)?.some(e => message.guild.emojis.cache.has(e.split(':')[2].slice(0, -1)));
        const hasServerSticker = message.stickers.some(s => s.guildId === message.guild.id);

        if (hasServerEmoji || hasServerSticker) {
            xpGained += 2; // Bonus XP
        }

        if (xpGained === 0) return;

        // --- Update Profile & Check for Level Up ---
        const updatedStats = processLevelUp(userProfile, xpGained);
        updateUserProfile(guild.id, author.id, updatedStats);
    },
};