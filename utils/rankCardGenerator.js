const Canvas = require('@napi-rs/canvas');

// Utility function to shorten text
function shorten(text, len) {
    if (typeof text !== 'string') return '';
    if (text.length <= len) return text;
    return text.substr(0, len).trim() + '...';
}

// Utility function to format numbers (e.g., 1000 -> 1k)
function toAbbrev(num) {
    if (!num || isNaN(num)) return '0';
    if (typeof num === 'string') num = parseInt(num);
    const dec = [
        { v: 1E12, s: 'T' },
        { v: 1E9, s: 'B' },
        { v: 1E6, s: 'M' },
        { v: 1E3, s: 'k' }
    ];
    for (let i = 0; i < dec.length; i++) {
        if (num >= dec[i].v) {
            return (num / dec[i].v).toFixed(1).replace(/\.0$/, '') + dec[i].s;
        }
    }
    return num.toString();
}

/**
 * Generates a rank card image.
 * @param {object} profileData - The user's profile data.
 * @returns {Promise<Buffer>} - A promise that resolves with the image buffer.
 */
Canvas.GlobalFonts.registerFromPath('assets/Inconsolata.tff', 'Inconsolata');

async function generateRankCard(profileData) {
    const {
        username,
        discriminator,
        level,
        rank,
        currentXp,
        requiredXp,
        avatarUrl,
        status
    } = profileData;

    const canvas = Canvas.createCanvas(934, 282);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#23272A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Overlay
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#333640';
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.globalAlpha = 1;

    // Username
    ctx.font = 'bold 40px Inconsolata';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'start';
    const name = shorten(username, 10);
    ctx.fillText(name, 275, 164);

    // Discriminator
    const discrimText = `#${discriminator}`;
    ctx.font = '40px Inconsolata';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(discrimText, ctx.measureText(name).width + 285, 164);

    // Level
    ctx.font = 'bold 40px Inconsolata';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'end';
    ctx.fillText(`LEVEL ${toAbbrev(level)}`, 914, 82);

    // Rank
    ctx.font = 'bold 40px Inconsolata';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'end';
    ctx.fillText(`RANK ${toAbbrev(rank)}`, 700, 82);

    // XP
    ctx.font = 'bold 30px Inconsolata';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'start';
    const requiredXpText = `/ ${toAbbrev(requiredXp)} XP`;
    const currentXpText = toAbbrev(currentXp);
    ctx.fillText(requiredXpText, 275 + ctx.measureText(currentXpText).width + 10, 215);
    ctx.fillText(currentXpText, 275, 215);

    // Progress Bar
    const progress = (currentXp / requiredXp) * 595;
    ctx.fillStyle = '#484B4E'; // Track
    ctx.fillRect(275, 175, 595, 30);
    ctx.fillStyle = '#FFFFFF'; // Bar
    ctx.fillRect(275, 175, progress, 30);

    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 141, 90, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    const avatar = await Canvas.loadImage(avatarUrl);
    ctx.drawImage(avatar, 60, 51, 180, 180);
    ctx.restore();

    // Status
    const statusColors = {
        online: '#43B581',
        idle: '#FAA61A',
        dnd: '#F04747',
        offline: '#747F8E'
    };
    ctx.beginPath();
    ctx.fillStyle = statusColors[status] || '#747F8E';
    ctx.arc(215, 205, 20, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();

    return canvas.encode('png');
}

module.exports = { generateRankCard };