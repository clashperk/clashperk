import 'reflect-metadata';
import { inspect } from 'util';
import { Routes, RouteBases, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import fetch from 'node-fetch';
import { BETA_COMMANDS, COMMANDS, PRIVATE_COMMANDS } from './Commands.js';

const getClientId = (token: string) => Buffer.from(token.split('.')[0], 'base64').toString();
const guildId = process.env.GUILD_ID ?? '509784317598105619';

console.log(new Date().toISOString());

const applicationGuildCommands = async (token: string, commands: typeof COMMANDS) => {
	console.log('Building Guild Application Commands');
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

const betaCommands = async (token: string, commands: RESTPostAPIApplicationCommandsJSONBody[]) => {
	const res = await fetch(`${RouteBases.api}${Routes.applicationGuildCommands(getClientId(token), guildId)}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))));
	console.log(`Updated ${commands.length} Guild Application Commands`);
};

const applicationCommands = async (token: string, commands: typeof COMMANDS) => {
	console.log('Building Application Commands', getClientId(token));
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

	if (process.argv.includes('--beta')) {
		return betaCommands(token, BETA_COMMANDS);
	}

	if (process.argv.includes('--delete')) {
		return applicationGuildCommands(token, []);
	}

	return applicationCommands(token, [...COMMANDS, ...BETA_COMMANDS, ...PRIVATE_COMMANDS]);
})();
