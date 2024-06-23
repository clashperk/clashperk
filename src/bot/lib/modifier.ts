import {
  CommandInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  PermissionFlagsBits
} from 'discord.js';

function isEphemeral(interaction: CommandInteraction | MessageComponentInteraction) {
  if (!interaction.inGuild()) return false;
  if (!interaction.inCachedGuild()) return true;

  if (interaction.channel?.isThread()) {
    return !interaction.appPermissions.has([PermissionFlagsBits.SendMessagesInThreads]);
  }

  return !interaction.appPermissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]);
}

for (const Interaction of [CommandInteraction, ContextMenuCommandInteraction, MessageComponentInteraction, ModalSubmitInteraction]) {
  const _reply = Interaction.prototype.reply;

  Object.defineProperty(Interaction.prototype, 'reply', {
    value: function reply(record: Record<string, unknown>) {
      if (isEphemeral(this)) record.ephemeral = true;
      return _reply.call(this, record);
    }
  });

  const _deferReply = Interaction.prototype.deferReply;

  Object.defineProperty(Interaction.prototype, 'deferReply', {
    value: function deferReply(record: Record<string, unknown>) {
      if (isEphemeral(this)) record.ephemeral = true;
      return _deferReply.call(this, record);
    }
  });

  const _followUp = Interaction.prototype.followUp;

  Object.defineProperty(Interaction.prototype, 'followUp', {
    value: function followUp(record: Record<string, unknown>) {
      if (isEphemeral(this)) record.ephemeral = true;
      return _followUp.call(this, record);
    }
  });
}
