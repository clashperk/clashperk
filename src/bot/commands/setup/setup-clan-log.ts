import {
  ActionRowBuilder,
  AnyThreadChannel,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  PermissionsString,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextChannel
} from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import {
  CLAN_FEED_LOG_TYPES,
  Collections,
  DEEP_LINK_TYPES,
  DonationLogFrequencyTypes,
  Flags,
  WAR_FEED_LOG_TYPES,
  missingPermissions
} from '../../util/constants.js';

const FEATURES: Record<string, string> = {
  [Flags.DONATION_LOG]: 'Donation Log',
  [Flags.CLAN_FEED_LOG]: 'Clan Feed',
  [Flags.LAST_SEEN_LOG]: 'Last Seen',
  [Flags.CLAN_EMBED_LOG]: 'Clan Embed',
  [Flags.CLAN_GAMES_LOG]: 'Clan Games',
  [Flags.CLAN_WAR_LOG]: 'War Feed',
  [Flags.LEGEND_LOG]: 'Legend Log',
  [Flags.JOIN_LEAVE_LOG]: 'Join/Leave Log',
  [Flags.CAPITAL_LOG]: 'Capital Log'
};

const collectionMap: Record<string, Collections> = {
  [Flags.DONATION_LOG]: Collections.DONATION_LOGS,
  [Flags.CLAN_FEED_LOG]: Collections.CLAN_FEED_LOGS,
  [Flags.LAST_SEEN_LOG]: Collections.LAST_SEEN_LOGS,
  [Flags.CLAN_EMBED_LOG]: Collections.CLAN_EMBED_LOGS,
  [Flags.CLAN_GAMES_LOG]: Collections.CLAN_GAMES_LOGS,
  [Flags.CLAN_WAR_LOG]: Collections.CLAN_WAR_LOGS,
  [Flags.LEGEND_LOG]: Collections.LEGEND_LOGS,
  [Flags.JOIN_LEAVE_LOG]: Collections.JOIN_LEAVE_LOGS,
  [Flags.CAPITAL_LOG]: Collections.CAPITAL_LOGS
};

interface BaseState {
  logTypes: string[] | null;
  deepLink: string | null;
  role: string | null;
  interval: string[] | null;
}

export default class ClanLogCommand extends Command {
  public constructor() {
    super('setup-clan-log', {
      category: 'none',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true,
      ephemeral: true
    });
  }

  private readonly permissions: PermissionsString[] = [
    'EmbedLinks',
    'UseExternalEmojis',
    'SendMessages',
    'ReadMessageHistory',
    'ManageWebhooks',
    'ViewChannel'
  ];

