import { ApplicationCommandOptionType, APIApplicationCommandOption } from 'discord-api-types/v9';
import moment from 'moment';

export function getSeasonIds() {
	return Array(6).fill(0).map((_, month) => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		now.setFullYear(now.getFullYear(), 1 + 3);
		now.setMonth(now.getMonth() + month, 0);
		return { name: moment(now).format('MMM YYYY'), value: moment(now).format('YYYY-MM') };
	});
}

export enum CommandType {
	SLASH = 1,
	USER = 2,
	MESSAGE = 3
}

export interface Command {
	name: string;
	type?: number;
	description: string;
	options?: APIApplicationCommandOption[];
}

export const commands: Command[] = [
	{
		name: 'clan',
		description: 'Clan summary and basic details',
		options: [
			{
				name: 'tag',
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
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
				description: 'Clan tag / alias or @user mention',
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'with',
				description: 'Select an option',
				type: ApplicationCommandOptionType.String,
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
				description: 'Player tag or @user mention',
				required: false,
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'player',
		description: 'Player summary and some basic details',
		options: [
			{
				name: 'tag',
				description: 'Player tag or @user mention',
				required: false,
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'roster',
		description: 'CWL Roster and Town Hall distribution',
		options: [
			{
				name: 'tag',
				description: 'Clan tag / alias or @user mention',
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
				description: 'Clan tag / alias or @user mention',
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'season',
				description: 'Season ID',
				type: ApplicationCommandOptionType.String,
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
				description: 'Clan tag / alias or @user mention',
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
				description: 'Player tag or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'rushed',
		description: 'Rushed troops, spells, and heroes',
		options: [
			{
				name: 'tag',
				description: 'Player tag or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'clan',
				description: 'Display all clan members',
				type: ApplicationCommandOptionType.String,
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
				type: ApplicationCommandOptionType.User,
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'war-id',
				description: 'Search by War ID',
				type: ApplicationCommandOptionType.String,
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'war-id',
				description: 'Search by War ID',
				type: ApplicationCommandOptionType.String,
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
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'user',
				description: 'Optional user',
				type: ApplicationCommandOptionType.User
			},
			{
				name: 'default',
				description: 'Set it default account',
				type: ApplicationCommandOptionType.String,
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
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'user',
				description: 'Optional user (Only valid for a player tag)',
				required: false,
				type: ApplicationCommandOptionType.User
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
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Player Tag',
						required: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'reason',
						description: 'Reason of this flag',
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'remove',
				description: 'Remove a flag from exisiting player account',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Player Tag',
						type: ApplicationCommandOptionType.String,
						required: true
					}
				]
			},
			{
				name: 'show',
				description: 'Show the flag for a player account',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Player Tag',
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: 'Get all flags for the server or clan',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'export',
						description: 'Export to excel file?',
						type: ApplicationCommandOptionType.String,
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
				type: ApplicationCommandOptionType.String,
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
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'channel',
				description: 'Channel for the specified feature',
				type: ApplicationCommandOptionType.Channel
			},
			{
				name: 'extra',
				description: 'Role for clan feed or Hex color code.',
				type: ApplicationCommandOptionType.String
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
				type: ApplicationCommandOptionType.String,
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
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'channel',
				description: 'Channel to be removed',
				type: ApplicationCommandOptionType.Channel
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
				type: ApplicationCommandOptionType.String
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
				type: ApplicationCommandOptionType.String,
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
						name: 'CWL Attacks',
						value: 'attacks'
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String
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
				type: ApplicationCommandOptionType.String,
				choices: [
					{
						name: 'Clan War Stats',
						value: 'wars'
					},
					{
						name: 'Season Stats',
						value: 'season'
					},
					{
						name: 'Last War Dates',
						value: 'lastwars'
					},
					{
						name: 'Missed Wars',
						value: 'missed'
					},
					{
						name: 'Clan Members',
						value: 'members'
					}
				]
			},
			{
				name: 'season',
				description: 'Season ID for season stats',
				type: ApplicationCommandOptionType.String,
				choices: getSeasonIds()
			},
			{
				name: 'tag',
				description: 'Clan tags or aliases to filter clans',
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'wars',
				description: 'Number of wars (Default: 25)',
				type: ApplicationCommandOptionType.Integer
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
				type: ApplicationCommandOptionType.String,
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
				type: ApplicationCommandOptionType.String,
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String
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
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'token',
				required: true,
				description: 'API token for the player account',
				type: ApplicationCommandOptionType.String
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
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'days',
				required: false,
				description: 'Expand',
				type: ApplicationCommandOptionType.Integer,
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
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'name',
						required: true,
						description: 'Name of the alias',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'tag',
						description: 'Tag of the clan',
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: 'Get aliases for all clans',
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'remove',
				description: 'Remove an alias for a clan',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'name',
						description: 'Tag of the clan or name of the alias',
						required: true,
						type: ApplicationCommandOptionType.String
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
				type: ApplicationCommandOptionType.Role
			},
			{
				name: 'elders',
				required: true,
				description: 'Elder Role',
				type: ApplicationCommandOptionType.Role
			},
			{
				name: 'members',
				required: true,
				description: 'Member Role',
				type: ApplicationCommandOptionType.Role
			},
			{
				name: 'tag',
				required: false,
				description: 'Tag of the clan. Do not pass the tag if you want same type roles for all clans.',
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'verify',
				required: false,
				description: 'Roles will be given to verified players only.',
				type: ApplicationCommandOptionType.String,
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
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
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'army',
		description: 'Render an army composition link',
		options: [
			{
				name: 'link',
				description: 'Army composition link',
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: 'name',
				description: 'Optional name for this army',
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'nickname',
		description: 'Set nickname from linked players',
		options: [
			{
				name: 'user',
				description: 'The user',
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'config',
		description: 'Change embed color or server prefix',
		options: [
			{
				name: 'prefix',
				description: 'Change server prefix',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'prefix',
						description: 'The new prefix',
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'color',
				description: 'Change embed color (Patron Only)',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'hex_code',
						description: 'Hex color code (e.g #ed4245)',
						type: ApplicationCommandOptionType.String,
						required: true
					}
				]
			}
		]
	},
	{
		name: 'timezone',
		description: 'Set your time zone offset',
		options: [
			{
				name: 'location',
				description: 'Search by country or city name (we don\'t store your location, only offset. e.g GMT+5:00)',
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'search',
		description: 'Search any clans by name',
		options: [
			{
				name: 'name',
				description: 'Clan name (must be 3 characters long)',
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'Profile',
		type: CommandType.USER,
		description: ''
	},
	{
		name: 'Army',
		type: CommandType.MESSAGE,
		description: ''
	}
];
