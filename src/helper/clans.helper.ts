import {
  ActionRowBuilder,
  CommandInteraction,
  MessageComponentInteraction,
  MessageType,
  StringSelectMenuBuilder
} from 'discord.js';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';

export const getClanSwitchingMenu = async (
  interaction: CommandInteraction | MessageComponentInteraction,
  customId: string,
  defaultTag?: string
) => {
  if (!interaction.guildId) return null;

  const client = container.resolve(Client);

  const clans = await client.storage.find(interaction.guildId);
  const clanMenu = new StringSelectMenuBuilder()
    .setPlaceholder('Select a clan!')
    .setCustomId(customId)
    .addOptions(
      clans.slice(0, 25).map((_clan) => ({
        label: `${_clan.name} (${_clan.tag})`,
        value: _clan.tag,
        default: defaultTag === _clan.tag
      }))
    );
  const clanRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(clanMenu);

  const allowedInteraction = interaction.isMessageComponent()
    ? interaction.message.type === MessageType.ChatInputCommand
    : interaction.isCommand();

  if (clans.length > 1 && clans.length <= 25 && allowedInteraction) return clanRow;
  return null;
};
