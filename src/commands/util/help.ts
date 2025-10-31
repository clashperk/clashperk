import { CommandCategories } from '@app/constants';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandSubCommand,
  ApplicationCommandType,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder
} from 'discord.js';
import i18next from 'i18next';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';

const categoryMap: Record<string, string> = {
  [CommandCategories.SEARCH]: 'Player and Clan',
  [CommandCategories.ACTIVITY]: 'Player and Clan',

  [CommandCategories.WAR]: 'War, CWL and Rosters',
  [CommandCategories.ROSTER]: 'War, CWL and Rosters',

  [CommandCategories.SUMMARY]: 'Exports, Summary, History',
  [CommandCategories.EXPORT]: 'Exports, Summary, History',

  [CommandCategories.LINK]: 'Player Links and Flags',
  [CommandCategories.FLAG]: 'Player Links and Flags',
  [CommandCategories.PROFILE]: 'Player Links and Flags',

  [CommandCategories.REMINDERS]: 'Reminders and Auto Roles',
  [CommandCategories.ROLES]: 'Reminders and Auto Roles',

  [CommandCategories.CONFIG]: 'Server Settings',
  [CommandCategories.SETUP]: 'Server Settings'
};

interface CommandInfo {
  id: string;
  name: string;
  rootName: string;
  description: string;
  category: string;
  isRestricted?: number;
  translationKey: string;
}

export default class HelpCommand extends Command {
  public constructor() {
    super('help', {
      category: 'none',
      channel: 'dm',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { command?: string; category?: string; selected?: string; expand?: boolean }
  ) {
    const commands = await this.getCommands(interaction);

    const command = commands.find((command) => command.rootName === args.command || command.name === args.command);
    if (!command) return this.commandMenu(interaction, commands, args);

    const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
    embed.setDescription(
      [
        `## </${command.name}:${command.id}> ${command.isRestricted ? EMOJIS.OWNER : ''}`,
        '\u200b',
        `${this.translate(command.translationKey, interaction.locale) || command.description}`,
        //
        command.options.length ? '### Options' : '',
        ...command.options.map((option) => `\`${option.name}\` -- ${option.description}\n`)
      ].join('\n')
    );

    return interaction.editReply({ embeds: [embed] });
  }

  public async commandMenu(
    interaction: CommandInteraction<'cached'>,
    commands: CommandInfo[],
    args: { category?: string; expand?: boolean }
  ) {
    const grouped = commands.reduce<Record<string, CommandInfo[]>>((acc, cur) => {
      if (cur.category in categoryMap) {
        acc[categoryMap[cur.category]] ??= [];
        acc[categoryMap[cur.category]].push(cur);
      }
      return acc;
    }, {});

    const commandCategories = Object.entries(grouped).map(([category, commands]) => ({
      category,
      commandGroups: Object.values(
        commands.reduce<Record<string, CommandInfo[]>>((acc, cur) => {
          acc[cur.rootName] ??= [];
          acc[cur.rootName].push(cur);
          return acc;
        }, {})
      )
    }));

    const fields = Object.values(categoryMap);
    commandCategories.sort((a, b) => fields.indexOf(a.category) - fields.indexOf(b.category));

    if (!args.category || (args.category && !fields.includes(args.category))) args.category = categoryMap.search;

    const embeds: EmbedBuilder[] = [];
    for (const { category, commandGroups } of commandCategories) {
      if (!args.expand && args.category && args.category !== category) continue;

      const embed = new EmbedBuilder();
      embed.setColor(this.client.embed(interaction));
      embed.setDescription(
        [
          `## ${category}`,
          '',
          commandGroups
            .map((commands) => {
              const _commands = commands.map((command) => {
                const description = this.translate(command.translationKey, interaction.locale) || command.description;
                const icon = ` ${command.isRestricted ? EMOJIS.OWNER : ''}`;
                return `### </${command.name}:${command.id}>${icon}\n${description}`;
              });
              return _commands.join('\n');
            })
            .join('\n\n')
        ].join('\n')
      );
      embeds.push(embed);
    }

    const customIds = {
      category: this.createId({ cmd: this.id, category: args.category, string_key: 'category' }),
      expand: this.createId({ cmd: this.id, expand: true })
    };

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder('Select a command category')
        .setCustomId(customIds.category)
        .addOptions(
          Array.from(new Set(Object.values(categoryMap))).map((key) => ({
            label: key,
            value: key,
            default: key === args.category
          }))
        )
    );
    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(customIds.expand).setEmoji(EMOJIS.PRINT)
    );

    if (embeds.length === 1) {
      return interaction.editReply({ embeds, components: [btnRow, menuRow] });
    }

    return this.onExport(interaction, embeds);
  }

