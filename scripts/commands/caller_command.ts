import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const CALLER_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'caller',
  description: command.caller.description,
  description_localizations: translation('command.caller.description'),
  dm_permission: false,
  options: [
    {
      name: 'assign',
      description: command.caller.assign.description,
      description_localizations: translation('command.caller.assign.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'defense_target',
          description: command.caller.options.defense_target.description,
          description_localizations: translation(
            'command.caller.options.defense_target.description'
          ),
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 50
        },
        {
          name: 'offense_target',
          description: command.caller.assign.options.offense_target.description,
          description_localizations: translation(
            'command.caller.assign.options.offense_target.description'
          ),
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 50
        },
        {
          name: 'notes',
          description: command.caller.assign.options.notes.description,
          description_localizations: translation('command.caller.assign.options.notes.description'),
          type: ApplicationCommandOptionType.String,
          required: false
        },
        {
          name: 'hours',
          description: command.caller.assign.options.hours.description,
          description_localizations: translation('command.caller.assign.options.hours.description'),
          type: ApplicationCommandOptionType.Number,
          required: false
        }
      ]
    },
    {
      name: 'clear',
      description: command.caller.clear.description,
      description_localizations: translation('command.caller.clear.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'defense_target',
          description: command.caller.options.defense_target.description,
          description_localizations: translation(
            'command.caller.options.defense_target.description'
          ),
          type: ApplicationCommandOptionType.Number,
          required: true,
          min_value: 1,
          max_value: 50
        }
      ]
    }
  ]
};
