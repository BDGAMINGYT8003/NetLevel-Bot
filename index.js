const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const chalk = require('chalk');
const cron = require('node-cron');
const { checkAndOnboardUser } = require('./utils/onboarding');
const { performMonthlyReset } = require('./utils/reset');

// Securely retrieve secrets
const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
    console.error(chalk.red('Error: BOT_TOKEN and CLIENT_ID must be set in your environment secrets.'));
    process.exit(1);
}

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// --- Dynamic Command Handling ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(chalk.blue.bold('--- Apex Girls Bot ---'));
console.log(chalk.yellow('Attempting to load and register slash commands...'));

const slashCommands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            slashCommands.push(command.data.toJSON());
            console.log(chalk.green(`[SUCCESS] Loaded command: ${command.data.name}`));
        } else {
            console.log(chalk.yellow(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
        }
    } catch (error) {
        console.error(chalk.red(`[ERROR] Could not load command at ${filePath}:`), error);
    }
}

// --- Integrated Slash Command Deployment ---
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(chalk.cyan(`Started refreshing ${slashCommands.length} application (/) commands.`));

        // The put method is used to fully refresh all commands with the current set
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: slashCommands },
        );

        console.log(chalk.cyan.bold(`Successfully reloaded ${data.length} application (/) commands.`));
    } catch (error) {
        console.error(chalk.red('Error refreshing application commands:'), error);
    }
})();


// --- Dynamic Event Handling ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
    console.log(chalk.magenta(`[EVENT] Loaded event: ${event.name}`));
}

// The 'interactionCreate' event is now loaded from the events folder.
// However, the command execution logic is better kept here for clarity.
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) {
        // Component interactions (buttons, modals, select menus) will be handled
        // by collectors within the command files themselves.
        return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        // Check if user is onboarded. If not, the function handles the tutorial and returns false.
        const canProceed = await checkAndOnboardUser(interaction);

        if (canProceed) {
            await command.execute(interaction);
        }
        // If canProceed is false, the onboarding process has already handled the interaction reply.
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});


// --- Monthly Reset Scheduler ---
// '0 0 1 * *' = At 00:00 on day-of-month 1 (UTC).
cron.schedule('0 0 1 * *', () => {
    console.log(chalk.magenta.bold('--- Running Monthly Reset ---'));
    performMonthlyReset(client);
    console.log(chalk.magenta.bold('--- Monthly Reset Complete ---'));
}, {
    scheduled: true,
    timezone: "UTC"
});

// --- Client Ready ---
client.once('ready', () => {
    console.log(chalk.green.bold(`\nReady! Logged in as ${client.user.tag}`));
    console.log(chalk.blue.bold('Bot is online and operational.\n'));
});


// Log in to Discord with your client's token
client.login(token);