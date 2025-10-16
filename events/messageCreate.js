const { Events } = require('discord.js');
const { getUser, updateUser } = require('../utils/database');
const { leveling, dailyCiCap } = require('../config');

// Rate-limiting cache
const userCooldowns = new Map();

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		// Ignore bots and DMs
		if (message.author.bot || !message.guild) return;

		const guildId = message.guild.id;
		const userId = message.author.id;

		// Check rate-limit
		const now = Date.now();
		const cooldownKey = `${guildId}-${userId}`;
		const userCooldown = userCooldowns.get(cooldownKey);
		if (userCooldown && now < userCooldown) {
			return; // User is on cooldown
		}

		// Set cooldown for 1 minute (60 * 1000 ms)
		userCooldowns.set(cooldownKey, now + 60000);

		// --- XP and Leveling Logic ---
		const user = getUser(guildId, userId);
		// If user doesn't exist, they haven't been onboarded. Ignore message.
		if (!user) return;

		// Calculate XP gain (1-5 based on length, plus bonus)
		let xpGained = Math.min(Math.floor(message.content.length / 10), 5) || 1;
		// Bonus for using server emoji/sticker
		if (/<a?:\w+:\d+>/.test(message.content) || message.stickers.size > 0) {
			xpGained += 2;
		}

		user.xp += xpGained;

		// --- Level Up Check ---
		const xpForNextLevel = leveling.baseXp + (leveling.xpMultiplier * user.level);
		if (user.xp >= xpForNextLevel) {
			user.level += 1;
			user.xp -= xpForNextLevel; // Reset XP for the new level, keeping the remainder

			// --- Grant CI Tokens on Level Up ---
			const ciGained = leveling.ciBase + (leveling.ciMultiplier * (user.level - 1));

			// Check daily CI cap
			const today = new Date().toISOString().slice(0, 10);
			if (user.lastCiEarnDate !== today) {
				user.ciTokensToday = 0;
				user.lastCiEarnDate = today;
			}

			const remainingCap = dailyCiCap - user.ciTokensToday;
			const ciToAdd = Math.min(ciGained, remainingCap);

			if (ciToAdd > 0) {
				user.ciTokens += ciToAdd;
				user.ciTokensToday += ciToAdd;

				// Notify user of level up and rewards
				message.author.send(`Congratulations! You've reached Level ${user.level} in ${message.guild.name} and earned ${ciToAdd.toFixed(1)} CI Tokens!`).catch(console.error);
			} else {
                message.author.send(`Congratulations! You've reached Level ${user.level} in ${message.guild.name}! You have reached your daily CI Token limit.`).catch(console.error);
            }
		}

		// Update user data in the database
		updateUser(guildId, userId, { xp: user.xp, level: user.level, ciTokens: user.ciTokens, ciTokensToday: user.ciTokensToday, lastCiEarnDate: user.lastCiEarnDate });
	},
};