const fs = require('node:fs');
const path = require('node:path');
const { marketItems } = require('../config');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');

// --- Core Read/Write Functions ---

/**
 * Reads the entire database from the JSON file.
 * @returns {object} The parsed database object.
 */
function readDb() {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return an empty object
            return {};
        }
        console.error('Error reading database file:', error);
        return {};
    }
}

/**
 * Writes the entire database object to the JSON file.
 * @param {object} data The database object to write.
 */
function writeDb(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing to database file:', error);
    }
}

// --- User-specific Helpers ---

/**
 * Retrieves a user's data for a specific guild.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @returns {object | null} The user's data object or null if not found.
 */
function getUser(guildId, userId) {
    const db = readDb();
    if (db[guildId] && db[guildId].users && db[guildId].users[userId]) {
        return db[guildId].users[userId];
    }
    return null;
}

/**
 * Creates a new user profile in the database for a specific guild.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @returns {object} The newly created user data object.
 */
function createUser(guildId, userId) {
    const db = readDb();

    // Ensure the guild structure exists
    if (!db[guildId]) {
        db[guildId] = { users: {} };
    }
    if (!db[guildId].users) {
        db[guildId].users = {};
    }

    // Initialize default market stock
    const defaultStock = {};
    marketItems.forEach(item => {
        defaultStock[item.id] = item.stock;
    });

    const newUser = {
        id: userId,
        onboarded: true, // Mark as onboarded upon creation after tutorial
        level: 0,
        xp: 0,
        ciTokens: 0,
        ciTokensToday: 0,
        lastCiEarnDate: null,
        marketStock: defaultStock,
    };

    db[guildId].users[userId] = newUser;
    writeDb(db);
    return newUser;
}

/**
 * Updates a user's data for a specific guild.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @param {object} updatedData The partial or full user object to update.
 */
function updateUser(guildId, userId, updatedData) {
    const db = readDb();
    if (!db[guildId] || !db[guildId].users || !db[guildId].users[userId]) {
        console.error(`Attempted to update a non-existent user: ${userId} in guild ${guildId}`);
        return;
    }

    // Merge the existing data with the new data
    const user = db[guildId].users[userId];
    db[guildId].users[userId] = { ...user, ...updatedData };

    writeDb(db);
}

/**
 * Retrieves all user data for a specific guild.
 * @param {string} guildId The ID of the guild.
 * @returns {object | null} An object containing all users for the guild, or null.
 */
function getGuildUsers(guildId) {
    const db = readDb();
    if (db[guildId] && db[guildId].users) {
        return db[guildId].users;
    }
    return null;
}


module.exports = {
    readDb,
    writeDb,
    getUser,
    createUser,
    updateUser,
    getGuildUsers,
};