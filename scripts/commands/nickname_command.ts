import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const NICKNAME_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'nickname',
  description: command.nickname.description,
  description_localizations: translation('command.nickname.description'),
  dm_permission: false,
  options: [
    {
      name: 'config',
      description: command.nickname.config.description,
      description_localizations: translation('command.nickname.config.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'family_nickname_format',
          description: command.nickname.config.options.family_nickname_format.description,
          description_localizations: translation(
            'command.nickname.config.options.family_nickname_format.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'non_family_nickname_format',
          description: command.nickname.config.options.non_family_nickname_format.description,
          description_localizations: translation(
            'command.nickname.config.options.non_family_nickname_format.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'change_nicknames',
          description: command.nickname.config.options.change_nicknames.description,
          description_localizations: translation(
            'command.nickname.config.options.change_nicknames.description'
          ),
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
          name: 'account_preference_for_naming',
          description: command.nickname.config.options.account_preference_for_naming.description,
          description_localizations: translation(
            'command.nickname.config.options.account_preference_for_naming.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.nickname.default_account,
              name_localizations: translation('common.choices.nickname.default_account'),
              value: 'default-account'
            },
            {
              name: common.choices.nickname.best_account,
              name_localizations: translation('common.choices.nickname.best_account'),
              value: 'best-account'
            },
            {
              name: common.choices.nickname.default_or_best_account,
              name_localizations: translation('common.choices.nickname.default_or_best_account'),
              value: 'default-or-best-account'
            }
          ]
        }
      ]
    }
  ]
};
