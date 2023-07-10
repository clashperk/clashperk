import { fileURLToPath } from 'node:url';
import { ApplicationCommandOptionType, ApplicationCommandType, ChannelType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import i18next from 'i18next';
import moment from 'moment';
import { command, common } from '../locales/en.js';
import { defaultOptions, fallbackLng } from '../locales/index.js';
import { Backend } from '../src/bot/util/Backend.js';
import { TranslationKey } from '../src/bot/util/i18n.js';
import { Season } from '../src/bot/util/index.js';
import { MAX_TOWN_HALL_LEVEL } from '../src/bot/util/Constants.js';

const locales = new URL('../locales/{{lng}}/{{ns}}.json', import.meta.url);
await i18next.use(Backend).init({
	...defaultOptions,
	backend: { paths: [fileURLToPath(locales)] }
});

export function getSeasonIds() {
	return Array(Math.min(18))
		.fill(0)
		.map((_, m) => {
			const now = new Date(Season.ID);
			now.setHours(0, 0, 0, 0);
			now.setMonth(now.getMonth() - (m - 1), 0);
			return now;
		})
		.filter((now) => now.getTime() >= new Date('2021-04').getTime())
		.map((now) => {
			return { name: moment(now).format('MMM YYYY'), value: moment(now).format('YYYY-MM') };
		});
}

export function getWeekIds() {
	const weekIds: { name: string; value: string }[] = [];
	const friday = moment().endOf('month').day('Friday').startOf('day');
	while (weekIds.length < 6) {
		if (friday.toDate().getTime() < Date.now()) {
			weekIds.push({ name: friday.format('DD MMM, YYYY'), value: friday.format('YYYY-MM-DD') });
		}
		friday.subtract(7, 'd');
	}
	return weekIds;
}

const ChannelTypes: Exclude<ChannelType, ChannelType.DM | ChannelType.GroupDM>[] = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
	ChannelType.AnnouncementThread,
	ChannelType.PublicThread,
	ChannelType.PrivateThread
];

export const translation = (text: TranslationKey): Record<string, string> => {
	return Object.keys(fallbackLng).reduce<Record<string, string>>((record, lang) => {
		const locale = i18next.t(text, { lng: lang, escapeValue: false });
		record[lang] = locale;
		return record;
	}, {});
};

