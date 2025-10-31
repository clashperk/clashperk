import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const ACTIVITY_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
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
};
