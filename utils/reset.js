const { readDb, writeDb } = require('./database');
const { marketItems } = require('../config');
const crypto = require('crypto');

async function performMonthlyReset(client) {
    console.log('Starting monthly reset process...');
    const db = readDb();

    const allGuildIds = Object.keys(db);
    if (!allGuildIds || allGuildIds.length === 0) {
        console.log('No guilds found in database. Skipping reset.');
        return;
    }

    const rewardCodes = {
        '1st': `STARMAP-ECHO-5X-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        '2nd': `STARMAP-ECHO-4X-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        '3rd': `STARMAP-ECHO-3X-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        '4th_5th': `STARMAP-ECHO-2X-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    };

    for (const guildId of allGuildIds) {
        const guildData = db[guildId];
        if (!guildData.users) continue;

        // --- 1. Pay out leaderboard rewards ---
        const sortedUsers = Object.values(guildData.users).sort((a, b) => b.xp - a.xp);
        const top5 = sortedUsers.slice(0, 5);

        for (let i = 0; i < top5.length; i++) {
            const userEntry = top5[i];
            try {
                const user = await client.users.fetch(userEntry.id);
                let rewardMessage = `Congratulations on your performance in the ${client.guilds.cache.get(guildId)?.name} Apex Grid!\n`;
                if (i === 0) { // 1st place
                    rewardMessage += `You placed 1st! Here is your reward code for 5x Starmap Echoes: \`${rewardCodes['1st']}\``;
                } else if (i === 1) { // 2nd place
                    rewardMessage += `You placed 2nd! Here is your reward code for 4x Starmap Echoes: \`${rewardCodes['2nd']}\``;
                } else if (i === 2) { // 3rd place
                    rewardMessage += `You placed 3rd! Here is your reward code for 3x Starmap Echoes: \`${rewardCodes['3rd']}\``;
                } else { // 4th & 5th place
                    rewardMessage += `You placed ${i + 1}th! Here is your reward code for 2x Starmap Echoes: \`${rewardCodes['4th_5th']}\``;
                }
                await user.send(rewardMessage);
                 console.log(`Sent reward to ${user.username} for placing ${i+1}`);
            } catch (error) {
                console.error(`Could not send reward DM to user ${userEntry.id}:`, error);
            }
        }

        // --- 2. Reset all user data for the guild ---
        const defaultStock = {};
        marketItems.forEach(item => {
            defaultStock[item.id] = item.stock;
        });

        for (const userId in guildData.users) {
            const user = guildData.users[userId];
            user.level = 0;
            user.xp = 0;
            user.ciTokens = 0;
            user.ciTokensToday = 0;
            user.lastCiEarnDate = null;
            user.marketStock = defaultStock;
        }
    }

    // Write the updated database back to the file
    writeDb(db);
    console.log('Monthly reset process complete. All relevant user data has been reset.');
}

module.exports = { performMonthlyReset };