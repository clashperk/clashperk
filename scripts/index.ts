import 'reflect-metadata';
import { inspect } from 'util';
import { Routes, RouteBases } from 'discord-api-types/v9';
import { request as fetch, Dispatcher } from 'undici';
import { ApplicationCommand } from 'discord.js';
import { COMMANDS, PRIVATE_COMMANDS } from './Commands.js';

const isOk = (res: Dispatcher.ResponseData) => res.statusCode >= 200 && res.statusCode < 300;
const getClientId = (token: string) => Buffer.from(token.split('.')[0], 'base64').toString();
const guildId = process.env.GUILD_ID ?? '509784317598105619';

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
	await res.body.json().then((data) => (isOk(res) ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))));
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
	const commands = (await res.body.json()) as ApplicationCommand[];
	console.log(commands);
	if (!isOk(res)) return;

	await fetch(`${RouteBases.api}${Routes.guildApplicationCommandsPermissions(getClientId(token), guildId)}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${token}`,
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
	}).then((data) => (isOk(res) ? console.log(JSON.stringify(data)) : console.log(data)));
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
	await res.body.json().then((data) => (isOk(res) ? console.log(JSON.stringify(data)) : console.log(data)));
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