  private async onExport(interaction: CommandInteraction<'cached'>, [embed, ...embeds]: EmbedBuilder[]) {
    await interaction.editReply({ embeds: [embed], components: [] });
    for (const embed of embeds) await interaction.followUp({ embeds: [embed] });
  }

  private async getCommands(interaction: CommandInteraction<'cached'>) {
    const applicationCommands =
      this.client.isCustom() && interaction.inCachedGuild()
        ? (await this.client.application?.commands.fetch({ guildId: interaction.guildId }))!
        : (await this.client.application?.commands.fetch())!;

    const commands = applicationCommands
      .filter((command) => command.type === ApplicationCommandType.ChatInput)
      .map((command) => {
        const subCommandGroups = command.options
          .filter((option) => [ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(option.type))
          .flatMap((option) => {
            if (option.type === ApplicationCommandOptionType.SubcommandGroup && option.options?.length) {
              return option.options.map((subOption) => {
                const _name = `${command.name} ${option.name} ${subOption.name}`;
                const _translationKey = this.formatKey(_name);
                const _root = this.handler.getCommand(command.name);
                const _cmd = this.handler.getCommand(`${command.name}-${option.name}-${subOption.name}`);

                return {
                  id: command.id,
                  name: _name,
                  rootName: command.name,
                  description: subOption.description,
                  category: _root?.category ?? _cmd?.category ?? CommandCategories.SEARCH,
                  isRestricted: _cmd?.userPermissions?.length,
                  translationKey: _translationKey,
                  options: subOption.options?.map((option) => ({ name: option.name, description: option.description })) ?? []
                };
              });
            }
            const _name = `${command.name} ${option.name}`;
            const _translationKey = this.formatKey(_name);
            const _root = this.client.commandHandler.getCommand(command.name);
            const _cmd = this.client.commandHandler.getCommand(`${command.name}-${option.name}`);

            return {
              id: command.id,
              name: _name,
              rootName: command.name,
              description: option.description,
              category: _root?.category ?? _cmd?.category ?? CommandCategories.SEARCH,
              isRestricted: _cmd?.userPermissions?.length,
              translationKey: _translationKey,
              options:
                (option as ApplicationCommandSubCommand).options?.map((option) => ({
                  name: option.name,
                  description: option.description
                })) ?? []
            };
          });
        if (subCommandGroups.length) return [...subCommandGroups];

        const _translationKey = this.formatKey(command.name);
        const _root = this.handler.getCommand(command.name);

        return [
          {
            id: command.id,
            name: command.name,
            rootName: command.name,
            category: _root?.category ?? CommandCategories.SEARCH,
            isRestricted: _root?.userPermissions?.length,
            description: command.description,
            translationKey: _translationKey,
            options: command.options.map((option) => ({ name: option.name, description: option.description }))
          }
        ];
      });

    return commands.flat();
  }

  private translate(key: string, lng: string) {
    const longKey = `command.${key}.description_long`;
    const shortKey = `command.${key}.description`;

    if (i18next.exists(longKey)) {
      return i18next.t(longKey, { lng, interpolation: { escapeValue: false } });
    }
    if (i18next.exists(shortKey)) {
      return i18next.t(shortKey, { lng, interpolation: { escapeValue: false } });
    }

    return null;
  }

  private formatKey(str: string) {
    return str.replace(/\s+/g, '.').replace(/-/g, '_');
  }
}
