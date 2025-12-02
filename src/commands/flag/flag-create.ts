import { Collections, Settings } from '@app/constants';
import { FlagsEntity } from '@app/entities';
import {
  AutocompleteInteraction,
  CommandInteraction,
  EmbedBuilder,
  escapeMarkdown,
  time
} from 'discord.js';
import moment from 'moment';
import pluralize from 'pluralize';
import { Command } from '../../lib/handlers.js';

export default class FlagCreateCommand extends Command {
  public constructor() {
    super('flag-create', {
      category: 'flag',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      defer: true,
      roleKey: Settings.FLAGS_MANAGER_ROLE
    });
  }

  public autocomplete(interaction: AutocompleteInteraction<'cached'>, args: { player?: string }) {
    return this.client.autocomplete.globalPlayersAutocomplete(interaction, args);
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      reason?: string;
      player?: string;
      flag_type: 'ban' | 'strike';
      flag_expiry_days?: number;
      flag_impact?: number;
      dm_user?: boolean;
    }
  ) {
    const tags = (await this.client.resolver.resolveArgs(args.player)).filter((tag) =>
      this.client.coc.isValidTag(tag)
    );
    if (!tags.length) return interaction.editReply('No players were found against this query.');

    if (!args.reason) return interaction.editReply('You must provide a reason to flag.');
    if (args.reason.length > 900)
      return interaction.editReply('Reason must be 1024 or fewer in length.');

    const flagCount = await this.client.db.collection(Collections.FLAGS).countDocuments({
      guild: interaction.guild.id,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    });
    if (flagCount >= 1000 && !this.client.subscribers.has(interaction.guild.id)) {
      const embed = new EmbedBuilder().setDescription(
        [
          'You can only flag 1000 players per server!',
          '',
          '**Want more than that?**',
          'Please consider supporting us on patreon!',
          '',
          '[Subscribe on Patreon](https://www.patreon.com/clashperk)'
        ].join('\n')
      );

      return interaction.editReply({ embeds: [embed] });
    }

    const players = await this.client.coc._getPlayers(tags.map((tag) => ({ tag })));
    if (!players.length) return interaction.editReply('No players were found against this query.');

    const newFlags: FlagsEntity[] = [];

    for (const player of players) {
      newFlags.push({
        guild: interaction.guild.id,
        user: interaction.user.id,
        flagType: args.flag_type,
        username: interaction.user.username,
        displayName: interaction.user.displayName,
        discriminator: interaction.user.discriminator,
        tag: player.tag,
        name: player.name,
        flagImpact: args.flag_impact ?? 1,
        reason: escapeMarkdown(args.reason),
        expiresAt: args.flag_expiry_days
          ? moment().add(args.flag_expiry_days, 'days').toDate()
          : null,
        createdAt: new Date()
      });

      try {
        const link =
          args.dm_user &&
          (await this.client.db.collection(Collections.PLAYER_LINKS).findOne({ tag: player.tag }));
        const user = link && (await this.client.users.fetch(link.userId));
        if (user) {
          await user.send(
            `You have received a **${args.flag_type}** on **${interaction.guild.name}** for **${player.name} (${player.tag})**${
              (args.flag_impact ?? 1) >= 2 ? `, with a weight of x${args.flag_impact}` : ``
            }${args.flag_expiry_days ? `, expiring in ${args.flag_expiry_days} ${pluralize('day', args.flag_expiry_days)}` : ``}, for the following reason: ${args.reason}.`
          );
        }
      } catch {}
    }
    await this.client.db.collection<FlagsEntity>(Collections.FLAGS).insertMany(newFlags);

    const flag = newFlags.at(0)!;
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setFooter({ text: `${args.flag_type === 'strike' ? 'Strike' : 'Ban'}` });

    if (newFlags.length === 1) {
      embed.setDescription(
        [
          `\u200eFlag added to ${`[${flag.name} (${flag.tag})](http://cprk.us/p/${flag.tag.replace('#', '')})`} by <@${
            interaction.user.id
          }>`,
          flag.expiresAt ? `Expires on ${time(flag.expiresAt, 'd')}\n` : ``,
          `**Reason**\n${flag.reason}`
        ].join('\n')
      );
      return interaction.editReply({ embeds: [embed] });
    }

    embed.setDescription(
      [
        `Flag added to ${newFlags.length} players by <@${interaction.user.id}>`,
        flag.expiresAt ? `Expires on ${time(flag.expiresAt, 'd')}\n` : ``,
        `**Reason**\n${flag.reason}`,
        '',
        '**Players**',
        newFlags
          .map(
            (flag) =>
              `\u200e[${flag.name} (${flag.tag})](http://cprk.us/p/${flag.tag.replace('#', '')})`
          )
          .join('\n')
      ].join('\n')
    );

    return interaction.editReply({ embeds: [embed] });
  }
}
