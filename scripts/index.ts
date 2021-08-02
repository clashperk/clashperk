import env from 'dotenv';
env.config();

import { Routes, RouteBases } from 'discord-api-types/v9';
import { commands } from './commands';
import fetch from 'node-fetch';

const applicationGuildCommands = async () => {
	console.log('Building Guild Application Commands');
	await fetch(
		`${RouteBases.api}${Routes.applicationGuildCommands('635462521729581058', '509784317598105619')}`,
		{
			method: 'PUT',
			headers: {
				'Authorization': `Bot ${process.env.TOKEN!}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(commands)
		}
	).then(res => res.json()).then(console.log);
};

const applicationCommands = async () => {
	console.log('Building Application Commands');
	await fetch(
		`${RouteBases.api}${Routes.applicationCommands('526971716711350273')}`,
		{
			method: 'PUT',
			headers: {
				'Authorization': `Bot ${process.env.BOT_TOKEN!}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(commands)
		}
	).then(res => res.json()).then(console.log);
};

async function init() {
	if (process.argv.includes('--gh-action')) {
		return applicationCommands();
	}

	// await applicationCommands();
	await applicationGuildCommands();
}

init();
