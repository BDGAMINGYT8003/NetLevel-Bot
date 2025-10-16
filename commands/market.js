const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getUserProfile, updateUserProfile } = require('../utils/database');
const { items } = require('../utils/marketItems');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');

// --- Main Command Execution ---
async function execute(interaction) {
    const userProfile = getUserProfile(interaction.guild.id, interaction.user.id);
    if (!userProfile) return; // Should be handled by onboarding, but as a safeguard.

    const { level, stock, ci_tokens } = userProfile;

    const availableItems = items.filter(item => level >= item.level_req);

    if (availableItems.length === 0) {
        const noItemsContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent("There are no items available for you at your current level."));
        return interaction.reply({ components: [noItemsContainer], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('market_select_item')
        .setPlaceholder('Select an item to purchase...')
        .addOptions(availableItems.map(item => ({
            label: item.name,
            description: `Cost: ${item.cost} CI | Stock: ${stock[item.id] || 'Unlimited'}`,
            value: item.id,
        })));

    const marketText = availableItems.map(item =>
        `**${item.name}**\n` +
        `> Cost: **${item.cost} CI** | Your Stock: **${stock[item.id] === 'Unlimited' ? '∞' : stock[item.id]}** | Level Req: ${item.level_req}`
    ).join('\n\n');

    const marketContainer = new ContainerBuilder()
        .setAccentColor(0xDAA520)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Apex Market | Your Balance: ${ci_tokens} CI Tokens 🪙`),
            new TextDisplayBuilder().setContent(marketText)
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ components: [marketContainer, row], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
}

// --- Component Interaction Handler ---
async function handleInteraction(interaction) {
    // 1. Select Menu Interaction -> Show Modal
    if (interaction.isStringSelectMenu()) {
        const selectedItemId = interaction.values[0];
        const item = items.find(i => i.id === selectedItemId);

        const modal = new ModalBuilder()
            .setCustomId(`market_modal_${selectedItemId}`)
            .setTitle(`Purchase: ${item.name}`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('quantity')
                        .setLabel("How many would you like to purchase?")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Enter a number')
                )
            );
        return await interaction.showModal(modal);
    }

    // 2. Modal Submission -> Show Confirmation Buttons
    if (interaction.isModalSubmit()) {
        const userProfile = getUserProfile(interaction.guild.id, interaction.user.id);
        const [_, itemId] = interaction.customId.split('_');

        await interaction.deferReply({ ephemeral: true });
        const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));
        const item = items.find(i => i.id === itemId);

        // Validation
        if (isNaN(quantity) || quantity <= 0) {
            return interaction.editReply({ content: 'Please enter a valid positive number.' });
        }
        if (userProfile.ci_tokens < item.cost * quantity) {
            return interaction.editReply({ content: `You do not have enough CI Tokens. Required: ${item.cost * quantity}. You have: ${userProfile.ci_tokens}.` });
        }
        if (userProfile.stock[itemId] !== 'Unlimited' && quantity > userProfile.stock[itemId]) {
            return interaction.editReply({ content: `You cannot purchase that many. You only have ${userProfile.stock[itemId]} left in your monthly stock.` });
        }

        const confirmButton = new ButtonBuilder().setCustomId(`market_confirm_${itemId}_${quantity}`).setLabel('Confirm').setStyle(ButtonStyle.Success);
        const cancelButton = new ButtonBuilder().setCustomId(`market_cancel`).setLabel('Cancel').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        return await interaction.editReply({
            content: `Are you sure you want to purchase **${quantity}x ${item.name}** for a total of **${item.cost * quantity} CI Tokens**?`,
            components: [row]
        });
    }

    // 3. Button Click -> Finalize Purchase or Cancel
    if (interaction.isButton()) {
        const [_, action, itemId, quantityStr] = interaction.customId.split('_');

        if (action === 'cancel') {
            return await interaction.update({ content: 'Purchase cancelled.', components: [] });
        }

        if (action === 'confirm') {
            await interaction.deferUpdate();

            const quantity = parseInt(quantityStr);
            const item = items.find(i => i.id === itemId);
            const freshProfile = getUserProfile(interaction.guild.id, interaction.user.id);

            // Final validation
            if (freshProfile.ci_tokens < item.cost * quantity || (freshProfile.stock[itemId] !== 'Unlimited' && quantity > freshProfile.stock[itemId])) {
                return interaction.editReply({ content: 'Your balance or stock has changed since starting this purchase. Please try again.', components: [] });
            }

            // Process transaction
            const newCiTokens = freshProfile.ci_tokens - (item.cost * quantity);
            const newStock = { ...freshProfile.stock };
            if (newStock[itemId] !== 'Unlimited') {
                newStock[itemId] -= quantity;
            }
            updateUserProfile(interaction.guild.id, interaction.user.id, { ci_tokens: newCiTokens, stock: newStock });

            const rewardCode = `APEXG-${uuidv4().toUpperCase()}`;
            try {
                await interaction.user.send(`Thank you for your purchase! Your reward code for **${quantity}x ${item.name}** is: \`\`\`${rewardCode}\`\`\``);
            } catch (error) {
                console.warn(chalk.yellow(`Could not DM user ${interaction.user.tag}.`));
            }

            return await interaction.editReply({ content: `Purchase successful! Your reward code is below. **Copy it now, it will disappear!**\n\`\`\`${rewardCode}\`\`\``, components: [] });
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder().setName('market').setDescription('Access the Apex Market to purchase items with CI Tokens.'),
    execute,
    handleInteraction,
};