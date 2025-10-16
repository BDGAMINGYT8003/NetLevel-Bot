const { getLevelForXp } = require('./xpUtils');
const chalk = require('chalk');

/**
 * Processes a user's XP gain, calculates level-ups, and determines CI token rewards.
 * @param {object} userProfile The user's current profile from the database.
 * @param {number} xpGained The amount of new XP the user has gained.
 * @returns {object} An object containing the updated user data.
 */
function processLevelUp(userProfile, xpGained) {
    const newTotalXp = userProfile.xp + xpGained;
    const oldLevel = userProfile.level;
    const newLevel = getLevelForXp(newTotalXp);

    let newCiTokens = userProfile.ci_tokens;

    if (newLevel > oldLevel) {
        // User leveled up, possibly multiple times
        let ciGainedThisLevelUp = 0;
        for (let levelReached = oldLevel + 1; levelReached <= newLevel; levelReached++) {
            const ciForLevel = 5 + (0.25 * (levelReached - 1));
            ciGainedThisLevelUp += ciForLevel;
        }

        newCiTokens += ciGainedThisLevelUp;

        console.log(chalk.cyan(`Level-up event: ${oldLevel} -> ${newLevel}. Granted ${ciGainedThisLevelUp.toFixed(2)} CI Tokens.`));
    }

    return {
        xp: newTotalXp,
        level: newLevel,
        ci_tokens: newCiTokens,
    };
}

module.exports = { processLevelUp };