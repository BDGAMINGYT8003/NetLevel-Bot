const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getUser, updateUser } = require('../utils/database');
const { marketItems } = require('../config');
const crypto = require('crypto');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Access the Apex Market to purchase items with CI Tokens.'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const user = getUser(guildId, userId);

        if (!user) {
            // This should technically be caught by the onboarding check, but as a fallback:
            await interaction.reply({ content: 'You must be onboarded to use the market. Please try another command first.', ephemeral: true });
            return;
        }

        // --- Build the Market Interface ---
        let marketDescription = '**Welcome to the Apex Market!**\n*All items and currency reset monthly.*\n\n';
        const selectOptions = [];

        for (const item of marketItems) {
            const userStock = user.marketStock[item.id] ?? item.stock;
            const stockDisplay = userStock === Infinity ? 'Unlimited' : userStock;
            const canAfford = user.ciTokens >= item.cost;
            const isAvailable = userStock > 0 && user.level >= item.levelReq;

            marketDescription += `**${item.name}**\n`;
            marketDescription += `> Cost: ${item.cost} CI Tokens | Your Stock: ${stockDisplay} | Level Req: ${item.levelReq}\n`;

            if (isAvailable) {
                selectOptions.push({
                    label: item.name,
                    description: `Cost: ${item.cost} CI | Your Stock: ${stockDisplay}`,
                    value: item.id,
                });
            }
        }

        const marketContainer = new ContainerBuilder()
            .setAccentColor(0xDA70D6) // Orchid color
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(marketDescription)
            );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('market_select_item')
            .setPlaceholder('Select an item to purchase...')
            .addOptions(selectOptions.slice(0, 25)); // Max 25 options per select menu

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            components: [marketContainer, row],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true,
        });

        // --- Collector for Interactions ---
        const filter = i => i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async i => {
            // --- Handle Item Selection ---
            if (i.isStringSelectMenu() && i.customId === 'market_select_item') {
                const selectedItemId = i.values[0];
                const selectedItem = marketItems.find(item => item.id === selectedItemId);

                const quantityModal = new ModalBuilder()
                    .setCustomId(`market_quantity_modal_${selectedItemId}`)
                    .setTitle(`Purchase: ${selectedItem.name}`);

                const quantityInput = new TextInputBuilder()
                    .setCustomId('quantity')
                    .setLabel("How many would you like to buy?")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter a number')
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(quantityInput);
                quantityModal.addComponents(firstActionRow);

                await i.showModal(quantityModal);
            }

            // --- Handle Confirmation Buttons ---
            if (i.isButton() && i.customId.startsWith('market_confirm_')) {
                await i.deferUpdate();
                const [_, __, itemId, quantityStr] = i.customId.split('_');
                const quantity = parseInt(quantityStr, 10);
                const item = marketItems.find(it => it.id === itemId);
                const currentUserData = getUser(guildId, userId); // Re-fetch latest data
                const totalCost = item.cost * quantity;

                // Final validation before processing
                if (currentUserData.ciTokens < totalCost) {
                    await i.editReply({ content: 'Your CI balance is too low.', components: [], flags: MessageFlags.None });
                    return collector.stop();
                }
                if (currentUserData.marketStock[itemId] < quantity) {
                    await i.editReply({ content: 'You are trying to buy more than you have stock for.', components: [], flags: MessageFlags.None });
                    return collector.stop();
                }

                // --- Process Purchase ---
                currentUserData.ciTokens -= totalCost;
                if (item.stock !== Infinity) {
                    currentUserData.marketStock[itemId] -= quantity;
                }
                updateUser(guildId, userId, currentUserData);

                // Generate reward code
                const rewardCode = `APEX-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

                const successMessage = `**Purchase Successful!**\n\nHere is your redeemable code for **${quantity}x ${item.name}**:\n\`\`\`${rewardCode}\`\`\`\n\nThis code has also been sent to your DMs for safekeeping.`;

                // Send DM
                try {
                    await i.user.send(successMessage + `\n*(This code was generated from the ${i.guild.name} server)*`);
                } catch (dmError) {
                    console.warn(`Could not DM user ${userId}`);
                }

                // Send ephemeral confirmation in channel
                const finalContainer = new ContainerBuilder().setAccentColor(0x57F287).addTextDisplayComponents(new TextDisplayBuilder().setContent(successMessage));
                await i.editReply({ components: [finalContainer], flags: MessageFlags.IsComponentsV2 });
                collector.stop();
            }

            if (i.isButton() && i.customId === 'market_cancel') {
                await i.update({ content: 'Purchase cancelled.', components: [], flags: MessageFlags.None });
                collector.stop();
            }
        });

        // --- Collector for Modal Submission ---
        const modalCollector = interaction.createModalSubmitCollector({ filter, time: 120000 });
        modalCollector.on('collect', async modalInteraction => {
            const itemId = modalInteraction.customId.replace('market_quantity_modal_', '');
            const item = marketItems.find(it => it.id === itemId);
            const quantity = parseInt(modalInteraction.fields.getTextInputValue('quantity'), 10);

            // Validation
            if (isNaN(quantity) || quantity <= 0) {
                await modalInteraction.reply({ content: 'Please enter a valid, positive number.', ephemeral: true });
                return;
            }

            const currentUserData = getUser(guildId, userId); // Re-fetch latest data
            const totalCost = item.cost * quantity;

            if (currentUserData.ciTokens < totalCost) {
                await modalInteraction.reply({ content: `You cannot afford this. You have ${currentUserData.ciTokens.toFixed(1)} CI, but this purchase costs ${totalCost}.`, ephemeral: true });
                return;
            }
            if (item.stock !== Infinity && currentUserData.marketStock[itemId] < quantity) {
                await modalInteraction.reply({ content: `You don't have enough stock. You have ${currentUserData.marketStock[itemId]}, but you are trying to buy ${quantity}.`, ephemeral: true });
                return;
            }

            // --- Show Confirmation Buttons ---
            const confirmationText = `Are you sure you want to purchase **${quantity}x ${item.name}** for a total of **${totalCost} CI Tokens**?`;

            const confirmButton = new ButtonBuilder()
                .setCustomId(`market_confirm_purchase_${item.id}_${quantity}`)
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId('market_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger);

            const confirmationRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
            const confirmationContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(confirmationText));

            await modalInteraction.reply({
                components: [confirmationContainer, confirmationRow],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true,
            });
            modalCollector.stop();
        });
    },
};