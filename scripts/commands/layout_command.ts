import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const LAYOUT_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'layout',
  description: command.layout.description,
  description_localizations: translation('command.layout.description'),
  dm_permission: false,
  options: [
    {
      name: 'post',
      description: command.layout.post.description,
      description_localizations: translation('command.layout.post.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'screenshot',
          description: command.layout.post.options.screenshot.description,
          description_localizations: translation('command.layout.post.options.screenshot.description'),
          required: true,
          type: ApplicationCommandOptionType.Attachment
        },
        {
          name: 'layout_link',
          description: command.layout.post.options.layout_link.description,
          description_localizations: translation('command.layout.post.options.layout_link.description'),
          required: true,
          max_length: 200,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'notes',
          description: command.layout.post.options.notes.description,
          description_localizations: translation('command.layout.post.options.notes.description'),
          max_length: 2000,
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'config',
      description: command.layout.config.description,
      description_localizations: translation('command.layout.config.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'allow_voting',
          description: command.layout.config.options.allow_voting.description,
          description_localizations: translation('command.layout.config.options.allow_voting.description'),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'allow_tracking',
          description: command.layout.config.options.allow_tracking.description,
          description_localizations: translation('command.layout.config.options.allow_tracking.description'),
          type: ApplicationCommandOptionType.Boolean
        }
      ]
    }
  ]
};
