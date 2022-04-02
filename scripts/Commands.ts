import { ApplicationCommandOptionType, APIApplicationCommandOption } from 'discord-api-types/v9';
import moment from 'moment';
import { command } from '../locales/default';

export function getSeasonIds() {
	return Array(Math.min(24, 10 + new Date().getMonth()))
		.fill(0)
		.map((_, m) => {
			const now = new Date();
			now.setHours(0, 0, 0, 0);
			now.setMonth(now.getMonth() - (m - 1), 0);
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
	default_permission?: boolean;
	options?: APIApplicationCommandOption[];
}

export const COMMANDS: Command[] = [
	{
		name: 'clan',
		description: command.clan.description,
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
		description: command.lastseen.description,
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
		name: 'clan-games',
		description: command.clan_games.description,
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
		description: command.attacks.description,
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
		description: command.members.description,
		options: [
			{
				name: 'tag',
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'option',
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
		description: command.units.description,
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
		description: command.player.description,
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
		description: command.cwl.roster.description,
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
		description: command.cwl.round.description,
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
		description: command.donations.description,
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
		description: command.compo.description,
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
		name: 'upgrades',
		description: command.upgrades.description,
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
		description: command.rushed.description,
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
		description: command.profile.description,
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
		description: command.war.description,
		options: [
			{
				name: 'tag',
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'war_id',
				description: 'Search by War ID',
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'remaining',
		description: command.remaining.description,
		options: [
			{
				name: 'tag',
				description: 'Clan tag / alias or @user mention',
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'war_id',
				description: 'Search by War ID',
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'link',
		description: command.link.description,
		options: [
			{
				name: 'create',
				description: command.link.create.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Tag of a clan or player account',
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
				name: 'list',
				description: command.link.list.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Clan tag / alias or @user mention',
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'delete',
				description: command.link.delete.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Tag of a player or clan',
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},
	{
		name: 'flag',
		description: command.flag.description,
		options: [
			{
				name: 'create',
				description: command.flag.create.description,
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
				name: 'list',
				description: command.flag.list.description,
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
			},
			{
				name: 'search',
				description: command.flag.search.description,
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
				name: 'delete',
				description: command.flag.delete.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Player Tag',
						type: ApplicationCommandOptionType.String,
						required: true
					}
				]
			}
		]
	},
	{
		name: 'setup',
		description: command.setup.description,
		options: [
			{
				name: 'enable',
				description: command.setup.enable.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'option',
						description: 'Select an option',
						type: ApplicationCommandOptionType.String,
						required: true,
						choices: [
							{
								name: 'Channel Link',
								value: 'channel-link'
							},
							{
								name: 'Server Link',
								value: 'server-link'
							},
							{
								name: 'War Feed',
								value: 'war-feed'
							},
							{
								name: 'Last Seen',
								value: 'lastseen'
							},
							{
								name: 'Clan Games',
								value: 'clan-games'
							},
							{
								name: 'Clan Feed',
								value: 'clan-feed'
							},
							{
								name: 'Clan Embed',
								value: 'clan-embed'
							},
							{
								name: 'Donation Log',
								value: 'donation-log'
							}
						]
					},
					{
						name: 'tag',
						description: 'Tag of a clan',
						required: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'channel',
						description: 'Channel for the specified feature (defaults to the current channel)',
						type: ApplicationCommandOptionType.Channel
					},
					{
						name: 'color',
						description: 'Hex color code (only for donation log, clan games, last seen and clan embed)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'role',
						description: 'Role for the flag notification (only for clan feed)',
						type: ApplicationCommandOptionType.Role
					}
				]
			},
			{
				name: 'list',
				description: command.setup.list.description,
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'disable',
				description: command.setup.disable.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'option',
						required: true,
						description: 'Select an option',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Channel Link',
								value: 'channel-link'
							},
							{
								name: 'Clan Feed',
								value: 'clan-feed'
							},
							{
								name: 'War Feed',
								value: 'war-feed'
							},
							{
								name: 'Last Seen',
								value: 'lastseen'
							},
							{
								name: 'Clan Games',
								value: 'clan-games'
							},
							{
								name: 'Clan Embed',
								value: 'clan-embed'
							},
							{
								name: 'Donation Log',
								value: 'donation-log'
							},
							{
								name: 'Auto Role',
								value: 'auto-role'
							},
							{
								name: 'Remove Clan',
								value: 'remove-clan'
							}
						]
					},
					{
						name: 'tag',
						description: 'Tag of a clan',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'channel',
						description: 'Channel to be removed',
						type: ApplicationCommandOptionType.Channel
					}
				]
			}
		]
	},
	{
		name: 'invite',
		description: command.invite.description
	},
	{
		name: 'help',
		description: command.help.description,
		options: [
			{
				name: 'command',
				description: 'Name of a command',
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'cwl',
		description: command.cwl.description,
		options: [
			{
				name: 'option',
				description: 'Select an option',
				type: ApplicationCommandOptionType.String,
				required: true,
				choices: [
					{
						name: 'Roster',
						value: 'roster'
					},
					{
						name: 'Round',
						value: 'round'
					},
					{
						name: 'Lineup',
						value: 'lineup'
					},
					{
						name: 'Stars',
						value: 'stars'
					},
					{
						name: 'Attacks',
						value: 'attacks'
					},
					{
						name: 'Stats',
						value: 'stats'
					},
					{
						name: 'Members',
						value: 'members'
					},
					{
						name: 'Export',
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
		description: command.export.description,
		options: [
			{
				name: 'option',
				required: true,
				description: 'Select an option',
				type: ApplicationCommandOptionType.String,
				choices: [
					{
						name: 'Clan Wars',
						value: 'wars'
					},
					{
						name: 'Season Stats',
						value: 'season'
					},
					{
						name: 'Clan Members',
						value: 'members'
					},
					{
						name: 'CWL Stats',
						value: 'cwl'
					},
					{
						name: 'Last War Dates',
						value: 'lastwars'
					},
					{
						name: 'Missed Wars',
						value: 'missed'
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
				name: 'clans',
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
		description: command.summary.description,
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
						name: 'Trophies',
						value: 'trophies'
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
						name: 'Clan Donations',
						value: 'donations'
					},
					{
						name: 'Player Donations',
						value: 'player-donations'
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
		description: command.warlog.description,
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
		description: command.verify.description,
		options: [
			{
				name: 'tag',
				required: true,
				description: 'Tag of a player account',
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
		description: command.activity.description,
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
						name: '1',
						value: 1
					},
					{
						name: '3',
						value: 3
					},
					{
						name: '7',
						value: 7
					}
				]
			}
		]
	},
	{
		name: 'alias',
		description: command.alias.description,
		options: [
			{
				name: 'create',
				description: command.alias.create.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'name',
						required: true,
						description: 'Name of an alias',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'tag',
						description: 'Tag of a clan',
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: command.alias.list.description,
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'delete',
				description: command.alias.delete.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'name',
						description: 'Tag of a clan or name of an alias',
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},
	{
		name: 'debug',
		description: command.debug.description
	},
	{
		name: 'autorole',
		description: command.autorole.description,
		options: [
			{
				name: 'enable',
				description: command.autorole.enable.description,
				type: ApplicationCommandOptionType.Subcommand,
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
						description: 'Tag of a clan. Do not pass the tag if you want the same type of roles for all clans.',
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
				name: 'disable',
				description: command.autorole.disable.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Tag of a clan',
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},
	{
		name: 'boosts',
		description: command.boosts.description,
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
		description: command.lineup.description,
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
		description: command.army.description,
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
		description: command.nickname.description,
		options: [
			{
				name: 'user',
				description: 'The user',
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	},
	{
		name: 'config',
		description: command.config.description,
		options: [
			{
				name: 'color_code',
				description: 'Hex color code (e.g #ed4245) [Patron Only]',
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'events_channel',
				description: 'Clash related events channel',
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'timezone',
		description: command.timezone.description,
		options: [
			{
				name: 'location',
				description: "Search by country or city name (we don't store your location, only offset. e.g GMT+5:00)",
				type: ApplicationCommandOptionType.String,
				required: true
			}
		]
	},
	{
		name: 'search',
		description: command.search.description,
		options: [
			{
				name: 'name',
				description: 'Clan name (must be 3 characters long)',
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'redeem',
		description: command.redeem.description
	},
	{
		name: 'reminder',
		description: command.reminder.description,
		options: [
			{
				name: 'create',
				description: command.reminder.create.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'duration',
						description: 'Remaining duration to mention war members (Multiple of 15 mins e.g 15m, 30m, 1h, 1.25h, 1.5h)',
						type: ApplicationCommandOptionType.String,
						required: true,
						autocomplete: true
					},
					{
						name: 'message',
						description: 'Reminder message for the notification',
						type: ApplicationCommandOptionType.String,
						required: true
					},
					{
						name: 'channel',
						description: 'Channel to send reminder in',
						type: ApplicationCommandOptionType.Channel
					},
					{
						name: 'clans',
						description: 'Optional clan tags or aliases to choose specific clans',
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: command.reminder.list.description,
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'delete',
				description: command.reminder.delete.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'id',
						description: 'Reminder Id',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'clear',
						description: 'Clear all reminders',
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
		name: 'stats',
		description: command.stats.description,
		options: [
			{
				name: 'attacks',
				description: command.stats.attacks.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Clan tag / alias or @user mention',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'compare',
						description: 'Compare Town Halls (e.g 14vs13, 12 13, all, equal)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'stars',
						description: 'War stars earned. (Default: 3)',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: '3',
								value: '==3'
							},
							{
								name: '2',
								value: '==2'
							},
							{
								name: '>= 2',
								value: '>=2'
							},
							{
								name: '1',
								value: '==1'
							},
							{
								name: '>= 1',
								value: '>=1'
							}
						]
					},
					{
						name: 'type',
						description: 'War Type [e.g Regular, CWL, Friendly] (Default: Regular and CWL)',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Regular',
								value: 'regular'
							},
							{
								name: 'CWL',
								value: 'cwl'
							},
							{
								name: 'Friendly',
								value: 'friendly'
							},
							{
								name: 'Regular and CWL',
								value: 'noFriendly'
							},
							{
								name: 'Regular and Friendly',
								value: 'noCWL'
							},
							{
								name: 'Regular, CWL and  Friendly',
								value: 'all'
							}
						]
					},
					{
						name: 'season',
						description: 'Limit the data to the last X months.',
						type: ApplicationCommandOptionType.String,
						choices: getSeasonIds().map((season) => ({ name: `Since ${season.name}`, value: season.value }))
					},
					{
						name: 'attempt',
						description: 'Fresh attacks or cleanup attacks. (Default: Both)',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Fresh',
								value: 'fresh'
							},
							{
								name: 'Cleanup',
								value: 'cleanup'
							}
						]
					}
				]
			},
			{
				name: 'defense',
				description: command.stats.defense.description,
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: 'Clan tag / alias or @user mention',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'compare',
						description: 'Compare Town Halls (e.g 14vs13, 12 13, all, equal)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'stars',
						description: 'War stars earned. (Default: 3)',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: '3',
								value: '==3'
							},
							{
								name: '2',
								value: '==2'
							},
							{
								name: '>= 2',
								value: '>=2'
							},
							{
								name: '1',
								value: '==1'
							},
							{
								name: '>= 1',
								value: '>=1'
							}
						]
					},
					{
						name: 'type',
						description: 'War Type [e.g Regular, CWL, Friendly] (Default: Regular and CWL)',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Regular',
								value: 'regular'
							},
							{
								name: 'CWL',
								value: 'cwl'
							},
							{
								name: 'Friendly',
								value: 'friendly'
							},
							{
								name: 'Regular and CWL',
								value: 'noFriendly'
							},
							{
								name: 'Regular and Friendly',
								value: 'noCWL'
							},
							{
								name: 'Regular, CWL and Friendly',
								value: 'all'
							}
						]
					},
					{
						name: 'season',
						description: 'Limit the data to the last X months.',
						type: ApplicationCommandOptionType.String,
						choices: getSeasonIds().map((season) => ({ name: `Since ${season.name}`, value: season.value }))
					},
					{
						name: 'attempt',
						description: 'Fresh defences or cleanup defences. (Default: Both)',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Fresh',
								value: 'fresh'
							},
							{
								name: 'Cleanup',
								value: 'cleanup'
							}
						]
					}
				]
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

export const PRIVATE_COMMANDS: Command[] = [
	{
		name: 'status',
		description: 'Some basic information about the bot',
		default_permission: false
	},
	{
		name: 'Whois',
		description: '',
		type: CommandType.USER,
		default_permission: false
	}
];
