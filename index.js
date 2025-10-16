const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const chalk = require('chalk');
const cron = require('node-cron');

// --- Environment Variable Check ---
const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
    console.error(chalk.red('[FATAL ERROR] BOT_TOKEN and CLIENT_ID must be set in your environment\'s secrets.'));
    process.exit(1);
}

// --- Client Initialization ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(chalk.cyan.bold('--- Apex Girls Bot Initializing ---'));

// --- Dynamic Command Handler ---
console.log(chalk.yellow('-> Loading slash commands...'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            console.log(chalk.green(`  [SUCCESS] Loaded: /${command.data.name}`));
        } else {
            console.log(chalk.red(`  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
        }
    } catch (error) {
        console.error(chalk.red(`  [ERROR] Could not load command at ${filePath}:`), error);
    }
}
console.log(chalk.yellow('-> Finished loading commands.'));


// --- Dynamic Event Handler ---
console.log(chalk.yellow('-> Loading events...'));
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(chalk.green(`  [SUCCESS] Loaded event: ${event.name}`));
    } catch (error) {
        console.error(chalk.red(`  [ERROR] Could not load event at ${filePath}:`), error);
    }
}
console.log(chalk.yellow('-> Finished loading events.'));


// --- Integrated Slash Command Deployment ---
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(chalk.yellow(`-> Started refreshing ${commands.length} application (/) commands.`));

        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(chalk.green(`--> Successfully reloaded ${data.length} application (/) commands.`));
    } catch (error) {
        console.error(chalk.red(error));
    }
})();


const { performMonthlyReset } = require('./utils/monthlyReset');
const { performDailyReset } = require('./utils/dailyReset');

// --- Schedulers ---
// Monthly Reset
cron.schedule('0 0 1 * *', () => performMonthlyReset(client), { timezone: "UTC" });
// Daily CI Cap Reset
cron.schedule('0 0 * * *', () => performDailyReset(), { timezone: "UTC" });


// --- Bot Login ---
client.login(token).then(() => {
    console.log(chalk.cyan.bold('--- Bot is now online and connected to Discord! ---'));
}).catch(err => {
    console.error(chalk.red('[LOGIN ERROR]'), err);
});