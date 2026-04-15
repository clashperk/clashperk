import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

export const TICKET_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'ticket',
  description: 'Ticket system for managing applications and support requests',
  dm_permission: false,
  options: [
    {
      name: 'setup',
      description: 'Create or edit a ticket panel configuration',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel_name',
          description: 'Name of the panel to create or edit',
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        }
      ]
    },
    {
      name: 'post',
      description: 'Post a ticket panel to the current channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel_name',
          description: 'Name of the panel to post',
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        }
      ]
    },
    {
      name: 'info',
      description: 'View the configuration of a ticket panel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel_name',
          description: 'Name of the panel to view',
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        }
      ]
    },
    {
      name: 'delete',
      description: 'Delete a ticket panel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel_name',
          description: 'Name of the panel to delete',
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        }
      ]
    },
    {
      name: 'close',
      description: 'Close this ticket (generates transcript and deletes channel)',
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: 'sleep',
      description: 'Put this ticket to sleep (remove user access, move to sleep category)',
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: 'reopen',
      description: 'Reopen a sleeping ticket (restore user access)',
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: 'add',
      description: 'Add a member to this ticket channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'member',
          description: 'The member to add',
          type: ApplicationCommandOptionType.User,
          required: true
        }
      ]
    }
  ]
};
