const { readUserDb, writeUserDb } = require('./database');
const { items } = require('./marketItems');
const chalk = require('chalk');

// --- Reward Structure ---
const leaderboardRewards = {
    1: { name: "5x Starmap Echoes", code: "REWARD-TIER1" },
    2: { name: "4x Starmap Echoes", code: "REWARD-TIER2" },
    3: { name: "3x Starmap Echoes", code: "REWARD-TIER3" },
    4: { name: "2x Starmap Echoes", code: "REWARD-TIER4" },
    5: { name: "2x Starmap Echoes", code: "REWARD-TIER5" },
};

/**
 * Performs the monthly reset for all guilds.
 * 1. Iterates through each guild in the database.
 * 2. For each guild, determines the top 5 users by XP.
 * 3. DMs the winners with their reward codes.
 * 4. Resets XP, level, CI tokens, and market stock for ALL users in that guild.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
async function performMonthlyReset(client) {
    console.log(chalk.blue.bold('--- [CRON] Starting Monthly Reset Protocol ---'));
    const db = readUserDb();
    const newDb = { ...db };

    const defaultStock = {};
    items.forEach(item => {
        defaultStock[item.id] = item.stock;
    });

    for (const guildId in newDb) {
        const guildUsers = newDb[guildId];
        if (!guildUsers || Object.keys(guildUsers).length === 0) continue;

        console.log(chalk.cyan(`[RESET] Processing guild: ${guildId}`));

        // --- 1. Determine Leaderboard Winners ---
        const sortedUsers = Object.entries(guildUsers)
            .filter(([_, user]) => user.onboarded)
            .sort(([, a], [, b]) => b.xp - a.xp)
            .slice(0, 5); // Top 5

        // --- 2. Distribute Rewards ---
        for (let i = 0; i < sortedUsers.length; i++) {
            const userId = sortedUsers[i][0];
            const rank = i + 1;
            const reward = leaderboardRewards[rank];

            try {
                const user = await client.users.fetch(userId);
                await user.send(
                    `Congratulations! You placed **#${rank}** on this month's leaderboard!\n\n` +
                    `Your reward is: **${reward.name}**.\n` +
                    `Redeem this code: \`\`\`${reward.code}-${new Date().getMonth() + 1}-${new Date().getFullYear()}\`\`\`\n\n` +
                    `Your stats have now been reset for the new month. Good luck!`
                );
                console.log(chalk.green(`  > Sent reward to rank ${rank} user ${user.tag}`));
            } catch (error) {
                console.error(chalk.red(`  > Failed to DM reward to user ${userId} (Rank ${rank}).`), error);
            }
        }

        // --- 3. Reset All Users in the Guild ---
        for (const userId in guildUsers) {
            newDb[guildId][userId] = {
                ...guildUsers[userId], // Keep 'onboarded' status and other non-resetting data
                xp: 0,
                level: 0,
                ci_tokens: 0,
                stock: { ...defaultStock },
            };
        }
        console.log(chalk.yellow(`  > Reset stats for all users in guild ${guildId}.`));
    }

    writeUserDb(newDb);
    console.log(chalk.blue.bold('--- [CRON] Monthly Reset Protocol Complete ---'));
}

module.exports = { performMonthlyReset };