import { Collections, FeatureFlags, Settings } from '@app/constants';
import { APIClan, APIPlayer } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, GuildMember } from 'discord.js';
import { Args, Command, CommandOptions } from '../../lib/handlers.js';

export default class LinkCreateCommand extends Command {
  public constructor() {
    super('link-create', {
      category: 'link',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public refine(interaction: CommandInteraction<'cached'>) {
    const hasLinksManager = this.client.settings.get<string[]>(interaction.guild, Settings.LINKS_MANAGER_ROLE, []);
    return {
      ...this.options,
      userPermissions: hasLinksManager ? ['ManageGuild'] : [],
      roleKey: hasLinksManager ? Settings.LINKS_MANAGER_ROLE : null
    } satisfies CommandOptions;
  }

  public args(): Args {
    return {
      is_default: {
        match: 'BOOLEAN'
      },
      user: {
        id: 'member',
        match: 'MEMBER'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { player_tag?: string; clan_tag?: string; member?: GuildMember; is_default?: boolean; forcePlayer?: boolean }
  ) {
    if (!(args.clan_tag || args.player_tag)) {
      const linkButton = new ButtonBuilder()
        .setCustomId(JSON.stringify({ cmd: 'link-add', token_field: 'hidden' }))
        .setLabel('Link account')
        .setEmoji('🔗')
        .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

      return interaction.editReply({
        content: this.i18n('command.link.no_tag', { lng: interaction.locale }),
        components: [row]
      });
    }

    const member = args.member ?? interaction.member;
    if (member.user.bot) return interaction.editReply(this.i18n('command.link.create.no_bots', { lng: interaction.locale }));

    // Server disallowed linking users;
    if (
      this.client.settings.get(interaction.guild, Settings.LINKS_MANAGER_ROLE) &&
      member.id !== interaction.id &&
      !this.client.util.isManager(interaction.member, Settings.LINKS_MANAGER_ROLE)
    ) {
      return interaction.editReply(this.i18n('common.missing_manager_role', { lng: interaction.locale }));
    }

    if (args.player_tag) {
      const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
      if (!player) return null;
      return this.playerLink(interaction, { player, member, is_default: Boolean(args.is_default) });
    }

    if (args.clan_tag) {
      const clan = await this.client.resolver.resolveClan(interaction, args.clan_tag);
      if (!clan) return null;

      await this.clanLink(member, clan);
      return interaction.editReply(
        this.i18n('command.link.create.success', {
          lng: interaction.locale,
          user: `**${member.user.displayName}**`,
          target: `**${clan.name} (${clan.tag})**`
        })
      );
    }

    return interaction.editReply(this.i18n('command.link.create.fail', { lng: interaction.locale }));
  }

  private async clanLink(member: GuildMember, clan: APIClan) {
    return this.client.db.collection(Collections.USERS).updateOne(
      { userId: member.id },
      {
        $set: {
          clan: {
            tag: clan.tag,
            name: clan.name
          },
          username: member.user.username,
          displayName: member.user.displayName,
          discriminator: member.user.discriminator,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  public async playerLink(
    interaction: CommandInteraction<'cached'>,
    { player, member, is_default }: { player: APIPlayer; member: GuildMember; is_default: boolean }
  ) {
    const [link, accounts] = await this.getPlayer(player.tag, member.id);
    const isTrustedGuild = this.isTrustedGuild(interaction);

    const isDef =
      is_default &&
      (member.id === interaction.user.id ||
        (this.client.util.isManager(interaction.member, Settings.LINKS_MANAGER_ROLE) &&
          (!accounts.some((link) => link.verified) || isTrustedGuild)));

    // only owner can set default account
    if (link && link.userId === member.id && !isDef) {
      return interaction.editReply(
        this.i18n('command.link.create.link_exists', { lng: interaction.locale, player: `**${player.name} (${player.tag})**` })
      );
    }

    if (link && link.userId !== member.id) {
      return interaction.editReply(
        this.i18n('command.link.create.already_linked', {
          lng: interaction.locale,
          player: `**${player.name} (${player.tag})**`,
          command: this.client.commands.VERIFY
        })
      );
    }

    if (link && accounts.length >= 25) {
      return interaction.editReply(this.i18n('command.link.create.max_limit', { lng: interaction.locale }));
    }

    await this.client.db
      .collection(Collections.USERS)
      .updateOne(
        { userId: member.id },
        { $set: { username: member.user.username, displayName: member.user.displayName, discriminator: member.user.discriminator } }
      );

    await this.client.db.collection(Collections.PLAYER_LINKS).updateOne(
      { tag: player.tag },
      {
        $set: {
          userId: member.id,
          username: member.user.username,
          displayName: member.user.displayName,
          discriminator: member.user.discriminator,
          name: player.name,
          tag: player.tag,
          order: isDef
            ? Math.min(...accounts.map((account) => account.order), 0) - 1
            : Math.max(...accounts.map((account) => account.order), 0) + 1,
          verified: link?.verified ?? false,
          linkedBy: interaction.user.id,
          updatedAt: new Date()
        },
        $setOnInsert: {
          source: 'bot',
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    this.resetLinkAPI(member.id, player.tag);
    this.client.rolesManager.updateOne(member.user, interaction.guildId, accounts.length === 0);
    this.client.storage.updateClanLinks(interaction.guildId);

    return interaction.editReply(
      this.i18n('command.link.create.success', {
        lng: interaction.locale,
        user: `**${member.user.displayName}**`,
        target: `**${player.name} (${player.tag})**`
      })
    );
  }

  private async getPlayer(tag: string, userId: string) {
    const collection = this.client.db.collection(Collections.PLAYER_LINKS);
    return Promise.all([collection.findOne({ tag }), collection.find({ userId }).toArray()]);
  }

  private async resetLinkAPI(user: string, tag: string) {
    await this.client.coc.linkPlayerTag(user, tag);
  }

  private async isTrustedGuild(interaction: CommandInteraction<'cached'>) {
    const isTrustedFlag = this.client.isFeatureEnabled(FeatureFlags.TRUSTED_GUILD, interaction.guildId);

    const isTrusted = isTrustedFlag || this.client.settings.get(interaction.guild, Settings.IS_TRUSTED_GUILD, false);
    if (!isTrusted) return false;

    const isManager = this.client.util.isManager(interaction.member, Settings.LINKS_MANAGER_ROLE);
    if (!isManager) return false;

    return true;
  }
}
