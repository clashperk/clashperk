import {
  BUILDER_BASE_LEAGUE_NAMES,
  BUILDER_HALL_LEVELS_FOR_ROLES,
  MAX_TOWN_HALL_LEVEL,
  PLAYER_LEAGUE_NAMES,
  TOWN_HALL_LEVELS_FOR_ROLES
} from '@app/constants';
import {
  APIApplicationCommandBasicOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  RESTPostAPIApplicationCommandsJSONBody
} from 'discord.js';
import i18next from 'i18next';
import moment from 'moment';
import { fileURLToPath } from 'node:url';
import { title } from 'radash';
import { command, common } from '../locales/locales.js';
import { MembersCommandOptions, RosterCommandSortOptions, RosterManageActions } from '../src/util/command.options.js';
import { Backend } from '../src/util/i18n.backend.js';
import { defaultOptions, fallbackLng } from '../src/util/i18n.config.js';
import { TranslationKey } from '../src/util/i18n.js';
import { Season } from '../src/util/toolkit.js';

const locales = new URL('../locales/{{lng}}/{{ns}}.json', import.meta.url);
await i18next.use(Backend).init({
  ...defaultOptions,
  backend: { paths: [fileURLToPath(locales)] }
});

function getSeasonIds() {
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

const SEASON_SINCE_CHOICES = getSeasonIds().map((season) => ({ name: `Since ${season.name}`, value: season.value }));

function getWeekIds() {
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
  ChannelType.PrivateThread,
  ChannelType.GuildMedia
];

const IntegrationTypes = {
  GUILD_INSTALL: 0,
  USER_INSTALL: 1
} as const;

const ContextTypes = {
  GUILD: 0,
  BOT_DM: 1,
  PRIVATE_CHANNEL: 2
} as const;

const userInstallable = {
  integration_types: [IntegrationTypes.GUILD_INSTALL, IntegrationTypes.USER_INSTALL],
  contexts: [ContextTypes.GUILD, ContextTypes.BOT_DM, ContextTypes.PRIVATE_CHANNEL]
};

const translation = (text: TranslationKey): Record<string, string> => {
  return Object.keys(fallbackLng).reduce<Record<string, string>>((record, lang) => {
    record[lang] = i18next.t(text, { lng: lang, escapeValue: false });
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
        name: 'tag',
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
    ],
    ...userInstallable
  },
  {
    name: 'units',
    description: command.units.description,
    dm_permission: false,
    description_localizations: translation('command.units.description'),
    options: [
      {
        name: 'player',
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
    ],
    ...userInstallable
  },
  {
    name: 'upgrades',
    description: command.upgrades.description,
    dm_permission: false,
    description_localizations: translation('command.upgrades.description'),
    options: [
      {
        name: 'player',
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
    ],
    ...userInstallable
  },
  {
    name: 'rushed',
    description: command.rushed.description,
    dm_permission: false,
    description_localizations: translation('command.rushed.description'),
    options: [
      {
        name: 'player',
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
        name: 'clan',
        description: command.rushed.options.clan.description,
        description_localizations: translation('command.rushed.options.clan.description'),
        type: ApplicationCommandOptionType.String,
        autocomplete: true
      }
    ],
    ...userInstallable
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
        name: 'player',
        description: common.options.player.tag.description,
        description_localizations: translation('common.options.player.tag.description'),
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
        name: 'player',
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
      },
      {
        name: 'by_player_tag',
        description: command.clan.options.by_player_tag.description,
        description_localizations: translation('command.clan.options.by_player_tag.description'),
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        required: false
      }
    ],
    ...userInstallable
  },
  {
    name: 'compo',
    description: command.compo.description,
    dm_permission: false,
    description_localizations: translation('command.compo.description'),
    options: [
      {
        name: 'clan',
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
        name: 'clan',
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
        name: 'clan',
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
        name: 'limit',
        required: false,
        description: command.activity.options.limit.description,
        description_localizations: translation('command.activity.options.limit.description'),
        type: ApplicationCommandOptionType.Integer,
        max_value: 20,
        min_value: 1
      },
      {
        name: 'timezone',
        required: false,
        autocomplete: true,
        description: command.timezone.options.location.description,
        description_localizations: translation('command.timezone.options.location.description'),
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
        name: 'clan',
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
            name: 'clan',
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
            name: 'clan',
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
        name: 'clan',
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
        name: 'season',
        description: command.attacks.options.season.description,
        description_localizations: translation('command.attacks.options.season.description'),
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: getSeasonIds()
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
        name: 'clan',
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
        name: 'option',
        description: command.members.options.option.description,
        description_localizations: translation('command.members.options.option.description'),
        type: ApplicationCommandOptionType.String,
        choices: [...Object.values(MembersCommandOptions).map((choice) => ({ name: choice.label, value: choice.id }))]
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
            name: 'clan',
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
                name: command.stats.options.type.choices.regular,
                name_localizations: translation('command.stats.options.type.choices.regular'),
                value: 'regular'
              },
              {
                name: command.stats.options.type.choices.cwl,
                name_localizations: translation('command.stats.options.type.choices.cwl'),
                value: 'cwl'
              },
              {
                name: command.stats.options.type.choices.friendly,
                name_localizations: translation('command.stats.options.type.choices.friendly'),
                value: 'friendly'
              },
              {
                name: command.stats.options.type.choices.noFriendly,
                name_localizations: translation('command.stats.options.type.choices.noFriendly'),
                value: 'noFriendly'
              },
              {
                name: command.stats.options.type.choices.noCWL,
                name_localizations: translation('command.stats.options.type.choices.noCWL'),
                value: 'noCWL'
              },
              {
                name: command.stats.options.type.choices.all,
                name_localizations: translation('command.stats.options.type.choices.all'),
                value: 'all'
              }
            ]
          },
          {
            name: 'season',
            description: command.stats.options.season.description,
            description_localizations: translation('command.stats.options.season.description'),
            type: ApplicationCommandOptionType.String,
            choices: SEASON_SINCE_CHOICES
          },
          {
            name: 'days',
            description: command.stats.options.days.description,
            description_localizations: translation('command.stats.options.days.description'),
            type: ApplicationCommandOptionType.Integer,
            min_value: 1,
            max_value: 180
          },
          {
            name: 'wars',
            description: command.stats.options.wars.description,
            description_localizations: translation('command.stats.options.wars.description'),
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
                name: command.stats.options.attempt.choices.fresh,
                name_localizations: translation('command.stats.options.attempt.choices.fresh'),
                value: 'fresh'
              },
              {
                name: command.stats.options.attempt.choices.cleanup,
                name_localizations: translation('command.stats.options.attempt.choices.cleanup'),
                value: 'cleanup'
              }
            ]
          },
          {
            name: 'filter_farm_hits',
            description: command.stats.options.filter_farm_hits.description,
            description_localizations: translation('command.stats.options.filter_farm_hits.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'clan_only',
            description: command.stats.options.clan_only.description,
            description_localizations: translation('command.stats.options.clan_only.description'),
            type: ApplicationCommandOptionType.Boolean,
            required: false
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
            name: 'clan',
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
                name: command.stats.options.type.choices.regular,
                name_localizations: translation('command.stats.options.type.choices.regular'),
                value: 'regular'
              },
              {
                name: command.stats.options.type.choices.cwl,
                name_localizations: translation('command.stats.options.type.choices.cwl'),
                value: 'cwl'
              },
              {
                name: command.stats.options.type.choices.friendly,
                name_localizations: translation('command.stats.options.type.choices.friendly'),
                value: 'friendly'
              },
              {
                name: command.stats.options.type.choices.noFriendly,
                name_localizations: translation('command.stats.options.type.choices.noFriendly'),
                value: 'noFriendly'
              },
              {
                name: command.stats.options.type.choices.noCWL,
                name_localizations: translation('command.stats.options.type.choices.noCWL'),
                value: 'noCWL'
              },
              {
                name: command.stats.options.type.choices.all,
                name_localizations: translation('command.stats.options.type.choices.all'),
                value: 'all'
              }
            ]
          },
          {
            name: 'season',
            description: command.stats.options.season.description,
            description_localizations: translation('command.stats.options.season.description'),
            type: ApplicationCommandOptionType.String,
            choices: SEASON_SINCE_CHOICES
          },
          {
            name: 'attempt',
            description: command.stats.options.attempt.description,
            description_localizations: translation('command.stats.options.attempt.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.stats.options.attempt.choices.fresh,
                name_localizations: translation('command.stats.options.attempt.choices.fresh'),
                value: 'fresh'
              },
              {
                name: command.stats.options.attempt.choices.cleanup,
                name_localizations: translation('command.stats.options.attempt.choices.cleanup'),
                value: 'cleanup'
              }
            ]
          },
          {
            name: 'clan_only',
            description: command.defense.options.clan_only.description,
            description_localizations: translation('command.defense.options.clan_only.description'),
            type: ApplicationCommandOptionType.Boolean,
            required: false
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
        name: 'clan',
        description: common.options.tag.description,
        description_localizations: translation('common.options.tag.description'),
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        required: false
      },
      {
        name: 'user',
        description: command.donations.options.user.description,
        description_localizations: translation('command.donations.options.user.description'),
        type: ApplicationCommandOptionType.User,
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
    name: 'war',
    description: command.war.description,
    dm_permission: false,
    description_localizations: translation('command.war.description'),
    options: [
      {
        name: 'clan',
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
    description: command.caller.description,
    description_localizations: translation('command.caller.description'),
    dm_permission: false,
    options: [
      {
        name: 'assign',
        description: command.caller.options.assign.description,
        description_localizations: translation('command.caller.options.assign.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'defense_target',
            description: command.caller.options.assign.options.defense_target.description,
            description_localizations: translation('command.caller.options.assign.options.defense_target.description'),
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 1,
            max_value: 50
          },
          {
            name: 'offense_target',
            description: command.caller.options.assign.options.offense_target.description,
            description_localizations: translation('command.caller.options.assign.options.offense_target.description'),
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 1,
            max_value: 50
          },
          {
            name: 'notes',
            description: command.caller.options.assign.options.notes.description,
            description_localizations: translation('command.caller.options.assign.options.notes.description'),
            type: ApplicationCommandOptionType.String,
            required: false
          },
          {
            name: 'hours',
            description: command.caller.options.assign.options.hours.description,
            description_localizations: translation('command.caller.options.assign.options.hours.description'),
            type: ApplicationCommandOptionType.Number,
            required: false
          }
        ]
      },
      {
        name: 'clear',
        description: command.caller.options.clear.description,
        description_localizations: translation('command.caller.options.clear.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'defense_target',
            description: command.caller.options.clear.options.defense_target.description,
            name_localizations: translation('command.caller.options.clear.options.defense_target.description'),
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
        name: 'clan',
        description: common.options.clan.tag.description,
        description_localizations: translation('common.options.clan.tag.description'),
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        required: false
      },
      {
        name: 'type',
        description: command.remaining.options.type.description,
        description_localizations: translation('command.remaining.options.type.description'),
        type: ApplicationCommandOptionType.String,
        choices: [
          {
            name: command.remaining.options.type.choices.war_attacks,
            name_localizations: translation('command.remaining.options.type.choices.war_attacks'),
            value: 'war-attacks'
          },
          {
            name: command.remaining.options.type.choices.clan_games,
            name_localizations: translation('command.remaining.options.type.choices.clan_games'),
            value: 'clan-games'
          },
          {
            name: command.remaining.options.type.choices.capital_raids,
            name_localizations: translation('command.remaining.options.type.choices.capital_raids'),
            value: 'capital-raids'
          }
        ]
      },
      {
        name: 'player',
        description: command.remaining.options.player.description,
        description_localizations: translation('command.remaining.options.player.description'),
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true
      },
      {
        name: 'user',
        description: command.remaining.options.user.description,
        description_localizations: translation('command.remaining.options.user.description'),
        type: ApplicationCommandOptionType.User,
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
    name: 'lineup',
    description: command.lineup.description,
    dm_permission: false,
    description_localizations: translation('command.lineup.description'),
    options: [
      {
        name: 'clan',
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
        name: 'clan',
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
    description: command.history.description,
    description_localizations: translation('command.history.description'),
    dm_permission: false,
    options: [
      {
        name: 'option',
        required: true,
        description: command.history.options.option.description,
        description_localizations: translation('command.history.options.option.description'),
        type: ApplicationCommandOptionType.String,
        choices: [
          {
            name: command.history.options.option.choices.clan_games,
            name_localizations: translation('command.history.options.option.choices.clan_games'),
            value: 'clan-games'
          },
          {
            name: command.history.options.option.choices.capital_raids,
            name_localizations: translation('command.history.options.option.choices.capital_raids'),
            value: 'capital-raids'
          },
          {
            name: command.history.options.option.choices.capital_contribution,
            name_localizations: translation('command.history.options.option.choices.capital_contribution'),
            value: 'capital-contribution'
          },
          {
            name: command.history.options.option.choices.cwl_attacks,
            name_localizations: translation('command.history.options.option.choices.cwl_attacks'),
            value: 'cwl-attacks'
          },
          {
            name: command.history.options.option.choices.war_attacks,
            name_localizations: translation('command.history.options.option.choices.war_attacks'),
            value: 'war-attacks'
          },
          {
            name: command.history.options.option.choices.donations,
            name_localizations: translation('command.history.options.option.choices.donations'),
            value: 'donations'
          },
          {
            name: command.history.options.option.choices.attacks,
            name_localizations: translation('command.history.options.option.choices.attacks'),
            value: 'attacks'
          },
          {
            name: command.history.options.option.choices.loot,
            name_localizations: translation('command.history.options.option.choices.loot'),
            value: 'loot'
          },
          {
            name: command.history.options.option.choices.join_leave,
            name_localizations: translation('command.history.options.option.choices.join_leave'),
            value: 'join-leave'
          },
          {
            name: command.history.options.option.choices.legend_attacks,
            name_localizations: translation('command.history.options.option.choices.legend_attacks'),
            value: 'legend-attacks'
          },
          {
            name: command.history.options.option.choices.eos_trophies,
            name_localizations: translation('command.history.options.option.choices.eos_trophies'),
            value: 'eos-trophies'
          }
        ]
      },
      {
        name: 'clans',
        autocomplete: true,
        description: command.history.options.clans.description,
        description_localizations: translation('command.history.options.clans.description'),
        type: ApplicationCommandOptionType.String
      },
      {
        name: 'player',
        autocomplete: true,
        description: command.history.options.player.description,
        description_localizations: translation('command.history.options.player.description'),
        type: ApplicationCommandOptionType.String
      },
      {
        name: 'user',
        description: command.history.options.user.description,
        description_localizations: translation('command.history.options.user.description'),
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
        description: command.cwl.roster.description,
        description_localizations: translation('command.cwl.roster.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
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
        description: command.cwl.round.description,
        description_localizations: translation('command.cwl.round.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
            description: common.options.tag.description,
            description_localizations: translation('common.options.tag.description'),
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'season',
            required: false,
            type: ApplicationCommandOptionType.String,
            description: command.cwl.round.options.season.description,
            description_localizations: translation('command.cwl.round.options.season.description'),
            choices: getSeasonIds()
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
        description: command.cwl.lineup.description,
        description_localizations: translation('command.cwl.lineup.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
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
        description: command.cwl.stars.description,
        description_localizations: translation('command.cwl.stars.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
            description: common.options.tag.description,
            description_localizations: translation('common.options.tag.description'),
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'season',
            required: false,
            type: ApplicationCommandOptionType.String,
            description: command.cwl.round.options.season.description,
            description_localizations: translation('command.cwl.round.options.season.description'),
            choices: getSeasonIds()
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
        description: command.cwl.attacks.description,
        description_localizations: translation('command.cwl.attacks.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
            description: common.options.tag.description,
            description_localizations: translation('common.options.tag.description'),
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'season',
            required: false,
            type: ApplicationCommandOptionType.String,
            description: command.cwl.round.options.season.description,
            description_localizations: translation('command.cwl.round.options.season.description'),
            choices: getSeasonIds()
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
        description: command.cwl.stats.description,
        description_localizations: translation('command.cwl.stats.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
            description: common.options.tag.description,
            description_localizations: translation('common.options.tag.description'),
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'season',
            required: false,
            type: ApplicationCommandOptionType.String,
            description: command.cwl.round.options.season.description,
            description_localizations: translation('command.cwl.round.options.season.description'),
            choices: getSeasonIds()
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
        description: command.cwl.members.description,
        description_localizations: translation('command.cwl.members.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
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
            description: command.link.create.options.player_tag.description,
            description_localizations: translation('command.link.create.options.player_tag.description'),
            required: false,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'clan_tag',
            description: command.link.create.options.clan_tag.description,
            description_localizations: translation('command.link.create.options.clan_tag.description'),
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
            name: 'is_default',
            description: command.link.create.options.is_default.description,
            description_localizations: translation('command.link.create.options.is_default.description'),
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
            name: 'clan',
            description: command.link.list.options.clan.description,
            description_localizations: translation('command.link.list.options.clan.description'),
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
            description: command.link.delete.options.player_tag.description,
            description_localizations: translation('command.link.delete.options.player_tag.description'),
            required: false,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'clan_tag',
            description: command.link.delete.options.clan_tag.description,
            description_localizations: translation('command.link.delete.options.clan_tag.description'),
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
    description_localizations: translation('command.timezone.description'),
    dm_permission: false,
    options: [
      {
        name: 'location',
        description: command.timezone.options.location.description,
        description_localizations: translation('command.timezone.options.location.description'),
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
            name: 'flag_type',
            description: command.flag.create.options.flag_type.description,
            description_localizations: translation('command.flag.create.options.flag_type.description'),
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.flag.create.options.choices.ban,
                name_localizations: translation('command.flag.create.options.choices.ban'),
                value: 'ban'
              },
              {
                name: command.flag.create.options.choices.strike,
                name_localizations: translation('command.flag.create.options.choices.strike'),
                value: 'strike'
              }
            ]
          },
          {
            name: 'player',
            description: command.flag.create.options.tag.description,
            description_localizations: translation('command.flag.create.options.tag.description'),
            required: true,
            max_length: 256,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'reason',
            description: command.flag.create.options.reason.description,
            description_localizations: translation('command.flag.create.options.reason.description'),
            required: true,
            max_length: 256,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'flag_expiry_days',
            description: command.flag.create.options.flag_expiry_days.description,
            description_localizations: translation('command.flag.create.options.flag_expiry_days.description'),
            type: ApplicationCommandOptionType.Integer,
            max_value: 100 * 365,
            min_value: 1
          },
          {
            name: 'flag_impact',
            description: command.flag.create.options.flag_impact.description,
            description_localizations: translation('command.flag.create.options.flag_impact.description'),
            type: ApplicationCommandOptionType.Integer,
            max_value: 100,
            min_value: 1
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
            name: 'flag_type',
            description: command.flag.list.options.flag_type.description,
            description_localizations: translation('command.flag.list.options.flag_type.description'),
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              {
                name: command.flag.list.options.flag_type.choices.ban,
                name_localizations: translation('command.flag.list.options.flag_type.choices.ban'),
                value: 'ban'
              },
              {
                name: command.flag.list.options.flag_type.choices.strike,
                name_localizations: translation('command.flag.list.options.flag_type.choices.strike'),
                value: 'strike'
              }
            ]
          },
          {
            name: 'player',
            description: command.flag.list.options.player.description,
            name_localizations: translation('command.flag.list.options.player.description'),
            autocomplete: true,
            max_length: 100,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'clans',
            autocomplete: true,
            description: command.autorole.disable.options.clans.description,
            description_localizations: translation('command.autorole.disable.options.clans.description'),
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
            name: 'flag_type',
            description: command.flag.list.options.flag_type.description,
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              {
                name: command.flag.list.options.flag_type.choices.ban,
                name_localizations: translation('command.flag.list.options.flag_type.choices.ban'),
                value: 'ban'
              },
              {
                name: command.flag.list.options.flag_type.choices.strike,
                name_localizations: translation('command.flag.list.options.flag_type.choices.strike'),
                value: 'strike'
              }
            ]
          },
          {
            name: 'player',
            description: command.flag.delete.options.tag.description,
            description_localizations: translation('command.flag.delete.options.tag.description'),
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          },
          {
            name: 'flag_ref',
            description: command.flag.delete.options.flag_ref.description,
            description_localizations: translation('command.flag.delete.options.flag_ref.description'),
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          }
        ]
      }
    ]
  },
  {
    name: 'setup',
    description: command.setup.description,
    description_localizations: translation('command.setup.description'),
    dm_permission: false,
    options: [
      // enable
      {
        name: 'enable',
        description: command.setup.enable.description,
        description_localizations: translation('command.setup.enable.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'action',
            description: command.setup.enable.options.option.description,
            description_localizations: translation('command.setup.enable.options.option.description'),
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              {
                name: command.setup.enable.options.option.choices.link_clan,
                name_localizations: translation('command.setup.enable.options.option.choices.link_clan'),
                value: 'link-clan'
              },
              {
                name: command.setup.enable.options.option.choices.link_channel,
                name_localizations: translation('command.setup.enable.options.option.choices.link_channel'),
                value: 'link-channel'
              },
              {
                name: command.setup.enable.options.option.choices.enable_logs,
                name_localizations: translation('command.setup.enable.options.option.choices.enable_logs'),
                value: 'enable-logs'
              },
              {
                name: command.setup.enable.options.option.choices.war_feed,
                name_localizations: translation('command.setup.enable.options.option.choices.war_feed'),
                value: 'war-feed'
              },
              {
                name: command.setup.enable.options.option.choices.last_seen,
                name_localizations: translation('command.setup.enable.options.option.choices.last_seen'),
                value: 'last-seen'
              },
              {
                name: command.setup.enable.options.option.choices.clan_games,
                name_localizations: translation('command.setup.enable.options.option.choices.clan_games'),
                value: 'clan-games'
              },
              {
                name: command.setup.enable.options.option.choices.legend_log,
                name_localizations: translation('command.setup.enable.options.option.choices.legend_log'),
                value: 'legend-log'
              },
              {
                name: command.setup.enable.options.option.choices.capital_log,
                name_localizations: translation('command.setup.enable.options.option.choices.capital_log'),
                value: 'capital-log'
              },
              {
                name: command.setup.enable.options.option.choices.clan_feed,
                name_localizations: translation('command.setup.enable.options.option.choices.clan_feed'),
                value: 'clan-feed'
              },
              {
                name: command.setup.enable.options.option.choices.join_leave,
                name_localizations: translation('command.setup.enable.options.option.choices.join_leave'),
                value: 'join-leave'
              },
              {
                name: command.setup.enable.options.option.choices.clan_embed,
                name_localizations: translation('command.setup.enable.options.option.choices.clan_embed'),
                value: 'clan-embed'
              },
              {
                name: command.setup.enable.options.option.choices.donation_log,
                name_localizations: translation('command.setup.enable.options.option.choices.donation_log'),
                value: 'donation-log'
              }
            ]
          },
          {
            name: 'clan',
            description: command.setup.enable.options.tag.description,
            description_localizations: translation('command.setup.enable.options.tag.description'),
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'category',
            description: command.setup.enable.options.category.description,
            description_localizations: translation('command.setup.enable.options.category.description'),
            type: ApplicationCommandOptionType.String,
            max_length: 36,
            autocomplete: true
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
          },
          {
            name: 'ping_role',
            description: '[DEPRECATED] Ping this role in the logs (only for town hall upgrade log)',
            type: ApplicationCommandOptionType.Role
          }
        ]
      },
      // list
      {
        name: 'list',
        description: command.setup.list.description,
        description_localizations: translation('command.setup.list.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clans',
            description: command.setup.list.options.clans.description,
            description_localizations: translation('command.setup.list.options.clans.description'),
            type: ApplicationCommandOptionType.String,
            autocomplete: true
          }
        ]
      },
      // utility
      {
        name: 'utility',
        description: command.setup.utils.description,
        description_localizations: translation('command.setup.utils.description'),
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
                name: command.setup.utils.options.option.choices.link_button,
                name_localizations: translation('command.setup.utils.options.option.choices.link_button'),
                value: 'link-button'
              },
              {
                name: command.setup.utils.options.option.choices.role_refresh_button,
                name_localizations: translation('command.setup.utils.options.option.choices.role_refresh_button'),
                value: 'role-refresh-button'
              },
              {
                name: command.setup.utils.options.option.choices.events_schedular,
                name_localizations: translation('command.setup.utils.options.option.choices.events_schedular'),
                value: 'events-schedular'
              },
              {
                name: command.setup.utils.options.option.choices.flag_alert_log,
                name_localizations: translation('command.setup.utils.options.option.choices.flag_alert_log'),
                value: 'flag-alert-log'
              },
              {
                name: command.setup.utils.options.option.choices.roster_change_log,
                name_localizations: translation('command.setup.utils.options.option.choices.roster_change_log'),
                value: 'roster-changelog'
              },
              {
                name: command.setup.utils.options.option.choices.reminder_ping_exclusion,
                name_localizations: translation('command.setup.utils.options.option.choices.reminder_ping_exclusion'),
                value: 'reminder-ping-exclusion'
              },
              {
                name: command.setup.utils.options.option.choices.maintenance_break_log,
                name_localizations: translation('command.setup.utils.options.option.choices.maintenance_break_log'),
                value: 'maintenance-break-log'
              }
            ]
          },
          {
            name: 'disable',
            description: command.setup.utils.options.disable.description,
            name_localizations: translation('command.setup.utils.options.disable.description'),
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              {
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          }
        ]
      },
      // buttons
      {
        name: 'buttons',
        description: command.setup.buttons.description,
        description_localizations: translation('command.setup.buttons.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'button_type',
            required: true,
            description: command.setup.buttons.options.button_type.description,
            description_localizations: translation('command.setup.buttons.options.button_type.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.setup.buttons.options.button_type.choices.link_button,
                name_localizations: translation('command.setup.buttons.options.button_type.choices.link_button'),
                value: 'link-button'
              },
              {
                name: command.setup.buttons.options.button_type.choices.role_refresh_button,
                name_localizations: translation('command.setup.buttons.options.button_type.choices.role_refresh_button'),
                value: 'role-refresh-button'
              }
            ]
          },
          {
            name: 'disable',
            description: command.setup.buttons.options.disable.description,
            description_localizations: translation('command.setup.buttons.options.disable.description'),
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              {
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          }
        ]
      },
      // events
      {
        name: 'events',
        description: command.setup.events.description,
        description_localizations: translation('command.setup.events.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'disable',
            description: command.setup.events.options.disable.description,
            description_localizations: translation('command.setup.events.options.disable.description'),
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              {
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          }
        ]
      },
      // server-logs
      {
        name: 'server-logs',
        description: command.setup.server_logs.description,
        description_localizations: translation('command.setup.server_logs.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'log_type',
            required: true,
            description: command.setup.server_logs.options.log_type.description,
            description_localizations: translation('command.setup.server_logs.options.log_type.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.setup.server_logs.options.log_type.choices.flag_alert_log,
                name_localizations: translation('command.setup.server_logs.options.log_type.choices.flag_alert_log'),
                value: 'flag-alert-log'
              },
              {
                name: command.setup.server_logs.options.log_type.choices.roster_change_log,
                name_localizations: translation('command.setup.server_logs.options.log_type.choices.roster_change_log'),
                value: 'roster-changelog'
              },
              {
                name: command.setup.server_logs.options.log_type.choices.maintenance_break_log,
                name_localizations: translation('command.setup.server_logs.options.log_type.choices.maintenance_break_log'),
                value: 'maintenance-break-log'
              }
            ]
          },
          {
            name: 'disable',
            description: command.setup.server_logs.options.disable.description,
            description_localizations: translation('command.setup.server_logs.options.disable.description'),
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              {
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          }
        ]
      },
      // clan-logs
      {
        name: 'clan-logs',
        description: command.setup.clan_logs.description,
        description_localizations: translation('command.setup.clan_logs.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
            description: command.setup.clan_logs.options.clan.description,
            description_localizations: translation('command.setup.clan_logs.options.clan.description'),
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'action',
            description: command.setup.clan_logs.options.action.description,
            description_localizations: translation('command.setup.clan_logs.options.action.description'),
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              {
                name: command.setup.clan_logs.options.action.choices.enable_logs,
                name_localizations: translation('command.setup.clan_logs.options.action.choices.enable_logs'),
                value: 'enable-logs'
              },
              {
                name: command.setup.clan_logs.options.action.choices.disable_logs,
                name_localizations: translation('command.setup.clan_logs.options.action.choices.disable_logs'),
                value: 'disable-logs'
              }
            ]
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
          },
          {
            name: 'ping_role',
            description: '[DEPRECATED] Ping this role in the logs (only for town hall upgrade log)',
            type: ApplicationCommandOptionType.Role
          }
        ]
      },
      // disable
      {
        name: 'disable',
        description: command.setup.disable.description,
        description_localizations: translation('command.setup.disable.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'action',
            required: true,
            description: command.setup.disable.options.option.description,
            description_localizations: translation('command.setup.disable.options.option.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.setup.disable.options.option.choices.unlink_channel,
                name_localizations: translation('command.setup.disable.options.option.choices.unlink_channel'),
                value: 'unlink-channel'
              },
              {
                name: command.setup.disable.options.option.choices.delete_clan,
                name_localizations: translation('command.setup.disable.options.option.choices.delete_clan'),
                value: 'delete-clan'
              },
              {
                name: command.setup.disable.options.option.choices.disable_logs,
                name_localizations: translation('command.setup.disable.options.option.choices.disable_logs'),
                value: 'disable-logs'
              },
              {
                name: command.setup.disable.options.option.choices.war_feed,
                name_localizations: translation('command.setup.disable.options.option.choices.war_feed'),
                value: 'war-feed'
              },
              {
                name: command.setup.disable.options.option.choices.last_seen,
                name_localizations: translation('command.setup.disable.options.option.choices.last_seen'),
                value: 'last-seen'
              },
              {
                name: command.setup.disable.options.option.choices.clan_games,
                name_localizations: translation('command.setup.disable.options.option.choices.clan_games'),
                value: 'clan-games'
              },
              {
                name: command.setup.disable.options.option.choices.legend_log,
                name_localizations: translation('command.setup.disable.options.option.choices.legend_log'),
                value: 'legend-log'
              },
              {
                name: command.setup.disable.options.option.choices.capital_log,
                name_localizations: translation('command.setup.disable.options.option.choices.capital_log'),
                value: 'capital-log'
              },
              {
                name: command.setup.disable.options.option.choices.clan_feed,
                name_localizations: translation('command.setup.disable.options.option.choices.clan_feed'),
                value: 'clan-feed'
              },
              {
                name: command.setup.disable.options.option.choices.join_leave,
                name_localizations: translation('command.setup.disable.options.option.choices.join_leave'),
                value: 'join-leave'
              },
              {
                name: command.setup.disable.options.option.choices.clan_embed,
                name_localizations: translation('command.setup.disable.options.option.choices.clan_embed'),
                value: 'clan-embed'
              },
              {
                name: command.setup.disable.options.option.choices.donation_log,
                name_localizations: translation('command.setup.disable.options.option.choices.donation_log'),
                value: 'donation-log'
              }
            ]
          },
          {
            name: 'clan',
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
            description: command.alias.create.options.clan.description,
            description_localizations: translation('command.alias.create.options.clan.description'),
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'alias_name',
            required: false,
            max_length: 15,
            description: command.alias.create.options.alias_name.description,
            description_localizations: translation('command.alias.create.options.alias_name.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'clan_nickname',
            required: false,
            max_length: 15,
            description: command.alias.create.options.clan_nickname.description,
            description_localizations: translation('command.alias.create.options.clan_nickname.description'),
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
    name: 'category',
    description: command.category.description,
    description_localizations: translation('command.category.description'),
    dm_permission: false,
    options: [
      {
        name: 'create',
        description: command.category.options.create.description,
        description_localizations: translation('command.category.options.create.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'category_name',
            max_length: 36,
            description: command.category.options.create.options.category_name.description,
            description_localizations: translation('command.category.options.create.options.category_name.description'),
            required: true,
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'list',
        description: command.category.options.list.description,
        description_localizations: translation('command.category.options.list.description'),
        type: ApplicationCommandOptionType.Subcommand
      },
      {
        name: 'edit',
        description: command.category.options.edit.description,
        description_localizations: translation('command.category.options.edit.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'category',
            description: command.category.options.edit.options.category.description,
            description_localizations: translation('command.category.options.edit.options.category.description'),
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'category_name',
            max_length: 36,
            description: command.category.options.edit.options.category_name.description,
            description_localizations: translation('command.category.options.edit.options.category_name.description'),
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'delete',
        description: command.category.options.delete.description,
        description_localizations: translation('command.category.options.delete.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'category',
            description: command.category.options.delete.options.category.description,
            description_localizations: translation('command.category.options.delete.options.category.description'),
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
    description: command.roster.description,
    description_localizations: translation('command.roster.description'),
    dm_permission: false,
    options: [
      {
        name: 'create',
        description: command.roster.options.create.description,
        description_localizations: translation('command.roster.options.create.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clan',
            description: command.roster.options.create.options.clan.description,
            description_localizations: translation('command.roster.options.create.options.clan.description'),
            autocomplete: true,
            required: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'name',
            description: command.roster.options.create.options.name.description,
            description_localizations: translation('command.roster.options.create.options.name.description'),
            required: true,
            max_length: 30,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'category',
            description: command.roster.options.create.options.category.description,
            description_localizations: translation('command.roster.options.create.options.category.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.roster.options.create.options.category.choices.cwl,
                name_localizations: translation('command.roster.options.create.options.category.choices.cwl'),
                value: 'CWL'
              },
              {
                name: command.roster.options.create.options.category.choices.war,
                name_localizations: translation('command.roster.options.create.options.category.choices.war'),
                value: 'WAR'
              },
              {
                name: command.roster.options.create.options.category.choices.esports,
                name_localizations: translation('command.roster.options.create.options.category.choices.esports'),
                value: 'ESPORTS'
              },
              {
                name: command.roster.options.create.options.category.choices.trophy,
                name_localizations: translation('command.roster.options.create.options.category.choices.trophy'),
                value: 'TROPHY'
              }
            ]
          },
          {
            name: 'import_members',
            description: command.roster.options.create.options.import_members.description,
            description_localizations: translation('command.roster.options.create.options.import_members.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'allow_unlinked',
            description: command.roster.options.create.options.allow_unlinked.description,
            description_localizations: translation('command.roster.options.create.options.allow_unlinked.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'max_members',
            min_value: 5,
            max_value: 500,
            description: command.roster.options.create.options.max_members.description,
            description_localizations: translation('command.roster.options.create.options.max_members.description'),
            type: ApplicationCommandOptionType.Integer
          },
          {
            name: 'max_accounts_per_user',
            min_value: 1,
            max_value: 75,
            description: command.roster.options.create.options.max_accounts_per_user.description,
            description_localizations: translation('command.roster.options.create.options.max_accounts_per_user.description'),
            type: ApplicationCommandOptionType.Integer
          },
          {
            name: 'min_town_hall',
            description: command.roster.options.create.options.min_town_hall.description,
            description_localizations: translation('command.roster.options.create.options.min_town_hall.description'),
            type: ApplicationCommandOptionType.Integer,
            min_value: 2,
            max_value: MAX_TOWN_HALL_LEVEL
          },
          {
            name: 'max_town_hall',
            description: command.roster.options.create.options.max_town_hall.description,
            description_localizations: translation('command.roster.options.create.options.max_town_hall.description'),
            type: ApplicationCommandOptionType.Integer,
            min_value: 2,
            max_value: MAX_TOWN_HALL_LEVEL
          },
          {
            name: 'min_hero_level',
            min_value: 0,
            description: command.roster.options.create.options.min_hero_level.description,
            description_localizations: translation('command.roster.options.create.options.min_hero_level.description'),
            type: ApplicationCommandOptionType.Integer
          },
          {
            name: 'roster_role',
            description: command.roster.options.create.options.roster_role.description,
            description_localizations: translation('command.roster.options.create.options.roster_role.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'sort_by',
            description: command.roster.options.create.options.sort_by.description,
            description_localizations: translation('command.roster.options.create.options.sort_by.description'),
            type: ApplicationCommandOptionType.String,
            choices: [...RosterCommandSortOptions]
          },
          {
            name: 'start_time',
            description: command.roster.options.create.options.start_time.description,
            description_localizations: translation('command.roster.options.create.options.start_time.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'end_time',
            description: command.roster.options.create.options.end_time.description,
            description_localizations: translation('command.roster.options.create.options.end_time.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'timezone',
            autocomplete: true,
            description: command.roster.options.create.options.timezone.description,
            description_localizations: translation('command.roster.options.create.options.timezone.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'allow_group_selection',
            description: command.roster.options.create.options.allow_group_selection.description,
            description_localizations: translation('command.roster.options.create.options.allow_group_selection.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'allow_multi_signup',
            description: command.roster.options.create.options.allow_multi_signup.description,
            description_localizations: translation('command.roster.options.create.options.allow_multi_signup.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'use_clan_alias',
            description: command.roster.options.create.options.use_clan_alias.description,
            description_localizations: translation('command.roster.options.create.options.use_clan_alias.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'roster_image_url',
            description: command.roster.options.create.options.roster_image_url.description,
            description_localizations: translation('command.roster.options.create.options.roster_image_url.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'color_code',
            description: command.roster.options.create.options.color_code.description,
            description_localizations: translation('command.roster.options.create.options.color_code.description'),
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'post',
        description: command.roster.options.post.description,
        description_localizations: translation('command.roster.options.post.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'roster',
            autocomplete: true,
            required: true,
            description: command.roster.options.post.options.roster.description,
            description_localizations: translation('command.roster.options.post.options.roster.description'),
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'clone',
        description: command.roster.options.clone.description,
        description_localizations: translation('command.roster.options.clone.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'roster',
            autocomplete: true,
            required: true,
            description: command.roster.options.clone.options.roster.description,
            description_localizations: translation('command.roster.options.clone.options.roster.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'name',
            description: command.roster.options.clone.options.name.description,
            description_localizations: translation('command.roster.options.clone.options.name.description'),
            max_length: 30,
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'list',
        description: command.roster.options.list.description,
        description_localizations: translation('command.roster.options.list.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'name',
            description: command.roster.options.list.options.name.description,
            description_localizations: translation('command.roster.options.list.options.name.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'user',
            description: command.roster.options.list.options.user.description,
            description_localizations: translation('command.roster.options.list.options.user.description'),
            type: ApplicationCommandOptionType.User
          },
          {
            name: 'player',
            description: command.roster.options.list.options.player.description,
            description_localizations: translation('command.roster.options.list.options.player.description'),
            type: ApplicationCommandOptionType.String,
            autocomplete: true
          },
          {
            name: 'clan',
            description: command.roster.options.list.options.clan.description,
            description_localizations: translation('command.roster.options.list.options.clan.description'),
            type: ApplicationCommandOptionType.String,
            autocomplete: true
          }
        ]
      },
      {
        name: 'edit',
        description: command.roster.options.edit.description,
        description_localizations: translation('command.roster.options.edit.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'roster',
            description: command.roster.options.edit.options.roster.description,
            description_localizations: translation('command.roster.options.edit.options.roster.description'),
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'name',
            description: command.roster.options.create.options.name.description,
            description_localizations: translation('command.roster.options.create.options.name.description'),
            max_length: 30,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'category',
            description: command.roster.options.create.options.category.description,
            description_localizations: translation('command.roster.options.create.options.category.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.roster.options.create.options.category.choices.cwl,
                name_localizations: translation('command.roster.options.create.options.category.choices.cwl'),
                value: 'CWL'
              },
              {
                name: command.roster.options.create.options.category.choices.war,
                name_localizations: translation('command.roster.options.create.options.category.choices.war'),
                value: 'WAR'
              },
              {
                name: command.roster.options.create.options.category.choices.esports,
                name_localizations: translation('command.roster.options.create.options.category.choices.esports'),
                value: 'ESPORTS'
              },
              {
                name: command.roster.options.create.options.category.choices.trophy,
                name_localizations: translation('command.roster.options.create.options.category.choices.trophy'),
                value: 'TROPHY'
              }
            ]
          },
          {
            name: 'clan',
            description: command.roster.options.create.options.clan.description,
            description_localizations: translation('command.roster.options.create.options.clan.description'),
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'detach_clan',
            description: command.roster.options.edit.options.detach_clan.description,
            description_localizations: translation('command.roster.options.edit.options.detach_clan.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'allow_unlinked',
            description: command.roster.options.create.options.allow_unlinked.description,
            description_localizations: translation('command.roster.options.create.options.allow_unlinked.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'max_members',
            description: command.roster.options.create.options.max_members.description,
            description_localizations: translation('command.roster.options.create.options.max_members.description'),
            min_value: 5,
            max_value: 500,
            type: ApplicationCommandOptionType.Integer
          },
          {
            name: 'max_accounts_per_user',
            min_value: 1,
            max_value: 75,
            description: command.roster.options.create.options.max_accounts_per_user.description,
            description_localizations: translation('command.roster.options.create.options.max_accounts_per_user.description'),
            type: ApplicationCommandOptionType.Integer
          },
          {
            name: 'min_town_hall',
            max_value: MAX_TOWN_HALL_LEVEL,
            min_value: 2,
            description: command.roster.options.create.options.min_town_hall.description,
            description_localizations: translation('command.roster.options.create.options.min_town_hall.description'),
            type: ApplicationCommandOptionType.Integer
          },
          {
            name: 'max_town_hall',
            description: command.roster.options.create.options.max_town_hall.description,
            description_localizations: translation('command.roster.options.create.options.max_town_hall.description'),
            type: ApplicationCommandOptionType.Integer,
            min_value: 2,
            max_value: MAX_TOWN_HALL_LEVEL
          },
          {
            name: 'min_hero_level',
            min_value: 0,
            description: command.roster.options.create.options.min_hero_level.description,
            description_localizations: translation('command.roster.options.create.options.min_hero_level.description'),
            type: ApplicationCommandOptionType.Integer
          },
          {
            name: 'roster_role',
            description: command.roster.options.create.options.roster_role.description,
            description_localizations: translation('command.roster.options.create.options.roster_role.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'sort_by',
            description: command.roster.options.create.options.sort_by.description,
            description_localizations: translation('command.roster.options.create.options.sort_by.description'),
            type: ApplicationCommandOptionType.String,
            choices: [...RosterCommandSortOptions]
          },
          {
            name: 'delete_role',
            description: command.roster.options.edit.options.delete_role.description,
            description_localizations: translation('command.roster.options.edit.options.delete_role.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'start_time',
            description: command.roster.options.create.options.start_time.description,
            description_localizations: translation('command.roster.options.create.options.start_time.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'end_time',
            description: command.roster.options.create.options.end_time.description,
            description_localizations: translation('command.roster.options.create.options.end_time.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'timezone',
            autocomplete: true,
            description: command.roster.options.create.options.timezone.description,
            description_localizations: translation('command.roster.options.create.options.timezone.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'allow_group_selection',
            description: command.roster.options.create.options.allow_group_selection.description,
            description_localizations: translation('command.roster.options.create.options.allow_group_selection.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'allow_multi_signup',
            description: command.roster.options.create.options.allow_multi_signup.description,
            description_localizations: translation('command.roster.options.create.options.allow_multi_signup.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'use_clan_alias',
            description: command.roster.options.create.options.use_clan_alias.description,
            description_localizations: translation('command.roster.options.create.options.use_clan_alias.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'roster_image_url',
            description: command.roster.options.create.options.roster_image_url.description,
            description_localizations: translation('command.roster.options.create.options.roster_image_url.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'color_code',
            description: command.roster.options.create.options.color_code.description,
            description_localizations: translation('command.roster.options.create.options.color_code.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'log_channel',
            description: command.roster.options.edit.options.log_channel.description,
            description_localizations: translation('command.roster.options.edit.options.log_channel.description'),
            type: ApplicationCommandOptionType.Channel,
            channel_types: ChannelTypes
          }
        ]
      },
      {
        name: 'delete',
        description: command.roster.options.delete.description,
        description_localizations: translation('command.roster.options.delete.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'roster',
            description: command.roster.options.delete.options.roster.description,
            description_localizations: translation('command.roster.options.delete.options.roster.description'),
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'manage',
        description: command.roster.options.manage.description,
        description_localizations: translation('command.roster.options.manage.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'roster',
            description: command.roster.options.manage.options.roster.description,
            description_localizations: translation('command.roster.options.manage.options.roster.description'),
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'action',
            description: command.roster.options.manage.options.action.description,
            description_localizations: translation('command.roster.options.manage.options.action.description'),
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.roster.options.manage.options.action.choices.add_user,
                name_localizations: translation('command.roster.options.manage.options.action.choices.add_user'),
                value: RosterManageActions.ADD_USER
              },
              {
                name: command.roster.options.manage.options.action.choices.remove_user,
                name_localizations: translation('command.roster.options.manage.options.action.choices.remove_user'),
                value: RosterManageActions.DEL_USER
              },
              {
                name: command.roster.options.manage.options.action.choices.change_roster,
                name_localizations: translation('command.roster.options.manage.options.action.choices.change_roster'),
                value: RosterManageActions.CHANGE_ROSTER
              },
              {
                name: command.roster.options.manage.options.action.choices.change_group,
                name_localizations: translation('command.roster.options.manage.options.action.choices.change_group'),
                value: RosterManageActions.CHANGE_CATEGORY
              }
            ]
          },
          {
            name: 'player',
            autocomplete: true,
            description: command.roster.options.manage.options.player.description,
            description_localizations: translation('command.roster.options.manage.options.player.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'clan',
            autocomplete: true,
            description: command.roster.options.manage.options.clan.description,
            description_localizations: translation('command.roster.options.manage.options.clan.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'user',
            description: command.roster.options.manage.options.user.description,
            description_localizations: translation('command.roster.options.manage.options.user.description'),
            type: ApplicationCommandOptionType.User
          },
          {
            name: 'target_group',
            autocomplete: true,
            description: command.roster.options.manage.options.target_group.description,
            description_localizations: translation('command.roster.options.manage.options.target_group.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'target_roster',
            autocomplete: true,
            description: command.roster.options.manage.options.target_roster.description,
            description_localizations: translation('command.roster.options.manage.options.target_roster.description'),
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'groups',
        description: command.roster.options.groups.description,
        description_localizations: translation('command.roster.options.groups.description'),
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [
          {
            name: 'create',
            description: command.roster.options.groups.options.create.description,
            description_localizations: translation('command.roster.options.groups.options.create.description'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'name',
                description: command.roster.options.groups.options.create.options.name.description,
                description_localizations: translation('command.roster.options.groups.options.create.options.name.description'),
                required: true,
                max_length: 30,
                type: ApplicationCommandOptionType.String
              },
              {
                name: 'group_role',
                description: command.roster.options.groups.options.create.options.group_role.description,
                description_localizations: translation('command.roster.options.groups.options.create.options.group_role.description'),
                type: ApplicationCommandOptionType.Role
              },
              {
                name: 'selectable',
                description: command.roster.options.groups.options.create.options.selectable.description,
                description_localizations: translation('command.roster.options.groups.options.create.options.selectable.description'),
                type: ApplicationCommandOptionType.Boolean
              }
            ]
          },
          {
            name: 'modify',
            description: command.roster.options.groups.options.modify.description,
            description_localizations: translation('command.roster.options.groups.options.modify.description'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'group',
                autocomplete: true,
                required: true,
                description: command.roster.options.groups.options.modify.options.group.description,
                description_localizations: translation('command.roster.options.groups.options.modify.options.group.description'),
                type: ApplicationCommandOptionType.String
              },
              {
                name: 'name',
                description: command.roster.options.groups.options.modify.options.name.description,
                description_localizations: translation('command.roster.options.groups.options.modify.options.name.description'),
                max_length: 30,
                type: ApplicationCommandOptionType.String
              },
              {
                name: 'order',
                description: command.roster.options.groups.options.modify.options.order.description,
                description_localizations: translation('command.roster.options.groups.options.modify.options.order.description'),
                type: ApplicationCommandOptionType.Integer,
                max_value: 1000,
                min_value: 1
              },
              {
                name: 'group_role',
                description: command.roster.options.groups.options.create.options.group_role.description,
                description_localizations: translation('command.roster.options.groups.options.create.options.group_role.description'),
                type: ApplicationCommandOptionType.Role
              },
              {
                name: 'selectable',
                description: command.roster.options.groups.options.create.options.selectable.description,
                description_localizations: translation('command.roster.options.groups.options.create.options.selectable.description'),
                type: ApplicationCommandOptionType.Boolean
              },
              {
                name: 'delete_role',
                description: command.roster.options.groups.options.modify.options.delete_role.description,
                description_localizations: translation('command.roster.options.groups.options.modify.options.delete_role.description'),
                type: ApplicationCommandOptionType.Boolean
              },
              {
                name: 'delete_group',
                description: command.roster.options.groups.options.modify.options.delete_group.description,
                description_localizations: translation('command.roster.options.groups.options.modify.options.delete_group.description'),
                type: ApplicationCommandOptionType.Boolean
              }
            ]
          }
        ]
      },
      {
        name: 'ping',
        description: 'Ping members in the roster',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'roster',
            description: 'Select a roster to manage',
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'message',
            description: 'Message for the members',
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'ping_option',
            description: 'Ping option',
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: "Unregistered (didn't signup, but in the clan)",
                value: 'unregistered'
              },
              {
                name: 'Missing (opted-in, but not in the clan)',
                value: 'missing'
              },
              {
                name: 'Everyone (all opted-in members)',
                value: 'everyone'
              }
            ]
          },
          {
            name: 'group',
            description: 'Select a user group (ping everyone in this group)',
            autocomplete: true,
            type: ApplicationCommandOptionType.String
          }
        ]
      }
    ]
  },
  {
    name: 'autorole',
    description: command.autorole.description,
    description_localizations: translation('command.autorole.description'),
    dm_permission: false,
    options: [
      {
        name: 'clan-roles',
        description: command.autorole.clan_roles.description,
        description_localizations: translation('command.autorole.clan_roles.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clans',
            required: true,
            autocomplete: true,
            description: command.autorole.clan_roles.options.clans.description,
            description_localizations: translation('command.autorole.clan_roles.options.clans.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'leader_role',
            required: false,
            description: command.autorole.clan_roles.options.leader.description,
            description_localizations: translation('command.autorole.clan_roles.options.leader.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'co_leader_role',
            required: false,
            description: command.autorole.clan_roles.options.co_lead.description,
            description_localizations: translation('command.autorole.clan_roles.options.co_lead.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'elder_role',
            required: false,
            description: command.autorole.clan_roles.options.elder.description,
            description_localizations: translation('command.autorole.clan_roles.options.elder.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'member_role',
            required: false,
            description: command.autorole.clan_roles.options.member.description,
            description_localizations: translation('command.autorole.clan_roles.options.member.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'everyone_role',
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
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          }
        ]
      },
      {
        name: 'town-hall',
        description: command.autorole.town_hall.description,
        description_localizations: translation('command.autorole.town_hall.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          ...TOWN_HALL_LEVELS_FOR_ROLES.map(
            (hall) =>
              ({
                name: `th_${hall}`,
                description: `Town Hall ${hall} role.`,
                type: ApplicationCommandOptionType.Role
              }) satisfies APIApplicationCommandBasicOption
          ),
          {
            name: 'allow_non_family_accounts',
            description: command.autorole.town_hall.options.allow_non_family_accounts.description,
            description_localizations: translation('command.autorole.town_hall.options.allow_non_family_accounts.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          }
        ]
      },
      {
        name: 'builder-hall',
        description: command.autorole.builder_hall.description,
        description_localizations: translation('command.autorole.builder_hall.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          ...BUILDER_HALL_LEVELS_FOR_ROLES.map(
            (hall) =>
              ({
                name: `bh_${hall}`,
                description: `Builder Hall ${hall} role.`,
                type: ApplicationCommandOptionType.Role
              }) satisfies APIApplicationCommandBasicOption
          )
        ]
      },
      {
        name: 'leagues',
        description: command.autorole.leagues.description,
        description_localizations: translation('command.autorole.leagues.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          ...PLAYER_LEAGUE_NAMES.map(
            (league) =>
              ({
                name: league,
                description: `${title(league)} league role.`,
                type: ApplicationCommandOptionType.Role
              }) satisfies APIApplicationCommandBasicOption
          ),
          {
            name: 'allow_non_family_accounts',
            description: command.autorole.town_hall.options.allow_non_family_accounts.description,
            description_localizations: translation('command.autorole.town_hall.options.allow_non_family_accounts.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          }
        ]
      },
      {
        name: 'builder-leagues',
        description: command.autorole.builder_hall.description,
        description_localizations: translation('command.autorole.builder_hall.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          ...BUILDER_BASE_LEAGUE_NAMES.map(
            (league) =>
              ({
                name: league,
                description: `${title(league)} league role.`,
                type: ApplicationCommandOptionType.Role
              }) satisfies APIApplicationCommandBasicOption
          )
        ]
      },
      {
        name: 'wars',
        description: command.autorole.wars.description,
        description_localizations: translation('command.autorole.wars.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'role',
            required: true,
            description: command.autorole.wars.options.role.description,
            description_localizations: translation('command.autorole.wars.options.role.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'clan',
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String,
            description: command.autorole.wars.options.clan.description,
            description_localizations: translation('command.autorole.wars.options.clan.description')
          }
        ]
      },
      {
        name: 'eos-push',
        description: command.autorole.eos_push.description,
        description_localizations: translation('command.autorole.eos_push.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'role',
            required: true,
            description: command.autorole.eos_push.options.role.description,
            description_localizations: translation('command.autorole.eos_push.options.role.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'clans',
            required: true,
            autocomplete: true,
            type: ApplicationCommandOptionType.String,
            description: command.autorole.eos_push.options.clans.description,
            description_localizations: translation('command.autorole.eos_push.options.clans.description')
          }
        ]
      },
      {
        name: 'family',
        description: command.autorole.family.description,
        description_localizations: translation('command.autorole.family.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'family_leaders_role',
            description: command.autorole.family.options.family_leaders_role.description,
            description_localizations: translation('command.autorole.family.options.family_leaders_role.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'family_role',
            description: command.autorole.family.options.family_role.description,
            description_localizations: translation('command.autorole.family.options.family_role.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'exclusive_family_role',
            description: command.autorole.family.options.exclusive_family_role.description,
            description_localizations: translation('command.autorole.family.options.exclusive_family_role.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'guest_role',
            description: command.autorole.family.options.guest_role.description,
            description_localizations: translation('command.autorole.family.options.guest_role.description'),
            type: ApplicationCommandOptionType.Role
          },
          {
            name: 'verified_role',
            description: command.autorole.family.options.verified_role.description,
            description_localizations: translation('command.autorole.family.options.verified_role.description'),
            type: ApplicationCommandOptionType.Role
          }
        ]
      },
      {
        name: 'list',
        description: command.autorole.list.description,
        type: ApplicationCommandOptionType.Subcommand
      },
      {
        name: 'disable',
        description: command.autorole.disable.description,
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'type',
            description: 'Type of roles to disable.',
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.autorole.disable.options.type.choices.clan_roles,
                name_localizations: translation('command.autorole.disable.options.type.choices.clan_roles'),
                value: 'clan-roles'
              },
              {
                name: command.autorole.disable.options.type.choices.town_hall,
                name_localizations: translation('command.autorole.disable.options.type.choices.town_hall'),
                value: 'town-hall'
              },
              {
                name: command.autorole.disable.options.type.choices.leagues,
                name_localizations: translation('command.autorole.disable.options.type.choices.leagues'),
                value: 'leagues'
              },
              {
                name: command.autorole.disable.options.type.choices.builder_hall,
                name_localizations: translation('command.autorole.disable.options.type.choices.builder_hall'),
                value: 'builder-hall'
              },
              {
                name: command.autorole.disable.options.type.choices.builder_leagues,
                name_localizations: translation('command.autorole.disable.options.type.choices.builder_leagues'),
                value: 'builder-leagues'
              },
              {
                name: command.autorole.disable.options.type.choices.wars,
                name_localizations: translation('command.autorole.disable.options.type.choices.wars'),
                value: 'wars'
              },
              {
                name: command.autorole.disable.options.type.choices.eos_push,
                name_localizations: translation('command.autorole.disable.options.type.choices.eos_push'),
                value: 'eos-push'
              },
              {
                name: command.autorole.disable.options.type.choices.family_leaders,
                name_localizations: translation('command.autorole.disable.options.type.choices.family_leaders'),
                value: 'family-leaders'
              },
              {
                name: command.autorole.disable.options.type.choices.family,
                name_localizations: translation('command.autorole.disable.options.type.choices.family'),
                value: 'family'
              },
              {
                name: command.autorole.disable.options.type.choices.exclusive_family,
                name_localizations: translation('command.autorole.disable.options.type.choices.exclusive_family'),
                value: 'exclusive-family'
              },
              {
                name: command.autorole.disable.options.type.choices.guest,
                name_localizations: translation('command.autorole.disable.options.type.choices.guest'),
                value: 'guest'
              },
              {
                name: command.autorole.disable.options.type.choices.verified,
                name_localizations: translation('command.autorole.disable.options.type.choices.verified'),
                value: 'verified'
              }
            ]
          },
          {
            name: 'clans',
            autocomplete: true,
            description: command.autorole.disable.options.clans.description,
            description_localizations: translation('command.autorole.disable.options.clans.description'),
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'refresh',
        description: command.autorole.refresh.description,
        description_localizations: translation('command.autorole.refresh.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user_or_role',
            description: command.autorole.refresh.options.user_or_role.description,
            description_localizations: translation('command.autorole.refresh.options.user_or_role.description'),
            type: ApplicationCommandOptionType.Mentionable
          },
          {
            name: 'is_test_run',
            description: command.autorole.refresh.options.is_test_run.description,
            description_localizations: translation('command.autorole.refresh.options.is_test_run.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'force_refresh',
            description: command.autorole.refresh.options.force_refresh.description,
            description_localizations: translation('command.autorole.refresh.options.force_refresh.description'),
            type: ApplicationCommandOptionType.Boolean
          }
        ]
      },
      {
        name: 'config',
        description: command.autorole.config.description,
        description_localizations: translation('command.autorole.config.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'auto_update_roles',
            description: command.autorole.config.options.auto_update_roles.description,
            description_localizations: translation('command.autorole.config.options.auto_update_roles.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          },
          {
            name: 'role_removal_delays',
            description: command.autorole.config.options.role_removal_delays.description,
            description_localizations: translation('command.autorole.config.options.role_removal_delays.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.autorole.config.options.role_removal_delays.choices.off,
                name_localizations: translation('command.autorole.config.options.role_removal_delays.choices.off'),
                value: '0'
              },
              {
                name: '1h',
                value: '1h'
              },
              {
                name: '2h',
                value: '2h'
              },
              {
                name: '4h',
                value: '4h'
              },
              {
                name: '6h',
                value: '6h'
              },
              {
                name: '8h',
                value: '8h'
              },
              {
                name: '12h',
                value: '12h'
              },
              {
                name: '18h',
                value: '18h'
              },
              {
                name: '24h',
                value: '24h'
              },
              {
                name: '36h',
                value: '36h'
              },
              {
                name: '48h',
                value: '48h'
              },
              {
                name: '72h',
                value: '72h'
              },
              {
                name: '7d',
                value: '7d'
              },
              {
                name: '12d',
                value: '12d'
              }
            ]
          },
          {
            name: 'role_addition_delays',
            description: command.autorole.config.options.role_addition_delays.description,
            description_localizations: translation('command.autorole.config.options.role_addition_delays.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.autorole.config.options.role_removal_delays.choices.off,
                name_localizations: translation('command.autorole.config.options.role_removal_delays.choices.off'),
                value: '0'
              },
              {
                name: '1h',
                value: '1h'
              },
              {
                name: '2h',
                value: '2h'
              },
              {
                name: '4h',
                value: '4h'
              },
              {
                name: '6h',
                value: '6h'
              },
              {
                name: '8h',
                value: '8h'
              },
              {
                name: '12h',
                value: '12h'
              },
              {
                name: '18h',
                value: '18h'
              },
              {
                name: '24h',
                value: '24h'
              }
            ]
          },
          {
            name: 'always_force_refresh_roles',
            description: command.autorole.config.options.always_force_refresh_roles.description,
            description_localizations: translation('command.autorole.config.options.always_force_refresh_roles.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'allow_not_linked',
            description: command.autorole.config.options.allow_not_linked.description,
            description_localizations: translation('command.autorole.config.options.allow_not_linked.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'verified_only_clan_roles',
            description: command.autorole.config.options.verified_only_clan_roles.description,
            description_localizations: translation('command.autorole.config.options.verified_only_clan_roles.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: common.choices.yes,
                name_localizations: translation('common.choices.yes'),
                value: 'true'
              },
              {
                name: common.choices.no,
                name_localizations: translation('common.choices.no'),
                value: 'false'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'reminders',
    description: command.reminders.description,
    dm_permission: false,
    description_localizations: translation('command.reminders.description'),
    options: [
      {
        name: 'create',
        description: command.reminders.create.description,
        description_localizations: translation('command.reminders.create.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'type',
            description: command.reminders.create.options.type.description,
            description_localizations: translation('command.reminders.create.options.type.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.reminders.create.options.type.choices.clan_wars,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_wars'),
                value: 'clan-wars'
              },
              {
                name: command.reminders.create.options.type.choices.capital_raids,
                name_localizations: translation('command.reminders.create.options.type.choices.capital_raids'),
                value: 'capital-raids'
              },
              {
                name: command.reminders.create.options.type.choices.clan_games,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_games'),
                value: 'clan-games'
              }
            ],
            required: true
          },
          {
            name: 'duration',
            description: command.reminders.create.options.duration.description,
            description_localizations: translation('command.reminders.create.options.duration.description'),
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
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
            name: 'message',
            description: command.reminders.create.options.message.description,
            description_localizations: translation('command.reminders.create.options.message.description'),
            type: ApplicationCommandOptionType.String,
            max_length: 1800,
            required: true
          },
          {
            name: 'exclude_participant_list',
            description: command.reminders.create.options.exclude_participants.description,
            description_localizations: translation('command.reminders.create.options.exclude_participants.description'),
            type: ApplicationCommandOptionType.Boolean,
            required: false
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
        description: command.reminders.edit.description,
        description_localizations: translation('command.reminders.edit.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'type',
            description: command.reminders.create.options.type.description,
            description_localizations: translation('command.reminders.create.options.type.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.reminders.create.options.type.choices.clan_wars,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_wars'),
                value: 'clan-wars'
              },
              {
                name: command.reminders.create.options.type.choices.capital_raids,
                name_localizations: translation('command.reminders.create.options.type.choices.capital_raids'),
                value: 'capital-raids'
              },
              {
                name: command.reminders.create.options.type.choices.clan_games,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_games'),
                value: 'clan-games'
              }
            ],
            required: true
          },
          {
            name: 'id',
            required: true,
            description: command.reminders.edit.options.id.description,
            description_localizations: translation('command.reminders.edit.options.id.description'),
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'duration',
            description: 'Remaining duration to mention members (e.g. 6h, 12h, 1d, 2d)',
            type: ApplicationCommandOptionType.String,
            autocomplete: true
          }
        ]
      },
      {
        name: 'list',
        description: command.reminders.list.description,
        description_localizations: translation('command.reminders.list.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'type',
            required: true,
            description: command.reminders.create.options.type.description,
            description_localizations: translation('command.reminders.create.options.type.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.reminders.create.options.type.choices.clan_wars,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_wars'),
                value: 'clan-wars'
              },
              {
                name: command.reminders.create.options.type.choices.capital_raids,
                name_localizations: translation('command.reminders.create.options.type.choices.capital_raids'),
                value: 'capital-raids'
              },
              {
                name: command.reminders.create.options.type.choices.clan_games,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_games'),
                value: 'clan-games'
              }
            ]
          },
          {
            name: 'compact_list',
            description: command.reminders.list.options.compact_list.description,
            description_localizations: translation('command.reminders.list.options.compact_list.description'),
            type: ApplicationCommandOptionType.Boolean
          },
          {
            name: 'clans',
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
          },
          {
            name: 'reminder_id',
            description: command.reminders.list.options.reminder_id.description,
            description_localizations: translation('command.reminders.list.options.reminder_id.description'),
            type: ApplicationCommandOptionType.String
          }
        ]
      },
      {
        name: 'delete',
        description: command.reminders.delete.description,
        description_localizations: translation('command.reminders.delete.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'type',
            description: command.reminders.create.options.type.description,
            description_localizations: translation('command.reminders.create.options.type.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.reminders.create.options.type.choices.clan_wars,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_wars'),
                value: 'clan-wars'
              },
              {
                name: command.reminders.create.options.type.choices.capital_raids,
                name_localizations: translation('command.reminders.create.options.type.choices.capital_raids'),
                value: 'capital-raids'
              },
              {
                name: command.reminders.create.options.type.choices.clan_games,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_games'),
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
          }
        ]
      },
      {
        name: 'now',
        description: command.reminders.now.description,
        description_localizations: translation('command.reminders.now.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'type',
            description: command.reminders.create.options.type.description,
            description_localizations: translation('command.reminders.create.options.type.description'),
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: command.reminders.create.options.type.choices.clan_wars,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_wars'),
                value: 'clan-wars'
              },
              {
                name: command.reminders.create.options.type.choices.capital_raids,
                name_localizations: translation('command.reminders.create.options.type.choices.capital_raids'),
                value: 'capital-raids'
              },
              {
                name: command.reminders.create.options.type.choices.clan_games,
                name_localizations: translation('command.reminders.create.options.type.choices.clan_games'),
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
    description: command.legend.description,
    description_localizations: translation('command.legend.description'),
    options: [
      {
        name: 'attacks',
        description: command.legend.attacks.description,
        description_localizations: translation('command.legend.attacks.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clans',
            description: command.legend.attacks.options.clans.description,
            description_localizations: translation('command.legend.attacks.options.clans.description'),
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
            description: command.legend.attacks.options.day.description,
            description_localizations: translation('command.legend.attacks.options.day.description'),
            type: ApplicationCommandOptionType.Number,
            max_value: 35,
            min_value: 1,
            required: false
          }
        ]
      },
      {
        name: 'days',
        description: command.legend.days.description,
        description_localizations: translation('command.legend.days.description'),
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'player',
            description: command.legend.days.options.player.description,
            description_localizations: translation('command.legend.days.options.player.description'),
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
            description: command.legend.attacks.options.day.description,
            description_localizations: translation('command.legend.attacks.options.day.description'),
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
          },
          {
            name: 'season',
            description: 'Season of the leaderboard',
            type: ApplicationCommandOptionType.String,
            choices: getSeasonIds()
          },
          {
            name: 'enable_auto_updating',
            description: 'Enable auto updating (every 30-60 mins)',
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: 'Legend Trophies',
                value: 'legend-leaderboard'
              },
              {
                name: 'Builder Trophies (Experimental)',
                value: 'bb-legend-leaderboard'
              }
            ]
          }
        ]
      },
      {
        name: 'stats',
        description: 'Shows statistics of legend ranks and trophies.',
        type: ApplicationCommandOptionType.Subcommand
      }
    ]
  },
  {
    name: 'leaderboard',
    description: 'Leaderboard of the top clans and players.',
    dm_permission: false,
    options: [
      {
        name: 'clans',
        description: 'Top clans leaderboard',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'location',
            description: 'Location of the leaderboard',
            type: ApplicationCommandOptionType.String,
            autocomplete: true
          },
          {
            name: 'season',
            description: 'Season of the leaderboard',
            type: ApplicationCommandOptionType.String,
            choices: getSeasonIds()
          }
        ]
      },
      {
        name: 'players',
        description: 'Top players leaderboard',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'location',
            description: 'Location of the leaderboard',
            type: ApplicationCommandOptionType.String,
            autocomplete: true
          },
          {
            name: 'season',
            description: 'Season of the leaderboard',
            type: ApplicationCommandOptionType.String,
            choices: getSeasonIds()
          }
        ]
      },
      {
        name: 'capital',
        description: 'Top capital leaderboard',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'location',
            description: 'Location of the leaderboard',
            type: ApplicationCommandOptionType.String,
            autocomplete: true
          },
          {
            name: 'season',
            description: 'Season of the leaderboard',
            type: ApplicationCommandOptionType.String,
            choices: getSeasonIds()
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
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clans',
            required: false,
            autocomplete: true,
            type: ApplicationCommandOptionType.String,
            description: 'Clan tags or aliases.'
          }
        ]
      },
      {
        name: 'compo',
        description: 'Shows a summary of Town Hall composition.',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clans',
            required: false,
            autocomplete: true,
            type: ApplicationCommandOptionType.String,
            description: 'Clan tags or aliases.'
          }
        ]
      },
      {
        name: 'cwl-ranks',
        description: 'Shows a summary of CWL ranks.',
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
            description: 'Clan tags or aliases.'
          }
        ]
      },
      {
        name: 'cwl-status',
        description: 'Shows a summary of CWL spin status.',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clans',
            required: false,
            autocomplete: true,
            type: ApplicationCommandOptionType.String,
            description: 'Clan tags or aliases.'
          }
        ]
      },
      {
        name: 'leagues',
        description: 'Shows a summary of clan leagues.',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clans',
            required: false,
            autocomplete: true,
            type: ApplicationCommandOptionType.String,
            description: 'Clan tags or aliases.'
          }
        ]
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
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'clans',
            required: false,
            autocomplete: true,
            type: ApplicationCommandOptionType.String,
            description: 'Clan tags or aliases.'
          }
        ]
      },
      {
        name: 'attacks',
        description: 'Shows a summary of multiplayer attacks and defenses.',
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
        name: 'trophies',
        description: 'Shows a summary of trophies.',
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
            description: command.summary.options.season_since.description,
            description_localizations: translation('command.summary.options.season_since.description'),
            choices: SEASON_SINCE_CHOICES
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
            description: 'Regular or friendly wars (defaults to Regular)',
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
            min_value: 1,
            max_value: 100,
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
            min_value: 1,
            max_value: 100,
            description: command.export.options.wars.description,
            description_localizations: translation('command.export.options.wars.description'),
            type: ApplicationCommandOptionType.Integer
          },
          {
            name: 'lineup_only',
            description: 'Export only the lineup.',
            type: ApplicationCommandOptionType.Boolean
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
        name: 'users',
        description: 'Export Discord members',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'role',
            description: 'Role to filter users.',
            type: ApplicationCommandOptionType.Role
          }
        ]
      },
      {
        name: 'attack-log',
        description: 'Export war attack history.',
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
            description: 'CWL or Regular wars (default to Regular and CWL)',
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
              }
            ]
          },
          {
            name: 'limit',
            min_value: 1,
            max_value: 100,
            description: command.export.options.wars.description,
            description_localizations: translation('command.export.options.wars.description'),
            type: ApplicationCommandOptionType.Integer
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
            choices: SEASON_SINCE_CHOICES
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
            min_value: 1,
            max_value: 100,
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
            max_value: 100,
            min_value: 1,
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
      },
      {
        name: 'rosters',
        description: 'Export all rosters.',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'category',
            description: 'Roster category.',
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: 'CWL',
                value: 'CWL'
              },
              {
                name: 'WAR',
                value: 'WAR'
              },
              {
                name: 'ESPORTS',
                value: 'ESPORTS'
              }
            ]
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
        name: 'army_name',
        description: command.army.options.name.description,
        description_localizations: translation('command.army.options.name.description'),
        type: ApplicationCommandOptionType.String,
        required: false
      },
      {
        name: 'equipment',
        description: 'Hero equipment (type anything)',
        type: ApplicationCommandOptionType.String,
        max_length: 600,
        required: false
      },
      {
        name: 'pets',
        description: 'Hero pets (type anything)',
        type: ApplicationCommandOptionType.String,
        max_length: 600,
        required: false
      },
      {
        name: 'clan_castle',
        description: 'Clan castle (type anything)',
        type: ApplicationCommandOptionType.String,
        max_length: 600,
        required: false
      },
      {
        name: 'tips',
        description: 'Some tips (type anything)',
        type: ApplicationCommandOptionType.String,
        max_length: 600,
        required: false
      }
    ]
  },
  {
    name: 'nickname',
    description: command.nickname.description,
    dm_permission: false,
    options: [
      {
        name: 'config',
        description: command.nickname.config.description,
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'family_nickname_format',
            description: 'Set family nickname format (e.g. {CLAN} | {ALIAS} | {TH} | {ROLE} | {NAME})',
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'non_family_nickname_format',
            description: 'Set non-family nickname format (e.g. {NAME} | {TH})',
            type: ApplicationCommandOptionType.String
          },
          {
            name: 'change_nicknames',
            description: 'Whether to update nicknames automatically.',
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
            name: 'account_preference_for_naming',
            description: 'Whether to use the default account or the best account in the family.',
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: 'Default Account',
                value: 'default-account'
              },
              {
                name: 'Best Account',
                value: 'best-account'
              },
              {
                name: 'Default or Best Account',
                value: 'default-or-best-account'
              }
            ]
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
    ],
    ...userInstallable
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
    description_localizations: translation('command.invite.description'),
    ...userInstallable
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
        name: 'bot_manager_role',
        description: command.config.options.manager_role.description,
        description_localizations: translation('command.config.options.manager_role.description'),
        type: ApplicationCommandOptionType.Role
      },
      {
        name: 'roster_manager_role',
        description: command.config.options.roster_manager_role.description,
        description_localizations: translation('command.config.options.roster_manager_role.description'),
        type: ApplicationCommandOptionType.Role
      },
      {
        name: 'flags_manager_role',
        description: command.config.options.flags_manager_role.description,
        description_localizations: translation('command.config.options.flags_manager_role.description'),
        type: ApplicationCommandOptionType.Role
      },
      {
        name: 'links_manager_role',
        description: command.config.options.links_manager_role.description,
        description_localizations: translation('command.config.options.links_manager_role.description'),
        type: ApplicationCommandOptionType.Role
      },
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
        name: 'webhook_limit',
        description: 'The maximum number of webhooks that can be created in a channel.',
        type: ApplicationCommandOptionType.Integer,
        max_value: 8,
        min_value: 3
      }
    ]
  },
  {
    name: 'whitelist',
    description: '[Experimental] Whitelist a role or user to use specific commands.',
    dm_permission: false,
    options: [
      {
        name: 'user_or_role',
        description: 'User or role to whitelist.',
        type: ApplicationCommandOptionType.Mentionable
      },
      {
        name: 'command',
        description: 'Command to whitelist.',
        type: ApplicationCommandOptionType.String,
        autocomplete: true
      },
      {
        name: 'clear',
        description: 'Clear the whitelist.',
        type: ApplicationCommandOptionType.Boolean
      },
      {
        name: 'list',
        description: 'List all whitelisted users and roles.',
        type: ApplicationCommandOptionType.Boolean
      }
    ]
  },
  {
    name: 'clans',
    description: 'Show all linked clans.',
    dm_permission: false
  },
  {
    name: 'layout',
    description: 'Post a village layout.',
    dm_permission: false,
    options: [
      {
        name: 'screenshot',
        description: 'Screenshot of the layout.',
        required: true,
        type: ApplicationCommandOptionType.Attachment
      },
      {
        name: 'layout_link',
        description: 'Shareable link of the layout.',
        required: true,
        max_length: 100,
        type: ApplicationCommandOptionType.String
      },
      {
        name: 'title',
        description: 'Title of the layout.',
        max_length: 2000,
        type: ApplicationCommandOptionType.String
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
    name: 'translate',
    type: ApplicationCommandType.Message,
    dm_permission: false,
    ...userInstallable
  }
];

export const MAIN_BOT_ONLY_COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    name: 'bot-personalizer',
    dm_permission: false,
    description: 'Build your own Discord bot!',
    options: [
      {
        name: 'opt_out',
        description: 'Opt-out from the custom bot and delete related services.',
        type: ApplicationCommandOptionType.Boolean
      }
    ]
  }
];

export const PRIVATE_COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    name: 'status',
    description: "Shows information about the bot's status.",
    dm_permission: true
  },
  {
    name: 'patreon',
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

export const HIDDEN_COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    name: 'clan-history',
    description: "You can't use it anyway, so why explain?",
    dm_permission: true,
    default_member_permissions: '0',
    options: [
      {
        name: 'tag',
        description: 'It does something, yeah?',
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true
      }
    ]
  }
];
