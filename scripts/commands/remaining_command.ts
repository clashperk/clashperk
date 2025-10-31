import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const REMAINING_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
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
          name: common.choices.war_attacks,
          name_localizations: translation('common.choices.war_attacks'),
          value: 'war-attacks'
        },
        {
          name: common.choices.clan_games,
          name_localizations: translation('common.choices.clan_games'),
          value: 'clan-games'
        },
        {
          name: common.choices.capital_raids,
          name_localizations: translation('common.choices.capital_raids'),
          value: 'capital-raids'
        },
        {
          name: 'Legend Attacks',
          value: 'legend-attacks'
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
      description: command.war.options.war_id.description,
      description_localizations: translation('command.war.options.war_id.description'),
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ]
};