  public args(interaction: CommandInteraction<'cached'>): Args {
    return {
      channel: {
        match: 'CHANNEL',
        default: interaction.channel!
      },
      color: {
        match: 'COLOR',
        default: this.client.embed(interaction)
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { tag?: string; channel: TextChannel | AnyThreadChannel; option: string; color?: number }
  ) {
    const flag = {
      'lastseen': Flags.LAST_SEEN_LOG,
      'clan-feed': Flags.CLAN_FEED_LOG,
      'donation-log': Flags.DONATION_LOG,
      'clan-games': Flags.CLAN_GAMES_LOG,
      'war-feed': Flags.CLAN_WAR_LOG,
      'legend-log': Flags.LEGEND_LOG,
      'join-leave': Flags.JOIN_LEAVE_LOG,
      'capital-log': Flags.CAPITAL_LOG
    }[args.option];
    if (!flag) throw Error('Command not found.');

    const data = await this.client.resolver.enforceSecurity(interaction, { tag: args.tag, collection: collectionMap[flag] });
    if (!data) return;

    const permission = missingPermissions(args.channel, interaction.guild.members.me!, this.permissions);
    if (permission.missing) {
      return interaction.editReply(
        this.i18n('common.missing_access', {
          lng: interaction.locale,
          channel: args.channel.toString(), // eslint-disable-line
          permission: permission.missingPerms
        })
      );
    }

    const webhook = await this.client.storage.getWebhook(args.channel.isThread() ? args.channel.parent! : args.channel);
    if (!webhook) {
      return interaction.editReply(
        // eslint-disable-next-line
        this.i18n('command.setup.enable.too_many_webhooks', { lng: interaction.locale, channel: args.channel.toString() })
      );
    }

    const mutate = async (rest = {}) => {
      const id = await this.client.storage.register(interaction, {
        op: flag,
        guild: interaction.guild.id,
        channel: args.channel.id,
        tag: data.tag,
        name: data.name,
        color: args.color,
        webhook: {
          id: webhook.id,
          token: webhook.token
        },
        ...rest
      });

      await this.client.rpcHandler.add(id, {
        op: flag,
        guild: interaction.guild.id,
        tag: data.tag
      });
    };
    await mutate({ deepLink: DEEP_LINK_TYPES.OPEN_IN_GAME });

    const embed = new EmbedBuilder()
      .setTitle(`\u200e${data.name} | ${FEATURES[flag]}`)
      .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
      .setThumbnail(data.badgeUrls.small)
      .setColor(this.client.embed(interaction))
      .addFields([{ name: 'Channel', value: args.channel.toString() }]); // eslint-disable-line

    if ([Flags.DONATION_LOG, Flags.LAST_SEEN_LOG, Flags.CLAN_GAMES_LOG].includes(flag)) {
      embed.addFields([{ name: 'Color', value: args.color?.toString(16) ?? 'None' }]);
      if (args.color) embed.setColor(args.color);
    }

    const customIds = {
      deepLink: this.client.uuid(),
      logs: this.client.uuid(),
      role: this.client.uuid(),
      warLogs: this.client.uuid(),
      update: this.client.uuid(),
      interval: this.client.uuid()
    };

    const state: BaseState = {
      deepLink: DEEP_LINK_TYPES.OPEN_IN_GAME,
      logTypes: null,
      role: null,
      interval: null
    };

    const titleMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customIds.deepLink)
        .setPlaceholder('Title link redirection')
        .setMaxValues(1)
        .setOptions([
          {
            label: 'Open in Game',
            description: 'This will open the player profile in the Game.',
            value: DEEP_LINK_TYPES.OPEN_IN_GAME
          },
          {
            label: 'Open in Clash of Stats',
            description: 'This will open the player profile in Clash of Stats.',
            value: DEEP_LINK_TYPES.OPEN_IN_COS
          }
        ])
    );

    const roleMenu = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(customIds.role)
        .setMaxValues(1)
        .setMinValues(1)
        .setPlaceholder('Town-Hall upgrade alert role (optional)')
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const logMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customIds.logs)
        .setPlaceholder('Select logs')
        .setMinValues(1)
        .setMaxValues(4)
        .setOptions([
          {
            label: 'Town Hall',
            value: CLAN_FEED_LOG_TYPES.TOWN_HALL_UPGRADE,
            description: 'Town Hall upgrades.'
          },
          {
            label: 'War Preference',
            value: CLAN_FEED_LOG_TYPES.WAR_PREFERENCE_CHANGE,
            description: 'War preference changes.'
          },
          {
            label: 'Player Name',
            description: 'Player name changes.',
            value: CLAN_FEED_LOG_TYPES.PLAYER_NAME_CHANGE
          },
          {
            label: 'Season Best',
            description: 'Best players at the end of season.',
            value: CLAN_FEED_LOG_TYPES.SEASON_BEST_PLAYERS
          }
        ])
    );

    const warMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customIds.warLogs)
        .setPlaceholder('Select logs')
        .setMinValues(1)
        .setMaxValues(4)
        .setOptions([
          {
            label: 'Regular War',
            description: 'Regular war logs.',
            value: WAR_FEED_LOG_TYPES.REGULAR_WAR_EMBED
          },
          {
            label: 'CWL',
            description: 'CWL logs.',
            value: WAR_FEED_LOG_TYPES.CWL_WAR_EMBED
          },
          {
            label: 'Friendly War',
            description: 'Friendly war logs.',
            value: WAR_FEED_LOG_TYPES.FRIENDLY_WAR_EMBED
          },
          {
            label: 'Missed Attacks',
            description: 'Missed attacks logs.',
            value: WAR_FEED_LOG_TYPES.MISSED_ATTACK_EMBED
          }
        ])
    );

    const donationLogMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customIds.interval)
        .setPlaceholder('Select interval')
        .setMinValues(1)
        .setMaxValues(3)
        .setOptions([
          {
            label: 'Instant',
            description: 'Logs every donation.',
            value: DonationLogFrequencyTypes.INSTANT
          },
          {
            label: 'Daily',
            description: 'Every 24 hours.',
            value: DonationLogFrequencyTypes.DAILY
          },
          {
            label: 'Weekly',
            description: 'Every 7 days.',
            value: DonationLogFrequencyTypes.WEEKLY
          },
          {
            label: 'Monthly',
            description: 'End of season.',
            value: DonationLogFrequencyTypes.MONTHLY
          }
        ])
    );

    const updateButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel(`Update`).setCustomId(customIds.update)
    );

    const components = [];
    switch (flag) {
      case Flags.CLAN_FEED_LOG:
        // components.push(titleMenu, roleMenu, logMenu, updateButton);
        components.push(titleMenu, roleMenu, updateButton);
        break;
      case Flags.JOIN_LEAVE_LOG:
        components.push(titleMenu, roleMenu, updateButton);
        break;
      case Flags.CLAN_WAR_LOG:
        components.push(warMenu, updateButton);
        break;
      case Flags.DONATION_LOG:
        components.push(donationLogMenu, updateButton);
        break;
      default:
        break;
    }

    if (![Flags.CLAN_FEED_LOG, Flags.DONATION_LOG].includes(flag)) {
      return interaction.editReply({ embeds: [embed], components: [] });
    }

    const msg = await interaction.editReply({ embeds: [embed], components });
    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect | ComponentType.RoleSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.deepLink && action.isStringSelectMenu()) {
        await action.deferUpdate();
        state.deepLink = action.values.at(0)!;
        // embed.addFields({
        // 	name: 'Title link',
        // 	value: this.titleCase(state.deepLink)
        // });
      }

      if (action.customId === customIds.role && action.isRoleSelectMenu()) {
        await action.deferUpdate();
        state.role = action.values.at(0)!;
        // embed.addFields({
        // 	name: flag === Flags.JOIN_LEAVE_LOG ? 'Flag alert role' : 'Town-Hall upgrade alert role',
        // 	value: `<@&${state.role}>`
        // });
      }

      if (action.customId === customIds.logs && action.isStringSelectMenu()) {
        await action.deferUpdate();
        state.logTypes = action.values;
        // embed.addFields({
        // 	name: 'Log Types',
        // 	value: action.values.map((str) => this.titleCase(str)).join(', ')
        // });
      }

      if (action.customId === customIds.warLogs && action.isStringSelectMenu()) {
        await action.deferUpdate();
        state.logTypes = action.values;
        // embed.addFields({
        // 	name: 'Log Types',
        // 	value: action.values.map((str) => this.titleCase(str)).join(', ')
        // });
      }

      if (action.customId === customIds.interval && action.isStringSelectMenu()) {
        await action.deferUpdate();
        if (action.values.includes(DonationLogFrequencyTypes.INSTANT) && action.values.length > 1) {
          await action.followUp({
            content: 'You cannot select multiple intervals when using the option `Instant`',
            ephemeral: true
          });
        } else {
          state.interval = action.values;
        }
      }

      if (action.customId === customIds.update && action.isButton()) {
        await action.deferUpdate();
        await mutate(state);

        if (flag === Flags.DONATION_LOG) {
          embed.addFields({
            name: 'Donation Log Frequency',
            value: state.interval?.map((str) => this.titleCase(str)).join(', ') ?? 'Instant'
          });
        } else {
          embed.addFields(
            {
              name: 'Title Link',
              value: state.deepLink ? this.titleCase(state.deepLink) : 'Open In Game'
            },
            {
              name: flag === Flags.JOIN_LEAVE_LOG ? 'Flag alert role' : 'Town-Hall upgrade alert role',
              value: state.role ? `<@&${state.role}>` : 'None'
            }
            // {
            // 	name: 'Log Types',
            // 	value: state.logTypes?.map((str) => this.titleCase(str)).join(', ') ?? 'All'
            // }
          );
        }

        await action.editReply({ embeds: [embed], components: [] });
      }
    });

    collector.on('end', async (_, reason) => {
      Object.values(customIds).forEach((id) => this.client.components.delete(id));
      if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
    });
  }

  private titleCase(str: string) {
    return str
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b(\w)/g, (char) => char.toUpperCase());
  }
}
