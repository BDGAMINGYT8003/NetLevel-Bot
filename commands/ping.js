const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Checks the bot\'s latency.'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });

        const websocketLatency = interaction.client.ws.ping;
        const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;

        const pingContainer = new ContainerBuilder()
            .setAccentColor(0x57F287) // Green
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("🏓 **Pong!**"),
                new TextDisplayBuilder().setContent(`**API Latency:** ${apiLatency}ms`),
                new TextDisplayBuilder().setContent(`**Websocket Latency:** ${websocketLatency}ms`)
            );

        await interaction.editReply({ content: null, components: [pingContainer], flags: [MessageFlags.IsComponentsV2] });
    },
};