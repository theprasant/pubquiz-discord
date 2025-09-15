import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = process.env.DISCORD_BOT_TOKEN;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
	]
});

client.commands = new Collection();
client.cooldowns = new Collection();

const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

console.log(`Loading commands from: ${foldersPath}`);

for (const folder of commandFolders) {
	const commandsPath = join(foldersPath, folder);
	const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		// const filePath = join(commandsPath, file);
		// console.log(`Loading command file: ${filePath}`);
		const command = await import(`./commands/${folder}/${file}`);
		console.log(`Loaded command: ${command.data.name}`);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const event = await import(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
		console.log(`Registered one-time event: ${event.name}`);
	} else {
		client.on(event.name, (...args) => event.execute(...args));
		console.log(`Registered event: ${event.name}`);
	}
}

client.login(token).then(() => {
	console.log('Bot is logged in and ready!');
	// delete process.env.DISCORD_BOT_TOKEN;
}).catch(err => {
	console.error('Failed to log in:', err);
});

process.on('uncaughtException', (err) => {
	console.error('Global uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
	console.error('Global unhandled rejection:', err);
});