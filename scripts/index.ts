import 'reflect-metadata';
import { inspect } from 'util';
import { Routes, RouteBases, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import fetch from 'node-fetch';
import { BETA_COMMANDS, COMMANDS, PRIVATE_COMMANDS } from './Commands.js';

const getClientId = (token: string) => Buffer.from(token.split('.')[0], 'base64').toString();

console.log(new Date().toISOString());

const applicationGuildCommands = async (token: string, guildId: string, commands: RESTPostAPIApplicationCommandsJSONBody[]) => {
	console.log(`Building guild application commands for ${guildId}`);
	const res = await fetch(`${RouteBases.api}${Routes.applicationGuildCommands(getClientId(token), guildId)}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))));
	console.log(`Updated ${COMMANDS.length} Guild Application Commands`);
};

const applicationCommands = async (token: string, commands: typeof COMMANDS) => {
	console.log('Building global application commands', getClientId(token));
	const res = await fetch(`${RouteBases.api}${Routes.applicationCommands(getClientId(token))}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))));
	console.log(`Updated ${commands.length} Application Commands`);
};

(async () => {
	const token = process.env.BOT_TOKEN!;
	if (process.argv.includes('--gh-action')) {
		return applicationCommands(token, COMMANDS);
	}

	if (process.argv.includes('--delete')) {
		const guilds = process.env.GUILD_IDS!.split(',');
		for (const guildId of guilds) {
			await applicationGuildCommands(process.env.PROD_TOKEN!, guildId, []);
		}
		return;
	}

	if (process.argv.includes('--beta')) {
		const guilds = process.env.GUILD_IDS!.split(',');
		for (const guildId of new Set(guilds)) {
			await applicationGuildCommands(process.env.PROD_TOKEN!, guildId, BETA_COMMANDS);
		}
		return;
	}

	return applicationCommands(token, [...COMMANDS, ...BETA_COMMANDS, ...PRIVATE_COMMANDS]);
})();
