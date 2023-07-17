import 'reflect-metadata';
import { inspect } from 'util';
import { Routes, RouteBases, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import fetch from 'node-fetch';
import { ALPHA_COMMANDS, BETA_COMMANDS, COMMANDS, PRIVATE_COMMANDS } from './Commands.js';

const getClientId = (token: string) => Buffer.from(token.split('.')[0], 'base64').toString();

const masterGuilds = ['609250675431309313', '1016659402817814620', '509784317598105619'];

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
		return applicationCommands(token, [...COMMANDS, ...ALPHA_COMMANDS]);
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
			const commands = masterGuilds.includes(guildId)
				? [...BETA_COMMANDS, ...ALPHA_COMMANDS, ...PRIVATE_COMMANDS]
				: [...BETA_COMMANDS];
			await applicationGuildCommands(process.env.PROD_TOKEN!, guildId, commands);
		}
		return;
	}

	return applicationCommands(token, [...COMMANDS, ...BETA_COMMANDS, ...ALPHA_COMMANDS, ...PRIVATE_COMMANDS]);
	// return applicationCommands(token, []);
})();
