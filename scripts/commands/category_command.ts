import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const CATEGORY_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'category',
  description: command.category.description,
  description_localizations: translation('command.category.description'),
  dm_permission: false,
  options: [
    {
      name: 'create',
      description: command.category.create.description,
      description_localizations: translation('command.category.create.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category_name',
          max_length: 36,
          description: command.category.options.category_name.description,
          description_localizations: translation('command.category.options.category_name.description'),
          required: true,
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'list',
      description: command.category.list.description,
      description_localizations: translation('command.category.list.description'),
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: 'edit',
      description: command.category.edit.description,
      description_localizations: translation('command.category.edit.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category',
          description: command.category.options.category.description,
          description_localizations: translation('command.category.options.category.description'),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'category_name',
          max_length: 36,
          description: command.category.options.category_name.description,
          description_localizations: translation('command.category.options.category_name.description'),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'delete',
      description: command.category.delete.description,
      description_localizations: translation('command.category.delete.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category',
          description: command.category.options.category.description,
          description_localizations: translation('command.category.options.category.description'),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        }
      ]
    }
  ]
};
