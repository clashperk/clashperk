import env from 'dotenv';
env.config();

import { Routes, RouteBases } from 'discord-api-types/v9';
import { COMMANDS, PRIVATE_COMMANDS } from './Commands';
import fetch from 'node-fetch';
import { ApplicationCommand } from 'discord.js';
import { inspect } from 'util';

const applicationGuildCommands = async (commands: typeof COMMANDS) => {
	console.log('Building Guild Application Commands');
	const res = await fetch(`${RouteBases.api}${Routes.applicationGuildCommands('635462521729581058', '609250675431309313')}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${process.env.TOKEN!}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))));
	console.log(`Updated ${COMMANDS.length} Guild Application Commands`);
};

const commandPermission = async () => {
	const res = await fetch(`${RouteBases.api}${Routes.applicationGuildCommands('526971716711350273', '609250675431309313')}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${process.env.BOT_TOKEN!}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(PRIVATE_COMMANDS)
	});
	const commands = (await res.json()) as ApplicationCommand[];
	console.log(commands);
	if (!res.ok) return;

	await fetch(`${RouteBases.api}${Routes.guildApplicationCommandsPermissions('526971716711350273', '509784317598105619')}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${process.env.BOT_TOKEN!}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(
			commands.map((cmd) => ({
				id: cmd.id,
				permissions: [
					{
						id: '716298719720505448', // Bug Hunter
						permission: true,
						type: 1
					},
					{
						id: '616457953058226176', // Support
						permission: true,
						type: 1
					},
					{
						id: '444432489818357760', // Developer
						permission: true,
						type: 1
					}
				]
			}))
		)
	}).then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(data)));
};

const applicationCommands = async () => {
	console.log('Building Application Commands');
	const res = await fetch(`${RouteBases.api}${Routes.applicationCommands('526971716711350273')}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${process.env.BOT_TOKEN!}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(COMMANDS)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(data)));
	console.log(`Updated ${COMMANDS.length} Application Commands`);
};

async function init() {
	if (process.argv.includes('--gh-action')) {
		return applicationCommands();
	}

	if (process.argv.includes('--private')) {
		return commandPermission();
	}

	if (process.argv.includes('--delete')) {
		return applicationGuildCommands([]);
	}

	// await applicationCommands();
	await applicationGuildCommands(COMMANDS);
}

init();
