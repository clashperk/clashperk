import 'reflect-metadata';
import { inspect } from 'util';
import { Routes, RouteBases } from 'discord-api-types/v10';
import fetch from 'node-fetch';
import { COMMANDS, PRIVATE_COMMANDS } from './Commands.js';

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

const commandPermission = async (token: string) => {
	const res = await fetch(`${RouteBases.api}${Routes.applicationGuildCommands(getClientId(token), guildId)}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(PRIVATE_COMMANDS)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))));
	console.log(`Updated ${PRIVATE_COMMANDS.length} Guild Application Commands`);
};

const applicationCommands = async (token: string) => {
	console.log('Building Application Commands', getClientId(token));
	const res = await fetch(`${RouteBases.api}${Routes.applicationCommands(getClientId(token))}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(COMMANDS)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(data)));
	console.log(`Updated ${COMMANDS.length} Application Commands`);
};

async function init() {
	const token = process.env.BOT_TOKEN!;
	if (process.argv.includes('--gh-action')) {
		return applicationCommands(token);
	}

	if (process.argv.includes('--private')) {
		return commandPermission(token);
	}

	if (process.argv.includes('--delete')) {
		return applicationGuildCommands(token, []);
	}

	await applicationGuildCommands(process.env.TOKEN!, [...COMMANDS, ...PRIVATE_COMMANDS]);
}

init();
