import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { getRaidWeekIds, translation } from './@helper.js';

export const CAPITAL_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
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
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'user',
          description: common.options.clan.user.description,
          description_localizations: translation('common.options.clan.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        },
        {
          name: 'week',
          description: common.options.week.description,
          description_localizations: translation('common.options.week.description'),
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: getRaidWeekIds()
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
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'user',
          description: common.options.clan.user.description,
          description_localizations: translation('common.options.clan.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        },
        {
          name: 'week',
          description: command.capital.contribution.options.week.description,
          description_localizations: translation(
            'command.capital.contribution.options.week.description'
          ),
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: getRaidWeekIds()
        }
      ]
    }
  ]
};
