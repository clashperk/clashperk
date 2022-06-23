import { fileURLToPath } from 'url';
import { ApplicationCommandOptionType, APIApplicationCommandOption } from 'discord-api-types/v9';
import moment from 'moment';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { command } from '../locales/en';
import { fmt } from '../src/bot/util/i18n';

const locales = new URL('../locales/{{lng}}/{{ns}}.json', import.meta.url);
await i18next.use(Backend).init({
	debug: false,
	cleanCode: true,
	lng: 'en-US',
	fallbackLng: {
		fr: ['fr-FR', 'en-US'], // French/Français
		it: ['it-IT', 'en-US'], // Italian/Italiano
		de: ['de-DE', 'en-US'], // German/Deutsch
		no: ['no-NO', 'en-US'], // Norwegian/Norsk
		nl: ['nl-NL', 'en-US'], // Dutch/Nederlands
		default: ['en-US'] // Default Fallback Language
	},
	preload: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'nl-NL', 'it-IT', 'de-DE', 'no-NO'],
	defaultNS: 'translation',
	ns: ['translation'],
	backend: { loadPath: fileURLToPath(locales) }
});

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

export const translation: typeof fmt = (text: string): Record<string, string> => {
	return ['fr', 'en-GB'].reduce<Record<string, string>>((acc, lang) => {
		const locale = i18next.t(text, { lng: lang, escapeValue: false });
		acc[lang] = locale.substring(0, 100);
		return acc;
	}, {});
};

export interface Command {
	name: string;
	type?: number;
	description: string;
	default_permission?: boolean;
	options?: APIApplicationCommandOption[];
	description_localizations?: Record<string, string>;
}

