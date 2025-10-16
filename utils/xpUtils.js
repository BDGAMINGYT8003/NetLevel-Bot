const memo = {};

/**
 * Calculates the XP cost to get from (level - 1) to the specified level.
 * Formula: XP_cost = 100 + (L - 1)
 * @param {number} level The target level.
 * @returns {number} The XP required to complete that level.
 */
function getXpCostForLevel(level) {
    if (level <= 0) return 0;
    if (level === 1) return 100;
    // For L > 1, the formula is 100 + (L-1) + 0.5, but the table implies a simpler progression.
    // The table shows L1=100, L2=101, L3=102. This is `100 + (L-1)`.
    return 100 + (level - 1);
}

/**
 * Calculates the total cumulative XP required to reach a specific level from level 0.
 * This is the sum of costs for all preceding levels.
 * @param {number} level The target level.
 * @returns {number} The total cumulative XP required to attain that level.
 */
function getCumulativeXpForLevel(level) {
    if (level <= 0) return 0;
    if (memo[level]) return memo[level];

    let totalXp = 0;
    for (let i = 1; i <= level; i++) {
        totalXp += getXpCostForLevel(i);
    }

    memo[level] = totalXp;
    return totalXp;
}

/**
 * Determines the correct level for a given amount of total XP.
 * @param {number} xp The user's total XP.
 * @returns {number} The user's current level.
 */
function getLevelForXp(xp) {
    if (xp < getCumulativeXpForLevel(1)) return 0;

    let level = 1;
    while (true) {
        const xpForNextLevel = getCumulativeXpForLevel(level + 1);
        if (xp < xpForNextLevel) {
            return level;
        }
        level++;
    }
}

module.exports = {
    getXpCostForLevel,
    getCumulativeXpForLevel,
    getLevelForXp,
};