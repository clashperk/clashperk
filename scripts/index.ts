import env from 'dotenv';
env.config();

import { Routes, RouteBases } from 'discord-api-types/v9';
import { commands } from './commands';
import fetch from 'node-fetch';

const applicationGuildCommands = async () => {
	console.log('Building Guild Application Commands');
	const res = await fetch(
		`${RouteBases.api}${Routes.applicationGuildCommands('635462521729581058', '609250675431309313')}`,
		{
			method: 'PUT',
			headers: {
				'Authorization': `Bot ${process.env.TOKEN!}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(commands)
		}
	);
	await res.json().then(data => res.ok ? console.log(JSON.stringify(data)) : console.log(data));
	console.log(`Updated ${commands.length} Guild Application Commands`);
};

const applicationCommands = async () => {
	console.log('Building Application Commands');
	const res = await fetch(
		`${RouteBases.api}${Routes.applicationCommands('526971716711350273')}`,
		{
			method: 'PUT',
			headers: {
				'Authorization': `Bot ${process.env.BOT_TOKEN!}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(commands)
		}
	);
	await res.json().then(data => res.ok ? console.log(JSON.stringify(data)) : console.log(data));
	console.log(`Updated ${commands.length} Application Commands`);
};

async function init() {
	if (process.argv.includes('--gh-action')) {
		return applicationCommands();
	}

	// await applicationCommands();
	await applicationGuildCommands();
}

init();
