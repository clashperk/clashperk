import { MAX_TOWN_HALL_LEVEL } from '@app/constants';
import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { RosterCommandSortOptions, RosterManageActions } from '../../src/util/command.options.js';
import { command, common } from '../../src/util/locales.js';
import { channelTypes, translation } from './@helper.js';

export const ROSTER_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'roster',
  description: command.roster.description,
  description_localizations: translation('command.roster.description'),
  dm_permission: false,
  options: [
    {
      name: 'create',
      description: command.roster.create.description,
      description_localizations: translation('command.roster.create.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clan',
          description: command.roster.create.options.clan.description,
          description_localizations: translation('command.roster.create.options.clan.description'),
          autocomplete: true,
          required: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'name',
          description: command.roster.create.options.name.description,
          description_localizations: translation('command.roster.create.options.name.description'),
          required: true,
          max_length: 30,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'category',
          description: command.roster.create.options.category.description,
          description_localizations: translation(
            'command.roster.create.options.category.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.cwl,
              name_localizations: translation('common.choices.cwl'),
              value: 'CWL'
            },
            {
              name: common.choices.war,
              name_localizations: translation('common.choices.war'),
              value: 'WAR'
            },
            {
              name: common.choices.e_sports,
              name_localizations: translation('common.choices.e_sports'),
              value: 'ESPORTS'
            },
            {
              name: common.choices.trophy,
              name_localizations: translation('common.choices.trophy'),
              value: 'TROPHY'
            }
          ]
        },
        {
          name: 'import_members',
          description: command.roster.create.options.import_members.description,
          description_localizations: translation(
            'command.roster.create.options.import_members.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'allow_unlinked',
          description: command.roster.create.options.allow_unlinked.description,
          description_localizations: translation(
            'command.roster.create.options.allow_unlinked.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'max_members',
          min_value: 5,
          max_value: 500,
          description: command.roster.create.options.max_members.description,
          description_localizations: translation(
            'command.roster.create.options.max_members.description'
          ),
          type: ApplicationCommandOptionType.Integer
        },
        {
          name: 'max_accounts_per_user',
          min_value: 1,
          max_value: 75,
          description: command.roster.create.options.max_accounts_per_user.description,
          description_localizations: translation(
            'command.roster.create.options.max_accounts_per_user.description'
          ),
          type: ApplicationCommandOptionType.Integer
        },
        {
          name: 'min_town_hall',
          description: command.roster.create.options.min_town_hall.description,
          description_localizations: translation(
            'command.roster.create.options.min_town_hall.description'
          ),
          type: ApplicationCommandOptionType.Integer,
          min_value: 2,
          max_value: MAX_TOWN_HALL_LEVEL
        },
        {
          name: 'max_town_hall',
          description: command.roster.create.options.max_town_hall.description,
          description_localizations: translation(
            'command.roster.create.options.max_town_hall.description'
          ),
          type: ApplicationCommandOptionType.Integer,
          min_value: 2,
          max_value: MAX_TOWN_HALL_LEVEL
        },
        {
          name: 'min_hero_level',
          min_value: 0,
          description: command.roster.create.options.min_hero_level.description,
          description_localizations: translation(
            'command.roster.create.options.min_hero_level.description'
          ),
          type: ApplicationCommandOptionType.Integer
        },
        {
          name: 'roster_role',
          description: command.roster.create.options.roster_role.description,
          description_localizations: translation(
            'command.roster.create.options.roster_role.description'
          ),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'sort_by',
          description: command.roster.create.options.sort_by.description,
          description_localizations: translation(
            'command.roster.create.options.sort_by.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [...RosterCommandSortOptions]
        },
        {
          name: 'start_time',
          description: command.roster.create.options.start_time.description,
          description_localizations: translation(
            'command.roster.create.options.start_time.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'end_time',
          description: command.roster.create.options.end_time.description,
          description_localizations: translation(
            'command.roster.create.options.end_time.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'timezone',
          autocomplete: true,
          description: command.roster.create.options.timezone.description,
          description_localizations: translation(
            'command.roster.create.options.timezone.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'allow_group_selection',
          description: command.roster.create.options.allow_group_selection.description,
          description_localizations: translation(
            'command.roster.create.options.allow_group_selection.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'allow_multi_signup',
          description: command.roster.create.options.allow_multi_signup.description,
          description_localizations: translation(
            'command.roster.create.options.allow_multi_signup.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'use_clan_alias',
          description: command.roster.create.options.use_clan_alias.description,
          description_localizations: translation(
            'command.roster.create.options.use_clan_alias.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'roster_image_url',
          description: command.roster.create.options.roster_image_url.description,
          description_localizations: translation(
            'command.roster.create.options.roster_image_url.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'color_code',
          description: command.roster.create.options.color_code.description,
          description_localizations: translation(
            'command.roster.create.options.color_code.description'
          ),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'post',
      description: command.roster.post.description,
      description_localizations: translation('command.roster.post.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'roster',
          autocomplete: true,
          required: true,
          description: command.roster.post.options.roster.description,
          description_localizations: translation('command.roster.post.options.roster.description'),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'clone',
      description: command.roster.clone.description,
      description_localizations: translation('command.roster.clone.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'roster',
          autocomplete: true,
          required: true,
          description: command.roster.clone.options.roster.description,
          description_localizations: translation('command.roster.clone.options.roster.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'name',
          description: command.roster.clone.options.name.description,
          description_localizations: translation('command.roster.clone.options.name.description'),
          max_length: 30,
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'list',
      description: command.roster.list.description,
      description_localizations: translation('command.roster.list.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'name',
          description: command.roster.list.options.name.description,
          description_localizations: translation('command.roster.list.options.name.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'user',
          description: command.roster.list.options.user.description,
          description_localizations: translation('command.roster.list.options.user.description'),
          type: ApplicationCommandOptionType.User
        },
        {
          name: 'player',
          description: command.roster.list.options.player.description,
          description_localizations: translation('command.roster.list.options.player.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        },
        {
          name: 'clan',
          description: command.roster.list.options.clan.description,
          description_localizations: translation('command.roster.list.options.clan.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        }
      ]
    },
    {
      name: 'edit',
      description: command.roster.edit.description,
      description_localizations: translation('command.roster.edit.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'roster',
          description: command.roster.edit.options.roster.description,
          description_localizations: translation('command.roster.edit.options.roster.description'),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'name',
          description: command.roster.create.options.name.description,
          description_localizations: translation('command.roster.create.options.name.description'),
          max_length: 30,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'category',
          description: command.roster.create.options.category.description,
          description_localizations: translation(
            'command.roster.create.options.category.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.cwl,
              name_localizations: translation('common.choices.cwl'),
              value: 'CWL'
            },
            {
              name: common.choices.war,
              name_localizations: translation('common.choices.war'),
              value: 'WAR'
            },
            {
              name: common.choices.e_sports,
              name_localizations: translation('common.choices.e_sports'),
              value: 'ESPORTS'
            },
            {
              name: common.choices.trophy,
              name_localizations: translation('common.choices.trophy'),
              value: 'TROPHY'
            }
          ]
        },
        {
          name: 'clan',
          description: command.roster.create.options.clan.description,
          description_localizations: translation('command.roster.create.options.clan.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'detach_clan',
          description: command.roster.edit.options.detach_clan.description,
          description_localizations: translation(
            'command.roster.edit.options.detach_clan.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'allow_unlinked',
          description: command.roster.create.options.allow_unlinked.description,
          description_localizations: translation(
            'command.roster.create.options.allow_unlinked.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'max_members',
          description: command.roster.create.options.max_members.description,
          description_localizations: translation(
            'command.roster.create.options.max_members.description'
          ),
          min_value: 5,
          max_value: 500,
          type: ApplicationCommandOptionType.Integer
        },
        {
          name: 'max_accounts_per_user',
          min_value: 1,
          max_value: 75,
          description: command.roster.create.options.max_accounts_per_user.description,
          description_localizations: translation(
            'command.roster.create.options.max_accounts_per_user.description'
          ),
          type: ApplicationCommandOptionType.Integer
        },
        {
          name: 'min_town_hall',
          max_value: MAX_TOWN_HALL_LEVEL,
          min_value: 2,
          description: command.roster.create.options.min_town_hall.description,
          description_localizations: translation(
            'command.roster.create.options.min_town_hall.description'
          ),
          type: ApplicationCommandOptionType.Integer
        },
        {
          name: 'max_town_hall',
          description: command.roster.create.options.max_town_hall.description,
          description_localizations: translation(
            'command.roster.create.options.max_town_hall.description'
          ),
          type: ApplicationCommandOptionType.Integer,
          min_value: 2,
          max_value: MAX_TOWN_HALL_LEVEL
        },
        {
          name: 'min_hero_level',
          min_value: 0,
          description: command.roster.create.options.min_hero_level.description,
          description_localizations: translation(
            'command.roster.create.options.min_hero_level.description'
          ),
          type: ApplicationCommandOptionType.Integer
        },
        {
          name: 'roster_role',
          description: command.roster.create.options.roster_role.description,
          description_localizations: translation(
            'command.roster.create.options.roster_role.description'
          ),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'sort_by',
          description: command.roster.create.options.sort_by.description,
          description_localizations: translation(
            'command.roster.create.options.sort_by.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [...RosterCommandSortOptions]
        },
        {
          name: 'delete_role',
          description: command.roster.edit.options.delete_role.description,
          description_localizations: translation(
            'command.roster.edit.options.delete_role.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'start_time',
          description: command.roster.create.options.start_time.description,
          description_localizations: translation(
            'command.roster.create.options.start_time.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'end_time',
          description: command.roster.create.options.end_time.description,
          description_localizations: translation(
            'command.roster.create.options.end_time.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'timezone',
          autocomplete: true,
          description: command.roster.create.options.timezone.description,
          description_localizations: translation(
            'command.roster.create.options.timezone.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'allow_group_selection',
          description: command.roster.create.options.allow_group_selection.description,
          description_localizations: translation(
            'command.roster.create.options.allow_group_selection.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'allow_multi_signup',
          description: command.roster.create.options.allow_multi_signup.description,
          description_localizations: translation(
            'command.roster.create.options.allow_multi_signup.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'use_clan_alias',
          description: command.roster.create.options.use_clan_alias.description,
          description_localizations: translation(
            'command.roster.create.options.use_clan_alias.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'roster_image_url',
          description: command.roster.create.options.roster_image_url.description,
          description_localizations: translation(
            'command.roster.create.options.roster_image_url.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'color_code',
          description: command.roster.create.options.color_code.description,
          description_localizations: translation(
            'command.roster.create.options.color_code.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'log_channel',
          description: command.roster.edit.options.log_channel.description,
          description_localizations: translation(
            'command.roster.edit.options.log_channel.description'
          ),
          type: ApplicationCommandOptionType.Channel,
          channel_types: channelTypes
        },
        {
          name: 'delete_log_channel',
          description: command.roster.edit.options.delete_log_channel.description,
          description_localizations: translation(
            'command.roster.edit.options.delete_log_channel.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        }
      ]
    },
    {
      name: 'delete',
      description: command.roster.delete.description,
      description_localizations: translation('command.roster.delete.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'roster',
          description: command.roster.delete.options.roster.description,
          description_localizations: translation(
            'command.roster.delete.options.roster.description'
          ),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'manage',
      description: command.roster.manage.description,
      description_localizations: translation('command.roster.manage.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'roster',
          description: command.roster.manage.options.roster.description,
          description_localizations: translation(
            'command.roster.manage.options.roster.description'
          ),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'action',
          description: command.roster.manage.options.action.description,
          description_localizations: translation(
            'command.roster.manage.options.action.description'
          ),
          required: true,
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.roster.add_players,
              name_localizations: translation('common.choices.roster.add_players'),
              value: RosterManageActions.ADD_USER
            },
            {
              name: common.choices.roster.remove_players,
              name_localizations: translation('common.choices.roster.remove_players'),
              value: RosterManageActions.DEL_USER
            },
            {
              name: common.choices.roster.change_roster,
              name_localizations: translation('common.choices.roster.change_roster'),
              value: RosterManageActions.CHANGE_ROSTER
            },
            {
              name: common.choices.roster.change_group,
              name_localizations: translation('common.choices.roster.change_group'),
              value: RosterManageActions.CHANGE_CATEGORY
            }
          ]
        },
        {
          name: 'player',
          autocomplete: true,
          description: command.roster.manage.options.player.description,
          description_localizations: translation(
            'command.roster.manage.options.player.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'user',
          description: command.roster.manage.options.user.description,
          description_localizations: translation('command.roster.manage.options.user.description'),
          type: ApplicationCommandOptionType.User
        },
        {
          name: 'from_clan',
          autocomplete: true,
          description: command.roster.manage.options.from_clan.description,
          description_localizations: translation(
            'command.roster.manage.options.from_clan.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'from_current_wars',
          autocomplete: true,
          description: command.roster.manage.options.from_current_wars.description,
          description_localizations: translation(
            'command.roster.manage.options.from_current_wars.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'target_group',
          autocomplete: true,
          description: command.roster.manage.options.target_group.description,
          description_localizations: translation(
            'command.roster.manage.options.target_group.description'
          ),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'target_roster',
          autocomplete: true,
          description: command.roster.manage.options.target_roster.description,
          description_localizations: translation(
            'command.roster.manage.options.target_roster.description'
          ),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'groups',
      description: command.roster.groups.description,
      description_localizations: translation('command.roster.groups.description'),
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: 'create',
          description: command.roster.groups.create.description,
          description_localizations: translation('command.roster.groups.create.description'),
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'name',
              description: command.roster.groups.options.name.description,
              description_localizations: translation(
                'command.roster.groups.options.name.description'
              ),
              required: true,
              max_length: 30,
              type: ApplicationCommandOptionType.String
            },
            {
              name: 'group_role',
              description: command.roster.groups.options.group_role.description,
              description_localizations: translation(
                'command.roster.groups.options.group_role.description'
              ),
              type: ApplicationCommandOptionType.Role
            },
            {
              name: 'selectable',
              description: command.roster.groups.options.selectable.description,
              description_localizations: translation(
                'command.roster.groups.options.selectable.description'
              ),
              type: ApplicationCommandOptionType.Boolean
            }
          ]
        },
        {
          name: 'modify',
          description: command.roster.groups.modify.description,
          description_localizations: translation('command.roster.groups.modify.description'),
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'group',
              autocomplete: true,
              required: true,
              description: command.roster.groups.options.group.description,
              description_localizations: translation(
                'command.roster.groups.options.group.description'
              ),
              type: ApplicationCommandOptionType.String
            },
            {
              name: 'name',
              description: command.roster.groups.options.name.description,
              description_localizations: translation(
                'command.roster.groups.options.name.description'
              ),
              max_length: 30,
              type: ApplicationCommandOptionType.String
            },
            {
              name: 'order',
              description: command.roster.groups.options.order.description,
              description_localizations: translation(
                'command.roster.groups.options.order.description'
              ),
              type: ApplicationCommandOptionType.Integer,
              max_value: 1000,
              min_value: 1
            },
            {
              name: 'group_role',
              description: command.roster.groups.options.group_role.description,
              description_localizations: translation(
                'command.roster.groups.options.group_role.description'
              ),
              type: ApplicationCommandOptionType.Role
            },
            {
              name: 'selectable',
              description: command.roster.groups.options.selectable.description,
              description_localizations: translation(
                'command.roster.groups.options.selectable.description'
              ),
              type: ApplicationCommandOptionType.Boolean
            },
            {
              name: 'delete_role',
              description: command.roster.groups.options.delete_role.description,
              description_localizations: translation(
                'command.roster.groups.options.delete_role.description'
              ),
              type: ApplicationCommandOptionType.Boolean
            },
            {
              name: 'delete_group',
              description: command.roster.groups.options.delete_group.description,
              description_localizations: translation(
                'command.roster.groups.options.delete_group.description'
              ),
              type: ApplicationCommandOptionType.Boolean
            }
          ]
        }
      ]
    },
    {
      name: 'ping',
      description: command.roster.ping.description,
      description_localizations: translation('command.roster.ping.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'roster',
          description: command.roster.ping.options.roster.description,
          description_localizations: translation('command.roster.ping.options.roster.description'),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'message',
          description: command.roster.ping.options.message.description,
          description_localizations: translation('command.roster.ping.options.message.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'ping_option',
          description: command.roster.ping.options.ping_option.description,
          description_localizations: translation(
            'command.roster.ping.options.ping_option.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.roster.ping_unregistered,
              name_localizations: translation('common.choices.roster.ping_unregistered'),
              value: 'unregistered'
            },
            {
              name: common.choices.roster.ping_missing,
              name_localizations: translation('common.choices.roster.ping_missing'),
              value: 'missing'
            },
            {
              name: common.choices.roster.ping_everyone,
              name_localizations: translation('common.choices.roster.ping_everyone'),
              value: 'everyone'
            }
          ]
        },
        {
          name: 'group',
          description: command.roster.ping.options.group.description,
          description_localizations: translation('command.roster.ping.options.group.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        }
      ]
    }
  ]
};
