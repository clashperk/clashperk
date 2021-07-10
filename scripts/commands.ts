import Env from 'dotenv';
Env.config();

import fetch from 'node-fetch';
import moment from 'moment';
import { ApplicationCommandOptionType, APIApplicationCommandOption } from 'discord-api-types/v8';

export function getSeasonIds() {
	return Array(12).fill(0).map((_, month) => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		now.setFullYear(now.getFullYear(), 1);
		now.setMonth(now.getMonth() + month, 0);
		return { name: moment(now).format('MMM YYYY'), value: moment(now).format('YYYY-MM') };
	});
}

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
		name: 'points',
		description: 'Clan Games points of all clan members',
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
			},
			{
				name: 'with',
				description: 'Selecet an option',
				type: 3,
				required: false,
				choices: [
					{
						name: 'Player Tags',
						value: 'tags'
					},
					{
						name: 'Trophies',
						value: 'trophies'
					},
					{
						name: 'Clan Roles',
						value: 'roles'
					},
					{
						name: 'Discord ID',
						value: 'discord'
					}
				]
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
				description: 'Sort by receives or donations',
				type: ApplicationCommandOptionType.STRING,
				required: false,
				choices: [
					{
						name: 'Received',
						value: 'true'
					},
					{
						name: 'Donated',
						value: 'false'
					}
				]
			},
			{
				name: 'season',
				description: 'Season ID (Format: YYYY-MM)',
				type: 3,
				required: false,
				choices: getSeasonIds()
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
				description: 'Display all clan members',
				type: ApplicationCommandOptionType.STRING,
				choices: [
					{
						name: 'Yes',
						value: 'true'
					},
					{
						name: 'No',
						value: 'false'
					}
				]

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
				description: 'Set it default account',
				type: ApplicationCommandOptionType.STRING,
				choices: [
					{
						name: 'Yes',
						value: 'true'
					},
					{
						name: 'No',
						value: 'false'
					}
				]
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
			},
			{
				name: 'user',
				description: 'Optional user (Only valid for a player tag)',
				required: false,
				type: ApplicationCommandOptionType.USER
			}
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
						type: ApplicationCommandOptionType.STRING,
						choices: [
							{
								name: 'Yes',
								value: 'true'
							},
							{
								name: 'No',
								value: 'false'
							}
						]
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
				name: 'extra',
				description: 'Role for clan feed or Hex color code.',
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
						name: 'CWL Stats',
						value: 'stats'
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
						name: 'Season Stats',
						value: 'season'
					},
					{
						name: 'War Stats',
						value: 'wars'
					},
					{
						name: 'Last War Dates',
						value: 'lastwars'
					},
					{
						name: 'Clan Members',
						value: 'members'
					},
					{
						name: 'Missed Wars',
						value: 'missed'
					}
				]
			},
			{
				name: 'season',
				description: 'Season ID for ',
				type: ApplicationCommandOptionType.STRING,
				choices: getSeasonIds()
			},
			{
				name: 'tag',
				description: 'Clan tags or aliases to filter clans',
				type: ApplicationCommandOptionType.STRING
			},
			{
				name: 'wars',
				description: 'Number of wars (Default: 25)',
				type: ApplicationCommandOptionType.INTEGER
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
				description: 'Season ID for Clan Summary',
				choices: getSeasonIds()
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
	{
		name: 'autorole',
		description: 'Auto assign roles to members based upon their role in the clan.',
		options: [
			{
				name: 'co-leads',
				required: true,
				description: 'Co-Leader Role',
				type: ApplicationCommandOptionType.ROLE
			},
			{
				name: 'elders',
				required: true,
				description: 'Elder Role',
				type: ApplicationCommandOptionType.ROLE
			},
			{
				name: 'members',
				required: true,
				description: 'Member Role',
				type: ApplicationCommandOptionType.ROLE
			},
			{
				name: 'tag',
				required: false,
				description: 'Tag of the clan. Do not pass the tag if you want same type roles for all clans.',
				type: ApplicationCommandOptionType.STRING
			},
			{
				name: 'verify',
				required: false,
				description: 'Roles will be given to verified players only.',
				type: ApplicationCommandOptionType.STRING,
				choices: [
					{
						name: 'Yes',
						value: 'true'
					},
					{
						name: 'No',
						value: 'false'
					}
				]
			}
		]
	},
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
			'Authorization': `Bot ${process.env.BOT_TOKEN!}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	const body = await res.json();
	console.log(res.status, JSON.stringify(body));
});
