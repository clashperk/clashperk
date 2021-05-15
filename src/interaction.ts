import Env from 'dotenv';
Env.config();

import fetch from 'node-fetch';
import { ApplicationCommandOptionType, APIApplicationCommandOption } from 'discord-api-types/v8';

export const commands: { name: string; description: string; options?: APIApplicationCommandOption[] }[] = [
	{
		name: 'clan',
		description: 'Clan summary and basic details',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: ApplicationCommandOptionType.STRING,
				required: false
			}
		]
	},
	{
		name: 'lastseen',
		description: 'Last seen and activities of clan members',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			}
		]
	},
	{
		name: 'attacks',
		description: 'Clan attacks and defenses for all members',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			},
			{
				name: 'sort',
				description: 'Sort by defenses?',
				type: 5,
				required: false
			}
		]
	},
	{
		name: 'members',
		description: 'Clan members with some basic details',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			}
		]
	},
	{
		name: 'units',
		description: 'Player unit, spell and hero levels',
		options: [
			{
				name: 'tag',
				description: 'Tag of the player account',
				required: false,
				type: 3
			},
			{
				name: 'base',
				description: 'Index of the player account (e.g. 2, 3)',
				required: false,
				type: ApplicationCommandOptionType.INTEGER
			}
		]
	},
	{
		name: 'player',
		description: 'Player summary and some basic details',
		options: [
			{
				name: 'tag',
				description: 'Tag of the player account',
				required: false,
				type: 3
			},
			{
				name: 'base',
				description: 'Index of the player account (e.g. 2, 3)',
				required: false,
				type: ApplicationCommandOptionType.INTEGER
			}
		]
	},
	{
		name: 'roster',
		description: 'CWL Roster and Town Hall distribution',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			}
		]
	},
	{
		name: 'round',
		description: 'CWL summary for the current round',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			},
			{
				name: 'round',
				description: 'Optional round',
				type: 4,
				required: false
			}
		]
	},
	{
		name: 'donations',
		description: 'Clan member\'s donations and receives',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			},
			{
				name: 'sort',
				description: 'Sort by donations received?',
				type: 5,
				required: false
			},
			{
				name: 'season',
				description: 'Season ID (Format: YYYY-MM)',
				type: 3,
				required: false
			}
		]
	},
	{
		name: 'compo',
		description: 'Town Hall compositions',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			}
		]
	},
	{
		name: 'upgrade',
		description: 'Remaining upgrades of troops, spells and heroes',
		options: [
			{
				name: 'tag',
				description: 'Tag of the player account',
				type: ApplicationCommandOptionType.STRING,
				required: false
			},
			{
				name: 'base',
				description: 'Index of the player account (e.g. 2, 3)',
				required: false,
				type: ApplicationCommandOptionType.INTEGER
			}
		]
	},
	{
		name: 'rushed',
		description: 'Rushed troops, spells, and heroes',
		options: [
			{
				name: 'tag',
				description: 'Tag of the player account',
				type: ApplicationCommandOptionType.STRING,
				required: false
			},
			{
				name: 'base',
				description: 'Index of the player account (e.g. 2, 3)',
				required: false,
				type: ApplicationCommandOptionType.INTEGER
			},
			{
				name: 'clan',
				description: 'For all clan members?',
				type: ApplicationCommandOptionType.BOOLEAN
			}
		]
	},
	{
		name: 'profile',
		description: 'Info about linked accounts',
		options: [
			{
				name: 'user',
				description: 'The user',
				type: ApplicationCommandOptionType.USER,
				required: false
			}
		]
	},
	{
		name: 'war',
		description: 'Current or previous clan war details',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			},
			{
				name: 'war-id',
				description: 'Search by War ID',
				type: ApplicationCommandOptionType.STRING,
				required: false
			}
		]
	},
	{
		name: 'remaining',
		description: 'Remaining or missed clan wars attacks',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: 3,
				required: false
			},
			{
				name: 'war-id',
				description: 'Search by War ID',
				type: ApplicationCommandOptionType.STRING,
				required: false
			}
		]
	},
	{
		name: 'link',
		description: 'Links a clan or player account',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan or player account',
				required: true,
				type: ApplicationCommandOptionType.STRING
			},
			{
				name: 'user',
				description: 'Optional user',
				type: ApplicationCommandOptionType.USER
			},
			{
				name: 'default',
				description: 'Set this default account?',
				type: ApplicationCommandOptionType.BOOLEAN
			}
		]
	},
	{
		name: 'unlink',
		description: 'Unlinks a clan or player account',
		options: [
			{
				name: 'tag',
				description: 'Tag of the player or clan',
				required: true,
				type: ApplicationCommandOptionType.STRING
			}
			/* {
				name: 'user',
				description: 'Optional user (Only works if you\'re a verified Co/Leader of the clan)',
				required: false,
				type: ApplicationCommandOptionType.USER
			}*/
		]
	},
	{
		name: 'flag',
		description: 'Manage player flags in a server or clan',
		options: [
			{
				name: 'add',
				description: 'Flag a player account',
				type: ApplicationCommandOptionType.SUB_COMMAND,
				options: [
					{
						name: 'tag',
						description: 'Tag of the player account',
						required: true,
						type: ApplicationCommandOptionType.STRING
					},
					{
						name: 'reason',
						description: 'Reason of this flag',
						required: true,
						type: ApplicationCommandOptionType.STRING
					}
				]
			},
			{
				name: 'remove',
				description: 'Remove a flag from exisiting player account',
				type: ApplicationCommandOptionType.SUB_COMMAND,
				options: [
					{
						name: 'tag',
						description: 'Tag of the player account',
						type: ApplicationCommandOptionType.STRING,
						required: true
					}
				]
			},
			{
				name: 'show',
				description: 'Show the flag for a player account',
				type: ApplicationCommandOptionType.SUB_COMMAND,
				options: [
					{
						name: 'tag',
						description: 'Tag of the player account',
						required: true,
						type: ApplicationCommandOptionType.STRING
					}
				]
			},
			{
				name: 'list',
				description: 'Get all alags for the server or clan',
				type: ApplicationCommandOptionType.SUB_COMMAND,
				options: [
					{
						name: 'export',
						description: 'Export to Excel file?',
						type: ApplicationCommandOptionType.BOOLEAN
					}
				]
			}
		]
	},
	{
		name: 'setup',
		description: 'Enable features or assign clans to channels.',
		options: [
			{
				name: 'option',
				description: 'Select an option',
				type: ApplicationCommandOptionType.STRING,
				choices: [
					{
						name: 'Channel Link',
						value: 'link_channel'
					},
					{
						name: 'Last Seen',
						value: 'lastseen'
					},
					{
						name: 'Clan Feed',
						value: 'feed'
					},
					{
						name: 'War Feed',
						value: 'war'
					},
					{
						name: 'Clan Games',
						value: 'games'
					},
					{
						name: 'Clan Embed',
						value: 'embed'
					},
					{
						name: 'Donation Log',
						value: 'donation'
					}
				]
			},
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: ApplicationCommandOptionType.STRING
			},
			{
				name: 'channel',
				description: 'Channel for the specified feature',
				type: ApplicationCommandOptionType.CHANNEL
			},
			{
				name: 'role',
				description: 'Role for Clan Feed',
				type: ApplicationCommandOptionType.ROLE
			},
			{
				name: 'color',
				description: 'Hex color (Patron Only)',
				type: ApplicationCommandOptionType.STRING
			}
		]
	},
	{
		name: 'remove',
		description: 'Disable features or remove clans from channels.',
		options: [
			{
				name: 'option',
				description: 'Select an option',
				type: ApplicationCommandOptionType.STRING,
				choices: [
					{
						name: 'Channel Link',
						value: 'remove_channel'
					},
					{
						name: 'Last Seen',
						value: 'lastseen'
					},
					{
						name: 'Clan Feed',
						value: 'feed'
					},
					{
						name: 'War Feed',
						value: 'war'
					},
					{
						name: 'Clan Games',
						value: 'games'
					},
					{
						name: 'Clan Embed',
						value: 'embed'
					},
					{
						name: 'Donation Log',
						value: 'donation'
					},
					{
						name: 'Remove All',
						value: 'all'
					}
				]
			},
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: ApplicationCommandOptionType.STRING
			},
			{
				name: 'channel',
				description: 'Channel to be removed',
				type: ApplicationCommandOptionType.CHANNEL
			}
		]
	},
	{
		name: 'invite',
		description: 'Get support server and bot invite link'
	},
	{
		name: 'help',
		description: 'Get all commands or info about a command',
		options: [
			{
				name: 'command',
				description: 'Name of the command',
				type: ApplicationCommandOptionType.STRING
			}
		]
	},
	{
		name: 'cwl',
		description: 'CWL season overview and summary',
		options: [
			{
				name: 'option',
				description: 'Select an option',
				type: ApplicationCommandOptionType.STRING,
				required: true,
				choices: [
					{
						name: 'CWL Roster',
						value: 'roster'
					},
					{
						name: 'CWL Round',
						value: 'round'
					},
					{
						name: 'CWL Lineup',
						value: 'lineup'
					},
					{
						name: 'CWL Stars',
						value: 'stars'
					},
					{
						name: 'CWL Gained',
						value: 'gained'
					},
					{
						name: 'CWL Stats',
						value: 'stats'
					},
					{
						name: 'CWL Missed',
						value: 'missed'
					},
					{
						name: 'CWL Missing',
						value: 'remaining'
					},
					{
						name: 'CWL Ranks',
						value: 'ranks'
					},
					{
						name: 'CWL Export',
						value: 'export'
					}
				]
			},
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: ApplicationCommandOptionType.STRING
			}
		]
	},
	{
		name: 'export',
		description: 'Export war/season/clan stats to Excel',
		options: [
			{
				name: 'option',
				required: true,
				description: 'Select an option',
				type: ApplicationCommandOptionType.STRING,
				choices: [
					{
						name: 'Missed Wars',
						value: 'missed'
					},
					{
						name: 'War Stats',
						value: 'wars'
					},
					{
						name: 'Season Stats',
						value: 'season'
					},
					{
						name: 'Clan Stats',
						value: 'clans'
					},
					{
						name: 'Clan Members',
						value: 'members'
					}
				]
			},
			{
				name: 'number',
				description: 'Number of wars',
				type: ApplicationCommandOptionType.INTEGER
			},
			{
				name: 'season',
				description: 'Season ID (Format: YYYY-MM)',
				type: ApplicationCommandOptionType.STRING
			}
		]
	},
	{
		name: 'summary',
		description: 'Summary of wars/clans/clan games for all clans',
		options: [
			{
				name: 'option',
				required: true,
				type: ApplicationCommandOptionType.STRING,
				description: 'Select an option',
				choices: [
					{
						name: 'War Summary',
						value: 'wars'
					},
					{
						name: 'Clan Games',
						value: 'games'
					},
					{
						name: 'Clan Summary',
						value: 'clans'
					},
					{
						name: 'Top Donations',
						value: 'donations'
					}
				]
			},
			{
				name: 'season',
				required: false,
				type: ApplicationCommandOptionType.STRING,
				description: 'Season ID for Clan Summary'
			}
		]
	},
	{
		name: 'warlog',
		description: 'Shows last 10 clan war logs with War ID',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: ApplicationCommandOptionType.STRING
			}
		]
	},
	{
		name: 'verify',
		description: 'Verify and link a player using API token',
		options: [
			{
				name: 'tag',
				required: true,
				description: 'Tag of the player account',
				type: ApplicationCommandOptionType.STRING
			},
			{
				name: 'token',
				required: true,
				description: 'API token for the player account',
				type: ApplicationCommandOptionType.STRING
			}
		]
	},
	{
		name: 'activity',
		description: 'Shows clan activity graph',
		options: [
			{
				name: 'clans',
				required: false,
				description: 'Clan Tags or Aliases (Maximum 3)',
				type: ApplicationCommandOptionType.STRING
			},
			{
				name: 'days',
				required: false,
				description: 'Expand',
				type: ApplicationCommandOptionType.INTEGER,
				choices: [
					{
						name: '1', value: 1
					},
					{
						name: '3', value: 3
					},
					{
						name: '7', value: 7
					}
				]
			}
		]
	},
	{
		name: 'alias',
		description: 'Create, Remove or View clan aliases',
		options: [
			{
				name: 'add',
				description: 'Create an alias for a clan',
				type: ApplicationCommandOptionType.SUB_COMMAND,
				options: [
					{
						name: 'name',
						required: true,
						description: 'Name of the alias',
						type: ApplicationCommandOptionType.STRING
					},
					{
						name: 'tag',
						description: 'Tag of the clan',
						required: true,
						type: ApplicationCommandOptionType.STRING
					}
				]
			},
			{
				name: 'list',
				description: 'Get aliases for all clans',
				type: ApplicationCommandOptionType.SUB_COMMAND
			},
			{
				name: 'remove',
				description: 'Remove an alias for a clan',
				type: ApplicationCommandOptionType.SUB_COMMAND,
				options: [
					{
						name: 'name',
						description: 'Tag of the clan or name of the alias',
						required: true,
						type: ApplicationCommandOptionType.STRING
					}
				]
			}
		]
	},
	{
		name: 'debug',
		description: 'Shows some basic debug informations.'
	},
	/* {
		name: 'autorole',
		description: 'Automatic Role management for clan members',
		options: [
			{
				name: 'co-leads',
				required: false,
				description: 'Co-Leader Role',
				type: ApplicationCommandOptionType.ROLE
			},
			{
				name: 'elders',
				required: false,
				description: 'Elder Role',
				type: ApplicationCommandOptionType.ROLE
			},
			{
				name: 'members',
				required: false,
				description: 'Member Role',
				type: ApplicationCommandOptionType.ROLE
			},
			{
				name: 'secure',
				required: false,
				description: 'Player API Token verification will be required. Roles will be given to verified players only.',
				type: ApplicationCommandOptionType.BOOLEAN
			}
		]
	}*/
	{
		name: 'boosts',
		description: 'Clan members with active Super Troops',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: ApplicationCommandOptionType.STRING,
				required: false
			}
		]
	},
	{
		name: 'lineup',
		description: 'Shows current war lineup details',
		options: [
			{
				name: 'tag',
				description: 'Tag of the clan',
				type: ApplicationCommandOptionType.STRING,
				required: false
			}
		]
	}
];

(async () => {
	const res = await fetch('https://discord.com/api/v8/applications/635462521729581058/guilds/509784317598105619/commands', {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${process.env.TOKEN!}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	const body = await res.json();
	console.log(res.status, JSON.stringify(body));
})();

(async () => {
	const res = await fetch('https://discord.com/api/v8/applications/526971716711350273/commands', {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${process.env.TOKEN_MAIN!}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	const body = await res.json();
	console.log(res.status, JSON.stringify(body));
});