export const COMMANDS: Command[] = [
	{
		name: 'clan',
		description: command.clan.description,
		description_localizations: translation('command.clan.description'),
		options: [
			{
				name: 'tag',
				description: command.clan.options.tag.description,
				description_localizations: translation('command.clan.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'lastseen',
		description: command.lastseen.description,
		description_localizations: translation('command.lastseen.description'),
		options: [
			{
				name: 'tag',
				description: command.lastseen.options.tag.description,
				description_localizations: translation('command.lastseen.options.tag.description'),
				type: 3,
				required: false
			}
		]
	},
	{
		name: 'clan-games',
		description: command.clan_games.description,
		description_localizations: translation('command.clan_games.description'),
		options: [
			{
				name: 'tag',
				description: command.clan_games.options.tag.description,
				description_localizations: translation('command.clan_games.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'attacks',
		description: command.attacks.description,
		description_localizations: translation('command.attacks.description'),
		options: [
			{
				name: 'tag',
				description: command.attacks.options.tag.description,
				description_localizations: translation('command.attacks.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'members',
		description: command.members.description,
		description_localizations: translation('command.members.description'),
		options: [
			{
				name: 'tag',
				description: command.members.options.tag.description,
				description_localizations: translation('command.members.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'option',
				description: command.members.options.option.description,
				description_localizations: translation('command.members.options.option.description'),
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
		description_localizations: translation('command.units.description'),
		options: [
			{
				name: 'tag',
				description: command.units.options.tag.description,
				description_localizations: translation('command.units.options.tag.description'),
				required: false,
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'player',
		description: command.player.description,
		description_localizations: translation('command.player.description'),
		options: [
			{
				name: 'tag',
				description: command.player.options.tag.description,
				description_localizations: translation('command.player.options.tag.description'),
				required: false,
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'roster',
		description: command.cwl.roster.description,
		description_localizations: translation('command.cwl.roster.description'),
		options: [
			{
				name: 'tag',
				description: command.cwl.roster.options.tag.description,
				description_localizations: translation('command.cwl.roster.options.tag.description'),
				type: 3,
				required: false
			}
		]
	},
	{
		name: 'round',
		description: command.cwl.round.description,
		description_localizations: translation('command.cwl.round.description'),
		options: [
			{
				name: 'tag',
				description: command.cwl.round.options.tag.description,
				description_localizations: translation('command.cwl.round.options.tag.description'),
				type: 3,
				required: false
			},
			{
				name: 'round',
				description: command.cwl.round.options.round.description,
				description_localizations: translation('command.cwl.round.options.round.description'),
				type: 4,
				required: false
			}
		]
	},
	{
		name: 'donations',
		description: command.donations.description,
		description_localizations: translation('command.donations.description'),
		options: [
			{
				name: 'tag',
				description: command.donations.options.tag.description,
				description_localizations: translation('command.donations.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'season',
				description: command.donations.options.season.description,
				description_localizations: translation('command.donations.options.season.description'),
				type: ApplicationCommandOptionType.String,
				required: false,
				choices: getSeasonIds()
			}
		]
	},
	{
		name: 'compo',
		description: command.compo.description,
		description_localizations: translation('command.compo.description'),
		options: [
			{
				name: 'tag',
				description: command.compo.options.tag.description,
				description_localizations: translation('command.compo.options.tag.description'),
				type: 3,
				required: false
			}
		]
	},
	{
		name: 'upgrades',
		description: command.upgrades.description,
		description_localizations: translation('command.upgrades.description'),
		options: [
			{
				name: 'tag',
				description: command.upgrades.options.tag.description,
				description_localizations: translation('command.upgrades.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'rushed',
		description: command.rushed.description,
		description_localizations: translation('command.rushed.description'),
		options: [
			{
				name: 'tag',
				description: command.rushed.options.tag.description,
				description_localizations: translation('command.rushed.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'clan',
				description: command.rushed.options.clan.description,
				description_localizations: translation('command.rushed.options.clan.description'),
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
		description_localizations: translation('command.profile.description'),
		options: [
			{
				name: 'user',
				description: command.profile.options.user.description,
				description_localizations: translation('command.profile.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'war',
		description: command.war.description,
		description_localizations: translation('command.war.description'),
		options: [
			{
				name: 'tag',
				description: command.war.options.tag.description,
				description_localizations: translation('command.war.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'war_id',
				description: command.war.options.war_id.description,
				description_localizations: translation('command.war.options.war_id.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'remaining',
		description: command.remaining.description,
		description_localizations: translation('command.remaining.description'),
		options: [
			{
				name: 'tag',
				description: command.remaining.options.tag.description,
				description_localizations: translation('command.remaining.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: 'war_id',
				description: command.remaining.options.war_id.description,
				description_localizations: translation('command.remaining.options.war_id.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'link',
		description: command.link.description,
		description_localizations: translation('command.link.description'),
		options: [
			{
				name: 'create',
				description: command.link.create.description,
				description_localizations: translation('command.link.create.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.link.create.options.tag.description,
						description_localizations: translation('command.link.create.options.tag.description'),
						required: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: command.link.create.options.user.description,
						description_localizations: translation('command.link.create.options.user.description'),
						type: ApplicationCommandOptionType.User
					},
					{
						name: 'default',
						description: command.link.create.options.default.description,
						description_localizations: translation('command.link.create.options.default.description'),
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
				description_localizations: translation('command.link.list.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.link.list.options.tag.description,
						description_localizations: translation('command.link.list.options.tag.description'),
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'delete',
				description: command.link.delete.description,
				description_localizations: translation('command.link.delete.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.link.delete.options.tag.description,
						description_localizations: translation('command.link.delete.options.tag.description'),
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
		description_localizations: translation('command.flag.description'),
		options: [
			{
				name: 'create',
				description: command.flag.create.description,
				description_localizations: translation('command.flag.create.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.flag.create.options.tag.description,
						description_localizations: translation('command.flag.create.options.tag.description'),
						required: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'reason',
						description: command.flag.create.options.reason.description,
						description_localizations: translation('command.flag.create.options.reason.description'),
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: command.flag.list.description,
				description_localizations: translation('command.flag.list.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'export',
						description: command.flag.list.options.export.description,
						description_localizations: translation('command.flag.list.options.export.description'),
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
				description_localizations: translation('command.flag.search.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.flag.search.options.tag.description,
						description_localizations: translation('command.flag.search.options.tag.description'),
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'delete',
				description: command.flag.delete.description,
				description_localizations: translation('command.flag.delete.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.flag.delete.options.tag.description,
						description_localizations: translation('command.flag.delete.options.tag.description'),
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
		description_localizations: translation('command.setup.description'),
		options: [
			{
				name: 'enable',
				description: command.setup.enable.description,
				description_localizations: translation('command.setup.enable.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'option',
						description: command.setup.enable.options.option.description,
						description_localizations: translation('command.setup.enable.options.option.description'),
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
						description: command.setup.enable.options.tag.description,
						description_localizations: translation('command.setup.enable.options.tag.description'),
						required: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'channel',
						description: command.setup.enable.options.channel.description,
						description_localizations: translation('command.setup.enable.options.channel.description'),
						type: ApplicationCommandOptionType.Channel
					},
					{
						name: 'color',
						name_localizations: {
							'en-GB': 'colour'
						},
						description: command.setup.enable.options.color.description,
						description_localizations: translation('command.setup.enable.options.color.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'role',
						description: command.setup.enable.options.role.description,
						description_localizations: translation('command.setup.enable.options.role.description'),
						type: ApplicationCommandOptionType.Role
					}
				]
			},
			{
				name: 'list',
				description: command.setup.list.description,
				description_localizations: translation('command.setup.list.description'),
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'disable',
				description: command.setup.disable.description,
				description_localizations: translation('command.setup.disable.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'option',
						required: true,
						description: command.setup.disable.options.option.description,
						description_localizations: translation('command.setup.disable.options.option.description'),
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
								name: 'Remove Clan',
								value: 'remove-clan'
							}
						]
					},
					{
						name: 'tag',
						description: command.setup.disable.options.tag.description,
						description_localizations: translation('command.setup.disable.options.tag.description'),
						type: ApplicationCommandOptionType.String,
						required: true
					},
					{
						name: 'channel',
						description: command.setup.disable.options.channel.description,
						description_localizations: translation('command.setup.disable.options.channel.description'),
						type: ApplicationCommandOptionType.Channel
					}
				]
			}
		]
	},
	{
		name: 'invite',
		description: command.invite.description,
		description_localizations: translation('command.invite.description')
	},
	{
		name: 'help',
		description: command.help.description,
		description_localizations: translation('command.help.description'),
		options: [
			{
				name: 'command',
				description: command.help.options.name.description,
				description_localizations: translation('command.help.options.name.description'),
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'cwl',
		description: command.cwl.description,
		description_localizations: translation('command.cwl.description'),
		options: [
			{
				name: 'option',
				description: command.cwl.options.option.description,
				description_localizations: translation('command.cwl.options.option.description'),
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
				description: command.cwl.options.tag.description,
				description_localizations: translation('command.cwl.options.tag.description'),
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'export',
		description: command.export.description,
		description_localizations: translation('command.export.description'),
		options: [
			{
				name: 'option',
				required: true,
				description: command.export.options.option.description,
				description_localizations: translation('command.export.options.option.description'),
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
				description: command.export.options.season.description,
				description_localizations: translation('command.export.options.season.description'),
				type: ApplicationCommandOptionType.String,
				choices: getSeasonIds()
			},
			{
				name: 'clans',
				description: command.export.options.clans.description,
				description_localizations: translation('command.export.options.clans.description'),
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'wars',
				description: command.export.options.wars.description,
				description_localizations: translation('command.export.options.wars.description'),
				type: ApplicationCommandOptionType.Integer
			}
		]
	},
	{
		name: 'summary',
		description: command.summary.description,
		description_localizations: translation('command.summary.description'),
		options: [
			{
				name: 'option',
				required: true,
				type: ApplicationCommandOptionType.String,
				description: command.summary.options.option.description,
				description_localizations: translation('command.summary.options.option.description'),
				choices: [
					{
						name: 'Clan Wars',
						value: 'wars'
					},
					{
						name: 'Clan Games',
						value: 'clan-games'
					},
					{
						name: 'Clan Stats',
						value: 'clans'
					},
					{
						name: 'Clan Donations',
						value: 'donations'
					},
					{
						name: 'Player Donations',
						value: 'player-donations'
					},
					{
						name: 'Player Trophies',
						value: 'trophies'
					},
					{
						name: 'Player Attacks',
						value: 'attacks'
					}
				]
			},
			{
				name: 'season',
				required: false,
				type: ApplicationCommandOptionType.String,
				description: command.summary.options.season.description,
				description_localizations: translation('command.summary.options.season.description'),
				choices: getSeasonIds()
			}
		]
	},
	{
		name: 'warlog',
		description: command.warlog.description,
		description_localizations: translation('command.warlog.description'),
		options: [
			{
				name: 'tag',
				description: command.warlog.options.tag.description,
				description_localizations: translation('command.warlog.options.tag.description'),
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'verify',
		description: command.verify.description,
		description_localizations: translation('command.verify.description'),
		options: [
			{
				name: 'tag',
				required: true,
				description: command.verify.options.tag.description,
				description_localizations: translation('command.verify.options.tag.description'),
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'token',
				required: true,
				description: command.verify.options.token.description,
				description_localizations: translation('command.verify.options.token.description'),
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'activity',
		description: command.activity.description,
		description_localizations: translation('command.activity.description'),
		options: [
			{
				name: 'clans',
				required: false,
				description: command.activity.options.clans.description,
				description_localizations: translation('command.activity.options.clans.description'),
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'days',
				required: false,
				description: command.activity.options.days.description,
				description_localizations: translation('command.activity.options.days.description'),
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
		description_localizations: translation('command.alias.description'),
		options: [
			{
				name: 'create',
				description: command.alias.create.description,
				description_localizations: translation('command.alias.create.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'name',
						required: true,
						description: command.alias.create.options.name.description,
						description_localizations: translation('command.alias.create.options.name.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'tag',
						description: command.alias.create.options.tag.description,
						description_localizations: translation('command.alias.create.options.tag.description'),
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: command.alias.list.description,
				description_localizations: translation('command.alias.list.description'),
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'delete',
				description: command.alias.delete.description,
				description_localizations: translation('command.alias.delete.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'name',
						description: command.alias.delete.options.name.description,
						description_localizations: translation('command.alias.delete.options.name.description'),
						required: true,
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},
	{
		name: 'debug',
		description: command.debug.description,
		description_localizations: translation('command.debug.description')
	},
	{
		name: 'autorole',
		description: command.autorole.description,
		description_localizations: translation('command.autorole.description'),
		options: [
			{
				name: 'enable',
				description: command.autorole.enable.description,
				description_localizations: translation('command.autorole.enable.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'co-leads',
						required: true,
						description: command.autorole.enable.options.co_leads.description,
						description_localizations: translation('command.autorole.enable.options.co_leads.description'),
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'elders',
						required: true,
						description: command.autorole.enable.options.elders.description,
						description_localizations: translation('command.autorole.enable.options.elders.description'),
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'members',
						required: true,
						description: command.autorole.enable.options.members.description,
						description_localizations: translation('command.autorole.enable.options.members.description'),
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'tag',
						required: false,
						description: command.autorole.enable.options.tag.description,
						description_localizations: translation('command.autorole.enable.options.tag.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'verify',
						required: false,
						description: command.autorole.enable.options.verify.description,
						description_localizations: translation('command.autorole.enable.options.verify.description'),
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
				description_localizations: translation('command.autorole.disable.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.autorole.disable.options.tag.description,
						description_localizations: translation('command.autorole.disable.options.tag.description'),
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},
	{
		name: 'boosts',
		description: command.boosts.description,
		description_localizations: translation('command.boosts.description'),
		options: [
			{
				name: 'tag',
				description: command.boosts.options.tag.description,
				description_localizations: translation('command.boosts.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'lineup',
		description: command.lineup.description,
		description_localizations: translation('command.lineup.description'),
		options: [
			{
				name: 'tag',
				description: command.lineup.options.tag.description,
				description_localizations: translation('command.lineup.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'army',
		description: command.army.description,
		description_localizations: translation('command.army.description'),
		options: [
			{
				name: 'link',
				description: command.army.options.link.description,
				description_localizations: translation('command.army.options.link.description'),
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: 'name',
				description: command.army.options.name.description,
				description_localizations: translation('command.army.options.name.description'),
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'nickname',
		description: command.nickname.description,
		description_localizations: translation('command.nickname.description'),
		options: [
			{
				name: 'user',
				description: command.nickname.options.user.description,
				description_localizations: translation('command.nickname.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: true
			}
		]
	},
	{
		name: 'config',
		description: command.config.description,
		description_localizations: translation('command.config.description'),
		options: [
			{
				name: 'color_code',
				name_localizations: {
					'en-GB': 'colour_code'
				},
				description: command.config.options.color_code.description,
				description_localizations: translation('command.config.options.color_code.description'),
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'events_channel',
				description: command.config.options.events_channel.description,
				description_localizations: translation('command.config.options.events_channel.description'),
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'timezone',
		description: command.timezone.description,
		description_localizations: translation('command.timezone.description'),
		options: [
			{
				name: 'location',
				description: command.timezone.options.location.description,
				description_localizations: translation('command.timezone.options.location.description'),
				type: ApplicationCommandOptionType.String,
				required: true
			}
		]
	},
	{
		name: 'search',
		description: command.search.description,
		description_localizations: translation('command.search.description'),
		options: [
			{
				name: 'name',
				description: command.search.options.name.description,
				description_localizations: translation('command.search.options.name.description'),
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'redeem',
		description: command.redeem.description,
		description_localizations: translation('command.redeem.description')
	},
	{
		name: 'reminder',
		description: command.reminder.description,
		description_localizations: translation('command.reminder.description'),
		options: [
			{
				name: 'create',
				description: command.reminder.create.description,
				description_localizations: translation('command.reminder.create.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'duration',
						description: command.reminder.create.options.duration.description,
						description_localizations: translation('command.reminder.create.options.duration.description'),
						type: ApplicationCommandOptionType.String,
						required: true,
						autocomplete: true
					},
					{
						name: 'message',
						description: command.reminder.create.options.message.description,
						description_localizations: translation('command.reminder.create.options.message.description'),
						type: ApplicationCommandOptionType.String,
						required: true
					},
					{
						name: 'channel',
						description: command.reminder.create.options.channel.description,
						description_localizations: translation('command.reminder.create.options.channel.description'),
						type: ApplicationCommandOptionType.Channel
					},
					{
						name: 'clans',
						description: command.reminder.create.options.clans.description,
						description_localizations: translation('command.reminder.create.options.clans.description'),
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: command.reminder.list.description,
				description_localizations: translation('command.reminder.list.description'),
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'delete',
				description: command.reminder.delete.description,
				description_localizations: translation('command.reminder.delete.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'id',
						description: command.reminder.delete.options.id.description,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'clear',
						description: command.reminder.delete.options.clear.description,
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
		description_localizations: translation('command.stats.description'),
		options: [
			{
				name: 'attacks',
				description: command.stats.attacks.description,
				description_localizations: translation('command.stats.attacks.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.stats.options.tag.description,
						description_localizations: translation('command.stats.options.tag.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'compare',
						description: command.stats.options.compare.description,
						description_localizations: translation('command.stats.options.compare.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'stars',
						description: command.stats.options.stars.description,
						description_localizations: translation('command.stats.options.stars.description'),
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
						description: command.stats.options.type.description,
						description_localizations: translation('command.stats.options.type.description'),
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
						description: command.stats.options.season.description,
						description_localizations: translation('command.stats.options.season.description'),
						type: ApplicationCommandOptionType.String,
						choices: getSeasonIds().map((season) => ({ name: `Since ${season.name}`, value: season.value }))
					},
					{
						name: 'attempt',
						description: command.stats.options.attempt.description,
						description_localizations: translation('command.stats.options.attempt.description'),
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
				name_localizations: {
					'en-GB': 'defence'
				},
				description: command.stats.defense.description,
				description_localizations: translation('command.stats.defense.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: command.stats.options.tag.description,
						description_localizations: translation('command.stats.options.tag.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'compare',
						description: command.stats.options.compare.description,
						description_localizations: translation('command.stats.options.compare.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'stars',
						description: command.stats.options.stars.description,
						description_localizations: translation('command.stats.options.stars.description'),
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
						description: command.stats.options.type.description,
						description_localizations: translation('command.stats.options.type.description'),
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
						description: command.stats.options.season.description,
						description_localizations: translation('command.stats.options.season.description'),
						type: ApplicationCommandOptionType.String,
						choices: getSeasonIds().map((season) => ({ name: `Since ${season.name}`, value: season.value }))
					},
					{
						name: 'attempt',
						description: command.stats.options.attempt.description,
						description_localizations: translation('command.stats.options.attempt.description'),
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
