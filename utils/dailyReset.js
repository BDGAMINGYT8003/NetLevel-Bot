const { readUserDb, writeUserDb } = require('./database');
const chalk = require('chalk');

/**
 * Resets the `daily_ci_earned` counter for every user in the database.
 * This should be run once daily.
 */
function performDailyReset() {
    console.log(chalk.blue.bold('--- [CRON] Starting Daily CI Cap Reset ---'));
    const db = readUserDb();
    const newDb = { ...db };

    for (const guildId in newDb) {
        const guildUsers = newDb[guildId];
        if (!guildUsers) continue;

        for (const userId in guildUsers) {
            if (newDb[guildId][userId].daily_ci_earned > 0) {
                newDb[guildId][userId].daily_ci_earned = 0;
            }
        }
    }

    writeUserDb(newDb);
    console.log(chalk.blue.bold('--- [CRON] Daily CI Cap Reset Complete ---'));
}

module.exports = { performDailyReset };