import { MessageComponentInteraction, MessageFlags, StringSelectMenuInteraction } from 'discord.js';
import { i18n } from '../util/i18n.js';
import { Client } from './client.js';

export interface CustomIdProps {
  cmd: string;
  ephemeral?: boolean;
  flags?: never;
  /** It defaults to `true` */
  defer?: false;
  array_key?: string;
  string_key?: string;
  user_id?: string;
  is_locked?: boolean;
  [key: string]: unknown;
}

const deferredDisallowed = ['link-add'];

export default class ComponentHandler {
  public constructor(private readonly client: Client) {}

  public async exec(interaction: MessageComponentInteraction) {
    const parsed = await this.parseCommandId(interaction.customId);
    if (!parsed) return false;

    const command = this.client.commandHandler.getCommand(parsed.cmd);
    if (!command) return false;

    if (!interaction.inCachedGuild() && command.channel !== 'dm') return true;
    if (interaction.inCachedGuild() && !interaction.channel) return true;

    if (
      parsed.is_locked &&
      interaction.message.interactionMetadata &&
      interaction.message.interactionMetadata?.user.id !== interaction.user.id
    ) {
      await interaction.reply({
        content: i18n('common.component.unauthorized', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const deferredDisabled = parsed.hasOwnProperty('defer') && !parsed.defer;
    if (!deferredDisallowed.includes(parsed.cmd) && !deferredDisabled) {
      if (parsed.ephemeral) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      } else {
        await interaction.deferUpdate();
      }
    }

    if (parsed.user_id) {
      parsed.user = await this.client.users.fetch(parsed.user_id as string).catch(() => null);
    }

    const selected = interaction.isStringSelectMenu() ? this.resolveMenu(interaction, parsed) : {};
    await this.client.commandHandler.exec(interaction, command, { ...parsed, ...selected });
    return true;
  }

  private resolveMenu(interaction: StringSelectMenuInteraction, parsed: CustomIdProps) {
    const values = interaction.values;
    if (parsed.array_key) return { [parsed.array_key]: values };
    if (parsed.string_key) return { [parsed.string_key]: values.at(0) };
    return { selected: values };
  }

  private async parseCommandId(customId: string): Promise<CustomIdProps | null> {
    if (/^{.*}$/.test(customId)) return JSON.parse(customId);
    if (/^CMD/.test(customId)) {
      return this.client.redis.getCustomId<CustomIdProps>(customId);
    }
    return null;
  }
}
