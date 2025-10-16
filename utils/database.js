const fs = require('node:fs');
const path = require('node:path');
const chalk = require('chalk');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const userDbPath = path.join(dataDir, 'users.json');

// --- Helper Functions ---

/**
 * Reads the entire user database from the JSON file.
 * Creates the file with an empty object if it doesn't exist.
 * @returns {object} The parsed user database.
 */
function readUserDb() {
    try {
        if (!fs.existsSync(userDbPath)) {
            fs.writeFileSync(userDbPath, JSON.stringify({}, null, 4));
            console.log(chalk.yellow('Created initial users.json database.'));
            return {};
        }
        const data = fs.readFileSync(userDbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('[DB ERROR] Failed to read or parse users.json:'), error);
        return {}; // Return empty object on error to prevent crashes
    }
}

/**
 * Writes data to the user database file.
 * @param {object} data The data object to write to the file.
 */
function writeUserDb(data) {
    try {
        fs.writeFileSync(userDbPath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error(chalk.red('[DB ERROR] Failed to write to users.json:'), error);
    }
}

// --- Core Database Functions ---

/**
 * Gets the profile for a specific user in a specific guild.
 * Initializes a default profile if one doesn't exist.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @returns {object | null} The user's profile object or null if not onboarded.
 */
function getUserProfile(guildId, userId) {
    const db = readUserDb();
    if (db[guildId] && db[guildId][userId]) {
        return db[guildId][userId];
    }
    return null; // User does not have a profile yet
}

/**
 * Creates an initial profile for a new user once they complete the tutorial.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @returns {object} The newly created user profile.
 */
function createUserProfile(guildId, userId) {
    const db = readUserDb();

    if (!db[guildId]) {
        db[guildId] = {};
    }

    if (db[guildId][userId]) {
        return db[guildId][userId]; // Profile already exists
    }

    const marketItems = require('./marketItems').items;
    const userStock = {};
    marketItems.forEach(item => {
        userStock[item.id] = item.stock;
    });

    db[guildId][userId] = {
        onboarded: false, // Start as not onboarded
        xp: 0,
        level: 0,
        ci_tokens: 0,
        stock: userStock,
    };

    writeUserDb(db);
    return db[guildId][userId];
}

/**
 * Updates a user's profile data.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @param {object} newData The new data to merge into the user's profile.
 */
function updateUserProfile(guildId, userId, newData) {
    const db = readUserDb();
    if (!db[guildId] || !db[guildId][userId]) {
        console.error(chalk.red(`[DB_UPDATE_ERROR] Attempted to update non-existent profile for user ${userId} in guild ${guildId}.`));
        return;
    }

    // Merge the new data into the existing profile
    db[guildId][userId] = { ...db[guildId][userId], ...newData };

    writeUserDb(db);
}


module.exports = {
    readUserDb,
    writeUserDb, // Exposed for reset script
    getUserProfile,
    createUserProfile,
    updateUserProfile,
};