export const COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [
	{
		name: 'player',
		description: command.player.description,
		dm_permission: false,
		description_localizations: translation('command.player.description'),
		options: [
			{
				name: 'player_tag',
				description: common.options.player.tag.description,
				description_localizations: translation('common.options.player.tag.description'),
				required: false,
				autocomplete: true,
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'user',
				description: common.options.player.user.description,
				description_localizations: translation('common.options.player.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'units',
		description: command.units.description,
		dm_permission: false,
		description_localizations: translation('command.units.description'),
		options: [
			{
				name: 'player_tag',
				description: common.options.player.tag.description,
				description_localizations: translation('common.options.player.tag.description'),
				required: false,
				autocomplete: true,
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'user',
				description: common.options.player.user.description,
				description_localizations: translation('common.options.player.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'upgrades',
		description: command.upgrades.description,
		dm_permission: false,
		description_localizations: translation('command.upgrades.description'),
		options: [
			{
				name: 'player_tag',
				description: common.options.player.tag.description,
				description_localizations: translation('common.options.player.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false,
				autocomplete: true
			},
			{
				name: 'user',
				description: common.options.player.user.description,
				description_localizations: translation('common.options.player.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'rushed',
		description: command.rushed.description,
		dm_permission: false,
		description_localizations: translation('command.rushed.description'),
		options: [
			{
				name: 'player_tag',
				description: common.options.player.tag.description,
				description_localizations: translation('common.options.player.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: common.options.player.user.description,
				description_localizations: translation('common.options.player.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			},
			{
				name: 'clan_tag',
				description: command.rushed.options.clan.description,
				description_localizations: translation('command.rushed.options.clan.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true
			}
		]
	},
	{
		name: 'profile',
		description: command.profile.description,
		dm_permission: false,
		description_localizations: translation('command.profile.description'),
		options: [
			{
				name: 'user',
				description: command.profile.options.user.description,
				description_localizations: translation('command.profile.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			},
			{
				name: 'player_tag',
				description: common.options.player.tag.description,
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'verify',
		description: command.verify.description,
		dm_permission: false,
		description_localizations: translation('command.verify.description'),
		options: [
			{
				name: 'player_tag',
				required: true,
				autocomplete: true,
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

	// ----------- CLAN BASED -----------
	{
		name: 'clan',
		description: command.clan.description,
		dm_permission: false,
		description_localizations: translation('command.clan.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: common.options.user.description,
				description_localizations: translation('common.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'compo',
		description: command.compo.description,
		dm_permission: false,
		description_localizations: translation('command.compo.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: common.options.user.description,
				description_localizations: translation('common.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'boosts',
		description: command.boosts.description,
		dm_permission: false,
		description_localizations: translation('command.boosts.description'),
		options: [
			{
				name: 'tag',
				description: command.boosts.options.tag.description,
				description_localizations: translation('command.boosts.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			}
		]
	},
	{
		name: 'lastseen',
		description: command.lastseen.description,
		dm_permission: false,
		description_localizations: translation('command.lastseen.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				required: false,
				autocomplete: true
			},
			{
				name: 'user',
				description: common.options.user.description,
				description_localizations: translation('common.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'activity',
		description: command.activity.description,
		dm_permission: false,
		description_localizations: translation('command.activity.description'),
		options: [
			{
				name: 'clans',
				required: false,
				description: command.activity.options.clans.description,
				description_localizations: translation('command.activity.options.clans.description'),
				autocomplete: true,
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
					},
					{
						name: '15',
						value: 15
					},
					{
						name: '30',
						value: 30
					}
				]
			},
			{
				name: 'timezone',
				required: false,
				autocomplete: true,
				description: 'Search timezone by city or country. (e.g. London, New York, Singapore, India, Sydney)',
				type: ApplicationCommandOptionType.String
			}
		]
	},
	{
		name: 'clan-games',
		description: command.clan_games.description,
		dm_permission: false,
		description_localizations: translation('command.clan_games.description'),
		options: [
			{
				name: 'clan_tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: 'Clan games history of a linked user.',
				type: ApplicationCommandOptionType.User,
				required: false
			},
			{
				name: 'player_tag',
				description: 'Clan games history of a player.',
				type: ApplicationCommandOptionType.String,
				required: false,
				autocomplete: true
			},
			{
				name: 'season',
				description: command.clan_games.options.season.description,
				description_localizations: translation('command.clan_games.options.season.description'),
				type: ApplicationCommandOptionType.String,
				required: false,
				choices: getSeasonIds()
			}
		]
	},
	{
		name: 'capital',
		description: command.capital.description,
		dm_permission: false,
		description_localizations: translation('command.capital.description'),
		options: [
			{
				name: 'raids',
				description: command.capital.raids.description,
				description_localizations: translation('command.capital.raids.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clan_tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						type: ApplicationCommandOptionType.String,
						autocomplete: true,
						required: false
					},
					{
						name: 'user',
						description: 'Capital raid history of a linked user.',
						type: ApplicationCommandOptionType.User,
						required: false
					},
					{
						name: 'player_tag',
						description: 'Capital raid history of a player.',
						type: ApplicationCommandOptionType.String,
						required: false,
						autocomplete: true
					},
					{
						name: 'week',
						description: command.capital.raids.options.week.description,
						description_localizations: translation('command.capital.raids.options.week.description'),
						type: ApplicationCommandOptionType.String,
						required: false,
						choices: getWeekIds()
					}
				]
			},
			{
				name: 'contribution',
				description: command.capital.contribution.description,
				description_localizations: translation('command.capital.contribution.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						type: ApplicationCommandOptionType.String,
						autocomplete: true,
						required: false
					},
					{
						name: 'user',
						description: 'Capital raid history of a linked user.',
						type: ApplicationCommandOptionType.User,
						required: false
					},
					{
						name: 'player_tag',
						description: 'Capital contribution history of a player.',
						type: ApplicationCommandOptionType.String,
						required: false,
						autocomplete: true
					},
					{
						name: 'week',
						description: command.capital.contribution.options.week.description,
						description_localizations: translation('command.capital.contribution.options.week.description'),
						type: ApplicationCommandOptionType.String,
						required: false,
						choices: getWeekIds()
					}
				]
			}
		]
	},
	{
		name: 'attacks',
		description: command.attacks.description,
		dm_permission: false,
		description_localizations: translation('command.attacks.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: common.options.user.description,
				description_localizations: translation('common.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'members',
		description: command.members.description,
		dm_permission: false,
		description_localizations: translation('command.members.description'),
		options: [
			{
				name: 'option',
				description: command.members.options.option.description,
				description_localizations: translation('command.members.options.option.description'),
				type: ApplicationCommandOptionType.String,
				required: true,
				choices: [
					{
						name: 'War weight',
						value: 'heroes'
					},
					{
						name: 'Player tags',
						value: 'tags'
					},
					{
						name: 'Discord links',
						value: 'discord'
					},
					{
						name: 'War preferences',
						value: 'warPref'
					},
					{
						name: 'Join dates',
						value: 'joinLeave'
					},
					{
						name: 'Player progress',
						value: 'progress'
					},
					{
						name: 'Trophies',
						value: 'trophies'
					},
					{
						name: 'Attacks',
						value: 'attacks'
					},
					{
						name: 'Clan roles',
						value: 'roles'
					}
				]
			},
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: common.options.user.description,
				description_localizations: translation('common.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'stats',
		description: command.stats.description,
		dm_permission: false,
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
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						type: ApplicationCommandOptionType.String,
						autocomplete: true
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
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
						name: 'days',
						description: 'Number of days to include (last x days of wars)',
						type: ApplicationCommandOptionType.Integer,
						min_value: 1,
						max_value: 180
					},
					{
						name: 'wars',
						description: 'Number of last wars to include.',
						type: ApplicationCommandOptionType.Integer,
						min_value: 10,
						max_value: 300
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
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
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
		name: 'donations',
		description: command.donations.description,
		dm_permission: false,
		description_localizations: translation('command.donations.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: 'Donation history of a linked user.',
				type: ApplicationCommandOptionType.User,
				required: false
			},
			{
				name: 'player_tag',
				description: 'Donation history of a player.',
				type: ApplicationCommandOptionType.String,
				required: false,
				autocomplete: true
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
		name: 'war',
		description: command.war.description,
		dm_permission: false,
		description_localizations: translation('command.war.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: common.options.user.description,
				description_localizations: translation('common.options.user.description'),
				type: ApplicationCommandOptionType.User,
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
		name: 'caller',
		description: 'Manage the war base caller.',
		dm_permission: false,
		options: [
			{
				name: 'assign',
				description: 'Set a target for a player in the current war.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'defense_target',
						description: 'The base target # of your opponent.',
						type: ApplicationCommandOptionType.Integer,
						required: true,
						min_value: 1,
						max_value: 50
					},
					{
						name: 'offense_target',
						description: 'The base target # of your clan.',
						type: ApplicationCommandOptionType.Integer,
						required: true,
						min_value: 1,
						max_value: 50
					},
					{
						name: 'notes',
						description: 'Notes to add to the target.',
						type: ApplicationCommandOptionType.String,
						required: false
					},
					{
						name: 'hours',
						description: 'The number of hours to set the target for.',
						type: ApplicationCommandOptionType.Number,
						required: false
					}
				]
			},
			{
				name: 'clear',
				description: 'Clear the target for a player in the current war.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'defense_target',
						description: 'The base target # of your opponent.',
						type: ApplicationCommandOptionType.Number,
						required: true,
						min_value: 1,
						max_value: 50
					}
				]
			}
		]
	},
	{
		name: 'remaining',
		description: command.remaining.description,
		dm_permission: false,
		description_localizations: translation('command.remaining.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: 'Remaining attacks of a linked user.',
				type: ApplicationCommandOptionType.User,
				required: false
			},
			{
				name: 'player_tag',
				description: 'Remaining attacks of a player.',
				type: ApplicationCommandOptionType.String,
				required: false,
				autocomplete: true
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
		name: 'lineup',
		description: command.lineup.description,
		dm_permission: false,
		description_localizations: translation('command.lineup.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				type: ApplicationCommandOptionType.String,
				autocomplete: true,
				required: false
			},
			{
				name: 'user',
				description: common.options.user.description,
				description_localizations: translation('common.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'warlog',
		description: command.warlog.description,
		dm_permission: false,
		description_localizations: translation('command.warlog.description'),
		options: [
			{
				name: 'tag',
				description: common.options.tag.description,
				description_localizations: translation('common.options.tag.description'),
				autocomplete: true,
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'user',
				description: common.options.user.description,
				description_localizations: translation('common.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	},
	{
		name: 'history',
		description: 'Clan Games, Capital Raids, Donations, and CWL attacks history.',
		dm_permission: false,
		options: [
			{
				name: 'option',
				required: true,
				description: 'Select an option.',
				type: ApplicationCommandOptionType.String,
				choices: [
					{
						name: 'Clan Games',
						value: 'clan-games'
					},
					{
						name: 'Capital Raids',
						value: 'capital-raids'
					},
					{
						name: 'Capital Contribution',
						value: 'capital-contribution'
					},
					{
						name: 'CWL Attacks',
						value: 'cwl-attacks'
					},
					{
						name: 'War Attacks',
						value: 'war-attacks'
					},
					{
						name: 'Donations/Received',
						value: 'donations'
					},
					{
						name: 'Attacks/Defenses',
						value: 'attacks'
					},
					{
						name: 'Loot (Gold/Elixir/Dark)',
						value: 'loot'
					},
					{
						name: 'Join/Leave',
						value: 'join-leave'
					}
				]
			},
			{
				name: 'clans',
				autocomplete: true,
				description: 'View the war history of a clan.',
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'player_tag',
				autocomplete: true,
				description: 'View the CWL history of a player.',
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'user',
				description: 'View the war history of a player.',
				type: ApplicationCommandOptionType.User
			}
		]
	},
	{
		name: 'cwl',
		description: command.cwl.description,
		dm_permission: false,
		description_localizations: translation('command.cwl.description'),
		options: [
			{
				name: 'roster',
				description: 'CWL Roster',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					}
				]
			},
			{
				name: 'round',
				description: 'CWL Round',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					}
				]
			},
			{
				name: 'lineup',
				description: 'CWL Lineup',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					}
				]
			},
			{
				name: 'stars',
				description: 'CWL Stars',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					}
				]
			},
			{
				name: 'attacks',
				description: 'CWL Attacks',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					}
				]
			},
			{
				name: 'stats',
				description: 'CWL Stats',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					}
				]
			},
			{
				name: 'members',
				description: 'CWL Members',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'tag',
						description: common.options.tag.description,
						description_localizations: translation('common.options.tag.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					}
				]
			}
		]
	},

	// -------------- SETUP BASED--------------
	{
		name: 'link',
		description: command.link.description,
		dm_permission: false,
		description_localizations: translation('command.link.description'),
		options: [
			{
				name: 'create',
				description: command.link.create.description,
				description_localizations: translation('command.link.create.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'player_tag',
						description: 'The player tag to link.',
						required: false,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'clan_tag',
						description: 'The default clan tag to link.',
						required: false,
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
								name_localizations: translation('common.choices.yes'),
								value: 'true'
							},
							{
								name: 'No',
								name_localizations: translation('common.choices.no'),
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
						type: ApplicationCommandOptionType.String,
						autocomplete: true
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
						name: 'player_tag',
						description: 'The player tag to unlink.',
						required: false,
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'clan_tag',
						description: 'The clan tag to unlink.',
						required: false,
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},
	{
		name: 'timezone',
		description: command.timezone.description,
		dm_permission: false,
		description_localizations: translation('command.timezone.description'),
		options: [
			{
				name: 'location',
				description: 'Search timezone by city or country. (e.g. London, New York, Singapore, India, Sydney)',
				type: ApplicationCommandOptionType.String,
				// autocomplete: true,
				required: true
			}
		]
	},
	{
		name: 'flag',
		description: command.flag.description,
		dm_permission: false,
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
				type: ApplicationCommandOptionType.Subcommand
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
					},
					{
						// TODO: Translate
						name: 'id',
						description: 'Flag ID',
						type: ApplicationCommandOptionType.String,
						required: false
					}
				]
			}
		]
	},
	{
		name: 'setup',
		description: command.setup.description,
		dm_permission: false,
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
								name: 'Server Link',
								value: 'server-link'
							},
							{
								name: 'Channel Link',
								value: 'channel-link'
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
								name: 'Legend Log',
								value: 'legend-log'
							},
							{
								name: 'Capital Log',
								value: 'capital-log'
							},
							{
								name: 'Clan Feed',
								value: 'clan-feed'
							},
							{
								name: 'Join/Leave Log',
								value: 'join-leave'
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
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'channel',
						description: command.setup.enable.options.channel.description,
						description_localizations: translation('command.setup.enable.options.channel.description'),
						type: ApplicationCommandOptionType.Channel,
						channel_types: ChannelTypes
					},
					{
						name: 'color',
						name_localizations: {
							'en-GB': 'colour'
						},
						description: command.setup.enable.options.color.description,
						description_localizations: translation('command.setup.enable.options.color.description'),
						type: ApplicationCommandOptionType.String
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
				name: 'utils',
				description: 'Setup some other utility features.',
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
								name: 'Link Button',
								value: 'link-button'
							},
							{
								name: 'Events Schedular',
								value: 'events-schedular'
							}
						]
					},
					{
						name: 'max_duration',
						description: 'Maximum duration of the events in minutes.',
						type: ApplicationCommandOptionType.Integer,
						required: false,
						max_value: 60,
						min_value: 10
					},
					{
						name: 'disable',
						description: 'Disable the events schedular.',
						type: ApplicationCommandOptionType.String,
						required: false,
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
								name: 'Delete Clan',
								value: 'remove-clan'
							},
							{
								name: 'Clan Feed',
								value: 'clan-feed'
							},
							{
								name: 'Join/Leave Log',
								value: 'join-leave'
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
								name: 'Legend Log',
								value: 'legend-log'
							},
							{
								name: 'Capital Log',
								value: 'capital-log'
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
						autocomplete: true,
						description: command.setup.disable.options.tag.description,
						description_localizations: translation('command.setup.disable.options.tag.description'),
						type: ApplicationCommandOptionType.String,
						required: true
					},
					{
						name: 'channel',
						description: command.setup.disable.options.channel.description,
						channel_types: ChannelTypes,
						description_localizations: translation('command.setup.disable.options.channel.description'),
						type: ApplicationCommandOptionType.Channel
					}
				]
			}
		]
	},
	{
		name: 'alias',
		description: command.alias.description,
		dm_permission: false,
		description_localizations: translation('command.alias.description'),
		options: [
			{
				name: 'create',
				description: command.alias.create.description,
				description_localizations: translation('command.alias.create.description'),
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clan',
						description: command.alias.create.options.tag.description,
						description_localizations: translation('command.alias.create.options.tag.description'),
						required: true,
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'name',
						required: true,
						max_length: 6,
						description: command.alias.create.options.name.description,
						description_localizations: translation('command.alias.create.options.name.description'),
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
						name: 'alias',
						description: command.alias.delete.options.name.description,
						description_localizations: translation('command.alias.delete.options.name.description'),
						required: true,
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},
	{
		name: 'roster',
		description: 'Comprehensive roster management system.',
		dm_permission: false,
		options: [
			{
				name: 'create',
				description: 'Create a roster for your clan.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clan',
						description: 'Clan of the roster.',
						autocomplete: true,
						required: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'name',
						description: 'Name of the roster.',
						required: true,
						max_length: 30,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'import_members',
						description: 'Whether to import members from the clan.',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'allow_unlinked',
						description: 'Whether to allow unlinked members to join.',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'max_members',
						min_value: 5,
						max_value: 65,
						description: 'Size of the roster.',
						type: ApplicationCommandOptionType.Integer
					},
					{
						name: 'min_town_hall',
						description: 'Minimum Town Hall level of the roster.',
						type: ApplicationCommandOptionType.Integer,
						min_value: 2,
						max_value: MAX_TOWN_HALL_LEVEL
					},
					{
						name: 'max_town_hall',
						description: 'Maximum Town Hall level of the roster.',
						type: ApplicationCommandOptionType.Integer,
						min_value: 2,
						max_value: MAX_TOWN_HALL_LEVEL
					},
					{
						name: 'min_hero_level',
						min_value: 0,
						description: 'Minimum combined Hero level of the roster.',
						type: ApplicationCommandOptionType.Integer
					},
					{
						name: 'roster_role',
						description: 'Role of the roster.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'sort_by',
						description: 'Sorting order of the roster member list.',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Player Name',
								value: 'PLAYER_NAME'
							},
							{
								name: 'Discord Username',
								value: 'DISCORD_NAME'
							},
							{
								name: 'Town Hall Level',
								value: 'TOWN_HALL_LEVEL'
							},
							{
								name: 'Hero Levels',
								value: 'HERO_LEVEL'
							},
							{
								name: 'TH + Hero Levels',
								value: 'TH_HERO_LEVEL'
							},
							{
								name: 'Clan Name',
								value: 'CLAN_NAME'
							},
							{
								name: 'Signup Time',
								value: 'SIGNUP_TIME'
							}
						]
					},
					{
						name: 'layout',
						description: 'Layout of the roster.',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: '#/TH_ICON/DISCORD/NAME/CLAN',
								value: '#/TH_ICON/DISCORD/NAME/CLAN'
							},
							{
								name: 'TH/DISCORD/NAME/CLAN',
								value: 'TH/DISCORD/NAME/CLAN'
							}
						]
					},
					{
						name: 'start_time',
						description: 'Start time of the roster (YYYY-MM-DD HH:mm, in 24 hours format)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'end_time',
						description: 'End time of the roster (YYYY-MM-DD HH:mm, in 24 hours format)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'timezone',
						autocomplete: true,
						description: 'Search timezone by city or country. (e.g. London, New York, Singapore, India, Sydney)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'allow_group_selection',
						description: 'Whether to allow members to select group.',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'allow_multi_signup',
						description: 'Whether to allow multiple rosters signup.',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'use_clan_alias',
						description: 'Whether to use clan alias in the roster (created by /alias command)',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'color_code',
						description: 'Hex color code of the roster embed.',
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'post',
				description: 'Post a roster to signup or view members.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'roster',
						autocomplete: true,
						required: true,
						description: 'Select a roster to post.',
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'clone',
				description: 'Clone a roster to create a new one.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'roster',
						autocomplete: true,
						required: true,
						description: 'Select a roster to post.',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'name',
						description: 'Name of the roster.',
						max_length: 30,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: 'Search rosters or list all rosters and groups.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'name',
						description: 'Search rosters by name.',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: 'Search rosters by user.',
						type: ApplicationCommandOptionType.User
					},
					{
						name: 'player_tag',
						description: 'Search rosters by player.',
						type: ApplicationCommandOptionType.String,
						autocomplete: true
					},
					{
						name: 'clan',
						description: 'Search rosters by clan.',
						type: ApplicationCommandOptionType.String,
						autocomplete: true
					}
				]
			},
			{
				name: 'edit',
				description: 'Edit a roster and its settings.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'roster',
						description: 'Select a roster to edit.',
						required: true,
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'name',
						description: 'Name of the roster.',
						max_length: 30,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'clan',
						description: 'Clan of the roster.',
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'allow_unlinked',
						description: 'Whether to allow unlinked members to join.',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'max_members',
						description: 'Size of the roster.',
						max_value: 65,
						min_value: 5,
						type: ApplicationCommandOptionType.Integer
					},
					{
						name: 'min_town_hall',
						max_value: MAX_TOWN_HALL_LEVEL,
						min_value: 2,
						description: 'Minimum Town Hall level of the roster.',
						type: ApplicationCommandOptionType.Integer
					},
					{
						name: 'max_town_hall',
						description: 'Maximum Town Hall level of the roster.',
						type: ApplicationCommandOptionType.Integer,
						min_value: 2,
						max_value: MAX_TOWN_HALL_LEVEL
					},
					{
						name: 'min_hero_level',
						min_value: 0,
						description: 'Minimum combined Hero level of the roster.',
						type: ApplicationCommandOptionType.Integer
					},
					{
						name: 'roster_role',
						description: 'Role of the roster.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'layout',
						description: 'Layout of the roster.',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: '#/TH_ICON/DISCORD/NAME/CLAN',
								value: '#/TH_ICON/DISCORD/NAME/CLAN'
							},
							{
								name: 'TH/DISCORD/NAME/CLAN',
								value: 'TH/DISCORD/NAME/CLAN'
							}
						]
					},
					{
						name: 'sort_by',
						description: 'Sorting order of the roster member list.',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Player Name',
								value: 'PLAYER_NAME'
							},
							{
								name: 'Discord Username',
								value: 'DISCORD_NAME'
							},
							{
								name: 'Town Hall Level',
								value: 'TOWN_HALL_LEVEL'
							},
							{
								name: 'Hero Levels',
								value: 'HERO_LEVEL'
							},
							{
								name: 'TH + Hero Levels',
								value: 'TH_HERO_LEVEL'
							},
							{
								name: 'Clan Name',
								value: 'CLAN_NAME'
							},
							{
								name: 'Signup Time',
								value: 'SIGNUP_TIME'
							}
						]
					},
					{
						name: 'delete_role',
						description: 'Whether to delete the role of the roster.',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'start_time',
						description: 'Start time of the roster (YYYY-MM-DD HH:mm, in 24 hours format)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'end_time',
						description: 'End time of the roster (YYYY-MM-DD HH:mm, in 24 hours format)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'timezone',
						autocomplete: true,
						description: 'Search timezone by city or country. (e.g. London, New York, Singapore, India, Sydney)',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'allow_group_selection',
						description: 'Whether to allow members to select group.',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'allow_multi_signup',
						description: 'Whether to allow multiple rosters signup.',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'use_clan_alias',
						description: 'Whether to use clan alias in the roster (created by /alias command)',
						type: ApplicationCommandOptionType.Boolean
					},
					{
						name: 'color_code',
						description: 'Hex color code of the roster embed.',
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'delete',
				description: 'Permanently delete a roster.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'roster',
						description: 'Select a roster to delete.',
						required: true,
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'manage',
				description: 'Add or remove users or change their group or roster.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'roster',
						description: 'Select a roster to manage.',
						required: true,
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'action',
						description: 'Select an action to perform.',
						required: true,
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Add User',
								value: 'add-user'
							},
							{
								name: 'Remove User',
								value: 'del-user'
							},
							{
								name: 'Change Roster',
								value: 'change-roster'
							},
							{
								name: 'Change Group',
								value: 'change-category'
							}
						]
					},
					{
						name: 'player_tag',
						autocomplete: true,
						description: 'Select a player to manage.',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'user',
						description: 'Select a user to manage.',
						type: ApplicationCommandOptionType.User
					},
					{
						name: 'target_group',
						autocomplete: true,
						description: 'Group of the user to move to.',
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'target_roster',
						autocomplete: true,
						description: 'Roster to move the user to.',
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'groups',
				description: 'Manage user groups of the rosters.',
				type: ApplicationCommandOptionType.SubcommandGroup,
				options: [
					{
						name: 'create',
						description: 'Create a user group.',
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: 'name',
								description: 'Name of the user group.',
								required: true,
								max_length: 30,
								type: ApplicationCommandOptionType.String
							},
							{
								name: 'group_role',
								description: 'Role of the user group.',
								type: ApplicationCommandOptionType.Role
							},
							{
								name: 'selectable',
								description: 'Whether to allow members to select this group.',
								type: ApplicationCommandOptionType.Boolean
							}
						]
					},
					{
						name: 'modify',
						description: 'Modify or delete a user group.',
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: 'group',
								autocomplete: true,
								required: true,
								description: 'Select a group to modify.',
								type: ApplicationCommandOptionType.String
							},
							{
								name: 'name',
								description: 'Name of the user group.',
								max_length: 30,
								type: ApplicationCommandOptionType.String
							},
							{
								name: 'group_role',
								description: 'Role of the user group.',
								type: ApplicationCommandOptionType.Role
							},
							{
								name: 'selectable',
								description: 'Whether to allow members to select this group.',
								type: ApplicationCommandOptionType.Boolean
							},
							{
								name: 'delete_role',
								description: 'Whether to delete the role of the group.',
								type: ApplicationCommandOptionType.Boolean
							},
							{
								name: 'delete_group',
								description: 'Whether to delete the user group.',
								type: ApplicationCommandOptionType.Boolean
							}
						]
					}
				]
			}
		]
	},
	{
		name: 'autorole',
		description: 'Enable automatic clan roles and Town Hall roles.',
		dm_permission: false,
		options: [
			{
				name: 'clan-roles',
				description: 'Enable automatic clan roles.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'member',
						required: true,
						description: command.autorole.clan_roles.options.member.description,
						description_localizations: translation('command.autorole.clan_roles.options.member.description'),
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'elder',
						required: true,
						description: command.autorole.clan_roles.options.elder.description,
						description_localizations: translation('command.autorole.clan_roles.options.elder.description'),
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'co_lead',
						required: true,
						description: command.autorole.clan_roles.options.co_lead.description,
						description_localizations: translation('command.autorole.clan_roles.options.co_lead.description'),
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'leader',
						required: true,
						description: command.autorole.clan_roles.options.leader.description,
						description_localizations: translation('command.autorole.clan_roles.options.leader.description'),
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'clans',
						required: true,
						autocomplete: true,
						description: command.autorole.clan_roles.options.clans.description,
						description_localizations: translation('command.autorole.clan_roles.options.clans.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'common_role',
						required: false,
						description: command.autorole.clan_roles.options.common_role.description,
						description_localizations: translation('command.autorole.clan_roles.options.common_role.description'),
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'only_verified',
						required: false,
						description: command.autorole.clan_roles.options.only_verified.description,
						description_localizations: translation('command.autorole.clan_roles.options.only_verified.description'),
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
				name: 'town-hall',
				description: 'Manage automatic Town Hall roles.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'th_3',
						description: 'Town Hall 3 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_4',
						description: 'Town Hall 4 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_5',
						description: 'Town Hall 5 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_6',
						description: 'Town Hall 6 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_7',
						description: 'Town Hall 7 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_8',
						description: 'Town Hall 8 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_9',
						description: 'Town Hall 9 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_10',
						description: 'Town Hall 10 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_11',
						description: 'Town Hall 11 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_12',
						description: 'Town Hall 12 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_13',
						description: 'Town Hall 13 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_14',
						description: 'Town Hall 14 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'th_15',
						description: 'Town Hall 15 role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'allow_external_accounts',
						description: 'Whether to give roles for the accounts that are not in the family clans.',
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
				name: 'leagues',
				description: 'Set leagues roles.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'unranked',
						description: 'Unranked league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'bronze',
						description: 'Bronze league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'silver',
						description: 'Silver league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'gold',
						description: 'Gold league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'crystal',
						description: 'Crystal league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'master',
						description: 'Master league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'champion',
						description: 'Champion league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'titan',
						description: 'Titan league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'legend',
						description: 'Legend league role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'allow_external_accounts',
						description: 'Whether to give roles for the accounts that are not in the family clans.',
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
				name: 'wars',
				description: 'Set automatic war roles.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'role',
						required: true,
						description: 'The war role.',
						type: ApplicationCommandOptionType.Role
					},
					{
						name: 'clan_tag',
						required: true,
						autocomplete: true,
						type: ApplicationCommandOptionType.String,
						description: 'The clan for which to set the war role.'
					}
				]
			},
			{
				name: 'disable',
				description: 'Disable automatic clan roles.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'type',
						description: 'Type of roles to disable.',
						required: true,
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Clan Roles',
								value: 'clan-roles'
							},
							{
								name: 'Town Hall',
								value: 'town-hall'
							},
							{
								name: 'Leagues',
								value: 'leagues'
							},
							{
								name: 'Wars',
								value: 'wars'
							}
						]
					},
					{
						name: 'clans',
						autocomplete: true,
						description: command.autorole.disable.options.clans.description,
						description_localizations: translation('command.autorole.disable.options.clans.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'clear',
						description: command.autorole.disable.options.clear.description,
						description_localizations: translation('command.autorole.disable.options.clear.description'),
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
				name: 'refresh',
				description: 'Refresh automatic clan roles.',
				type: ApplicationCommandOptionType.Subcommand
			}
		]
	},
	{
		name: 'reminders',
		description: 'Setup reminders for clan wars, capital raids.',
		dm_permission: false,
		description_localizations: translation('command.reminders.description'),
		options: [
			{
				name: 'create',
				description: 'Create reminders for clan wars, clan games or capital raids.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'type',
						description: 'Type of the reminder?',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Clan Wars',
								value: 'clan-wars'
							},
							{
								name: 'Capital Raids',
								value: 'capital-raids'
							},
							{
								name: 'Clan Games',
								value: 'clan-games'
							}
						],
						required: true
					},
					{
						name: 'duration',
						description: 'Remaining duration to mention members (e.g. 6h, 12h, 1d, 2d)',
						type: ApplicationCommandOptionType.String,
						required: true,
						autocomplete: true
					},
					{
						name: 'message',
						description: command.reminders.create.options.message.description,
						description_localizations: translation('command.reminders.create.options.message.description'),
						type: ApplicationCommandOptionType.String,
						required: true
					},
					{
						name: 'clans',
						required: true,
						autocomplete: true,
						description: command.reminders.create.options.clans.description,
						description_localizations: translation('command.reminders.create.options.clans.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'channel',
						description: command.reminders.create.options.channel.description,
						description_localizations: translation('command.reminders.create.options.channel.description'),
						type: ApplicationCommandOptionType.Channel,
						channel_types: ChannelTypes
					}
				]
			},
			{
				name: 'edit',
				description: 'Edit a reminder by ID (do /reminders list to get the ID)',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'type',
						description: 'Type of the reminder?',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Clan Wars',
								value: 'clan-wars'
							},
							{
								name: 'Capital Raids',
								value: 'capital-raids'
							},
							{
								name: 'Clan Games',
								value: 'clan-games'
							}
						],
						required: true
					},
					{
						name: 'id',
						required: true,
						description: 'Reminder ID',
						type: ApplicationCommandOptionType.String
					}
				]
			},
			{
				name: 'list',
				description: 'List all reminders.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'type',
						required: true,
						description: 'Type of the reminder?',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Clan Wars',
								value: 'clan-wars'
							},
							{
								name: 'Capital Raids',
								value: 'capital-raids'
							},
							{
								name: 'Clan Games',
								value: 'clan-games'
							}
						]
					}
				]
			},
			{
				name: 'delete',
				description: 'Delete a reminder by ID (do /reminders list to get the ID)',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'type',
						description: 'Type of the reminder?',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Clan Wars',
								value: 'clan-wars'
							},
							{
								name: 'Capital Raids',
								value: 'capital-raids'
							},
							{
								name: 'Clan Games',
								value: 'clan-games'
							}
						],
						required: true
					},
					{
						name: 'id',
						description: command.reminders.delete.options.id.description,
						description_localizations: translation('command.reminders.delete.options.id.description'),
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'clear',
						description: command.reminders.delete.options.clear.description,
						description_localizations: translation('command.reminders.delete.options.clear.description'),
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Yes',
								name_localizations: translation('common.choices.yes'),
								value: 'true'
							},
							{
								name: 'No',
								name_localizations: translation('common.choices.no'),
								value: 'false'
							}
						]
					}
				]
			},
			{
				name: 'now',
				description: 'Create an instant reminder to notify members.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'type',
						description: 'Type of the reminder?',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Clan Wars',
								value: 'clan-wars'
							},
							{
								name: 'Capital Raids',
								value: 'capital-raids'
							},
							{
								name: 'Clan Games',
								value: 'clan-games'
							}
						],
						required: true
					},
					{
						name: 'message',
						description: command.reminders.now.options.message.description,
						description_localizations: translation('command.reminders.now.options.message.description'),
						type: ApplicationCommandOptionType.String,
						required: true
					},
					{
						name: 'clans',
						required: true,
						autocomplete: true,
						description: command.reminders.now.options.clans.description,
						description_localizations: translation('command.reminders.now.options.clans.description'),
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},

	// -------- OTHER COMMANDS--------
	{
		name: 'legend',
		dm_permission: false,
		description: 'Shows legend logs for a player.',
		options: [
			{
				name: 'attacks',
				description: 'Shows per-day legend attacks for a clan.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clan_tag',
						description: 'Enter a tag or pick one form the autocomplete list.',
						type: ApplicationCommandOptionType.String,
						required: false,
						autocomplete: true
					},
					{
						name: 'user',
						description: common.options.player.user.description,
						description_localizations: translation('common.options.player.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					},
					{
						name: 'day',
						description: 'The league day.',
						type: ApplicationCommandOptionType.Number,
						max_value: 35,
						min_value: 1,
						required: false
					}
				]
			},
			{
				name: 'days',
				description: 'Shows per-day legend attacks for a player.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'player_tag',
						description: 'Enter a tag or pick one form the autocomplete list.',
						type: ApplicationCommandOptionType.String,
						required: false,
						autocomplete: true
					},
					{
						name: 'user',
						description: common.options.user.description,
						description_localizations: translation('common.options.user.description'),
						type: ApplicationCommandOptionType.User,
						required: false
					},
					{
						name: 'day',
						description: 'The league day.',
						type: ApplicationCommandOptionType.Number,
						max_value: 35,
						min_value: 1,
						required: false
					}
				]
			},
			{
				name: 'leaderboard',
				description: 'Shows legend leaderboard.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						autocomplete: true,
						description: 'Enter a tag or pick one form the autocomplete list.',
						type: ApplicationCommandOptionType.String,
						required: false
					},
					{
						name: 'limit',
						description: 'Limit the number of results.',
						type: ApplicationCommandOptionType.Number,
						max_value: 100,
						min_value: 3
					}
				]
			}
		]
	},
	{
		name: 'summary',
		description: 'Shows summary of the clan family.',
		dm_permission: false,
		options: [
			{
				name: 'best',
				description: 'Shows a summary of best members.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						required: false,
						autocomplete: true,
						type: ApplicationCommandOptionType.String,
						description: 'Clan tags or aliases.'
					},
					{
						name: 'season',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: command.summary.options.season.description,
						choices: getSeasonIds()
					},
					{
						name: 'limit',
						required: false,
						type: ApplicationCommandOptionType.Integer,
						description: 'Number of members to show (Default: 5)',
						min_value: 3,
						max_value: 10
					},
					{
						name: 'order',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: 'Order of the list.',
						choices: [
							{
								name: 'Descending',
								value: 'desc'
							},
							{
								name: 'Ascending',
								value: 'asc'
							}
						]
					}
				]
			},
			{
				name: 'wars',
				description: 'Shows a summary of current wars.',
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'cwl-ranks',
				description: 'Shows a summary of CWL ranks.',
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'leagues',
				description: 'Shows a summary of clan leagues.',
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'donations',
				description: 'Shows a summary of donations.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'season',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: command.summary.options.season.description,
						choices: getSeasonIds()
					},
					{
						name: 'clans',
						required: false,
						autocomplete: true,
						type: ApplicationCommandOptionType.String,
						description: 'Clan tags or aliases to filter clans.'
					}
				]
			},
			{
				name: 'clans',
				description: 'Shows a summary of family clans.',
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'attacks',
				description: 'Shows a summary of multiplayer attacks and defenses.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'season',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: command.summary.options.season.description,
						choices: getSeasonIds()
					}
				]
			},
			{
				name: 'trophies',
				description: 'Shows a summary of trophies.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'limit',
						required: false,
						type: ApplicationCommandOptionType.Integer,
						description: 'Limit the number of members.'
					}
				]
			},
			{
				name: 'war-results',
				description: 'Shows a summary of war results.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'season',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: command.summary.options.season.description,
						choices: getSeasonIds()
					}
				]
			},
			{
				name: 'missed-wars',
				description: 'Shows a summary of missed wars.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						required: false,
						autocomplete: true,
						type: ApplicationCommandOptionType.String,
						description: 'Clan tags or aliases.'
					},
					{
						name: 'season',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: command.summary.options.season.description,
						choices: getSeasonIds()
					}
				]
			},
			{
				name: 'capital-raids',
				description: 'Shows information about capital raids.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						required: false,
						autocomplete: true,
						type: ApplicationCommandOptionType.String,
						description: 'Clan tags or aliases.'
					},
					{
						name: 'week',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: 'The week to show raids for.',
						choices: getWeekIds()
					}
				]
			},
			{
				name: 'capital-contribution',
				description: 'Shows a summary of capital contributions.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						required: false,
						autocomplete: true,
						type: ApplicationCommandOptionType.String,
						description: 'Clan tags or aliases.'
					},
					{
						name: 'season',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: command.summary.options.season.description,
						choices: getSeasonIds()
					},
					{
						name: 'week',
						description: 'The week to show capital contributions for.',
						type: ApplicationCommandOptionType.String,
						required: false,
						choices: getWeekIds()
					}
				]
			},
			{
				name: 'activity',
				description: 'Shows a summary of clan activities (last seen).',
				type: ApplicationCommandOptionType.Subcommand
			},
			{
				name: 'clan-games',
				description: 'Shows a summary of clan games scores.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'season',
						required: false,
						type: ApplicationCommandOptionType.String,
						description: command.summary.options.season.description,
						choices: getSeasonIds()
					},
					{
						name: 'clans',
						required: false,
						autocomplete: true,
						type: ApplicationCommandOptionType.String,
						description: 'Clan tags or aliases to filter clans.'
					}
				]
			}
		]
	},
	{
		name: 'export',
		description: command.export.description,
		dm_permission: false,
		description_localizations: translation('command.export.description'),
		options: [
			{
				name: 'wars',
				description: 'Export war stats.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						description: command.export.options.clans.description,
						description_localizations: translation('command.export.options.clans.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'war_type',
						description: 'Regular or friendly wars (default: regular)',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Regular',
								value: 'regular'
							},
							{
								name: 'Friendly',
								value: 'friendly'
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
						name: 'limit',
						description: command.export.options.wars.description,
						description_localizations: translation('command.export.options.wars.description'),
						type: ApplicationCommandOptionType.Integer
					}
				]
			},
			{
				name: 'cwl',
				description: 'Export CWL wars stats.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						description: command.export.options.clans.description,
						description_localizations: translation('command.export.options.clans.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'season',
						description: command.export.options.season.description,
						description_localizations: translation('command.export.options.season.description'),
						type: ApplicationCommandOptionType.String,
						choices: getSeasonIds()
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
				name: 'season',
				description: 'Export season stats of the clan family.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						description: command.export.options.clans.description,
						description_localizations: translation('command.export.options.clans.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'season',
						description: command.export.options.season.description,
						description_localizations: translation('command.export.options.season.description'),
						type: ApplicationCommandOptionType.String,
						choices: getSeasonIds()
					}
				]
			},
			{
				name: 'members',
				description: 'Export clan members.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						description: command.export.options.clans.description,
						description_localizations: translation('command.export.options.clans.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'season',
						description: command.export.options.season.description,
						description_localizations: translation('command.export.options.season.description'),
						type: ApplicationCommandOptionType.String,
						choices: getSeasonIds()
					}
				]
			},
			{
				name: 'missed',
				description: 'Export missed attack history.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
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
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'limit',
						description: command.export.options.wars.description,
						description_localizations: translation('command.export.options.wars.description'),
						type: ApplicationCommandOptionType.Integer
					}
				]
			},
			{
				name: 'capital-raids',
				description: '[Experimental] Export capital raid attack stats.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
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
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'limit',
						description: command.export.options.wars.description,
						description_localizations: translation('command.export.options.wars.description'),
						type: ApplicationCommandOptionType.Integer
					}
				]
			},
			{
				name: 'last-wars',
				description: 'Export participation history (last played wars)',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						description: command.export.options.clans.description,
						description_localizations: translation('command.export.options.clans.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					},
					{
						name: 'war_type',
						description: 'Regular or CWL',
						type: ApplicationCommandOptionType.String,
						choices: [
							{
								name: 'Regular',
								value: 'regular'
							},
							{
								name: 'CWL',
								value: 'cwl'
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
						name: 'limit',
						description: command.export.options.wars.description,
						description_localizations: translation('command.export.options.wars.description'),
						type: ApplicationCommandOptionType.Integer
					}
				]
			},
			{
				name: 'capital',
				description: 'Export clan capital weekends.',
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: 'clans',
						description: command.export.options.clans.description,
						description_localizations: translation('command.export.options.clans.description'),
						autocomplete: true,
						type: ApplicationCommandOptionType.String
					}
				]
			}
		]
	},
	{
		name: 'search',
		description: command.search.description,
		dm_permission: false,
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
		name: 'army',
		description: command.army.description,
		dm_permission: false,
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
			},
			{
				name: 'clan_castle',
				description: 'Optional clan castle troops.',
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	},
	{
		name: 'nickname',
		description: command.nickname.description,
		dm_permission: false,
		description_localizations: translation('command.nickname.description'),
		options: [
			{
				name: 'user',
				description: command.nickname.options.user.description,
				description_localizations: translation('command.nickname.options.user.description'),
				type: ApplicationCommandOptionType.User,
				required: true
			},
			{
				name: 'format',
				description: 'Set nickname to a custom format (e.g. {CLAN} | {ALIAS} | {TH} | {ROLE} | {NAME})',
				type: ApplicationCommandOptionType.String
			},
			{
				name: 'enable_auto',
				description: 'Enable automatic nickname updates.',
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
			},
			{
				name: 'update_existing_members',
				description: 'Update nickname for existing members.',
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
		name: 'events',
		description: 'Shows the next in-game events.',
		dm_permission: true
	},

	// ------------- UTIL COMMANDS -------------
	{
		name: 'help',
		description: command.help.description,
		dm_permission: false,
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
		name: 'redeem',
		description: command.redeem.description,
		dm_permission: false,
		options: [
			{
				name: 'disable',
				description: 'Disable subscription for a server (if subscribed)',
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
		],
		description_localizations: translation('command.redeem.description')
	},
	{
		name: 'invite',
		description: command.invite.description,
		dm_permission: true,
		description_localizations: translation('command.invite.description')
	},
	{
		name: 'debug',
		description: command.debug.description,
		dm_permission: false,
		description_localizations: translation('command.debug.description')
	},
	{
		name: 'config',
		description: command.config.description,
		dm_permission: false,
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
			},
			{
				name: 'manager_role',
				description: command.config.options.manager_role.description,
				description_localizations: translation('command.config.options.manager_role.description'),
				type: ApplicationCommandOptionType.Role
			},
			{
				name: 'webhook_limit',
				description: 'The maximum number of webhooks that can be created in a channel.',
				type: ApplicationCommandOptionType.Integer,
				max_value: 8,
				min_value: 3
			}
		]
	},

	// -------- CONTEXT MENU COMMANDS--------

	{
		name: 'whois',
		type: ApplicationCommandType.User,
		dm_permission: false
	},
	{
		name: 'army',
		type: ApplicationCommandType.Message,
		dm_permission: false
	}
];

export const BETA_COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [];

export const PRIVATE_COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [
	{
		name: 'status',
		description: "Shows information about the bot's status.",
		dm_permission: true
	},
	{
		name: 'patron',
		description: "Shows information about the bot's Patreon.",
		dm_permission: true
	},
	{
		name: 'usage',
		description: "You can't use it anyway, so why explain?",
		dm_permission: true,
		default_member_permissions: '0',
		options: [
			{
				name: 'chart',
				description: 'It does something, yeah?',
				type: ApplicationCommandOptionType.Boolean,
				required: false
			},
			{
				name: 'limit',
				description: 'It does something, yeah?',
				type: ApplicationCommandOptionType.Integer,
				required: false
			}
		]
	},
	{
		name: 'eval',
		description: "You can't use it anyway, so why explain?",
		dm_permission: true,
		default_member_permissions: '0',
		options: [
			{
				name: 'code',
				description: 'Code to evaluate.',
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: 'shard',
				description: 'Whether to run the code on all shards or just the current one.',
				type: ApplicationCommandOptionType.Boolean,
				required: false
			},
			{
				name: 'depth',
				description: 'Depth of the returned object.',
				type: ApplicationCommandOptionType.Number,
				required: false
			}
		]
	}
];
