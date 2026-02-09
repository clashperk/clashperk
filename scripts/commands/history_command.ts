import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const HISTORY_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'history',
  description: command.history.description,
  description_localizations: translation('command.history.description'),
  dm_permission: false,
  options: [
    {
      name: 'option',
      required: true,
      description: common.select_an_option,
      description_localizations: translation('common.select_an_option'),
      type: ApplicationCommandOptionType.String,
      choices: [
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
          name: common.choices.history.capital_contribution,
          name_localizations: translation('common.choices.history.capital_contribution'),
          value: 'capital-contribution'
        },
        {
          name: common.choices.history.cwl_attacks,
          name_localizations: translation('common.choices.history.cwl_attacks'),
          value: 'cwl-attacks'
        },
        {
          name: common.choices.war_attacks,
          name_localizations: translation('common.choices.war_attacks'),
          value: 'war-attacks'
        },
        {
          name: common.choices.history.donations,
          name_localizations: translation('common.choices.history.donations'),
          value: 'donations'
        },
        {
          name: common.choices.history.attacks,
          name_localizations: translation('common.choices.history.attacks'),
          value: 'attacks'
        },
        {
          name: common.choices.history.loot,
          name_localizations: translation('common.choices.history.loot'),
          value: 'loot'
        },
        {
          name: common.choices.history.join_leave,
          name_localizations: translation('common.choices.history.join_leave'),
          value: 'join-leave'
        },
        {
          name: common.choices.history.legend_attacks,
          name_localizations: translation('common.choices.history.legend_attacks'),
          value: 'legend-attacks'
        },
        {
          name: common.choices.history.eos_trophies,
          name_localizations: translation('common.choices.history.eos_trophies'),
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
    },
    {
      name: 'roster',
      autocomplete: true,
      description: command.history.options.roster.description,
      description_localizations: translation('command.history.options.roster.description'),
      type: ApplicationCommandOptionType.String
    }
  ]
};
