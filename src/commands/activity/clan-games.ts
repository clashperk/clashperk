import { Collections } from '@app/constants';
import { ClanGamesEntity } from '@app/entities';
import { APIClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, MessageType, User } from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { clanGamesEmbedMaker, clanGamesSortingAlgorithm } from '../../util/helper.js';

export default class ClanGamesCommand extends Command {
  public constructor() {
    super('clan-games', {
      category: 'activity',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public args(): Args {
    return {
      clan_tag: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { tag?: string; max: boolean; filter: boolean; season?: string; user?: User }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;
    const seasonId = this.getSeasonId(args.season);

    if (interaction.isButton() && interaction.message.type === MessageType.Default && this.latestSeason !== args.season) {
      return interaction.editReply({ components: [] });
    }

    const isLinked = await this.client.storage.getClan({ guildId: interaction.guild.id, clanTag: clan.tag });
    if (!isLinked && interaction.guild.id !== '509784317598105619') {
      return interaction.editReply(
        this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
      );
    }

    const fetched = await this.client.coc._getPlayers(clan.memberList);
    const memberList = fetched.map((player) => {
      const value = player.achievements.find((a) => a.name === 'Games Champion')?.value ?? 0;
      return { tag: player.tag, name: player.name, points: value };
    });

    const queried = await this.query(clan.tag, clan, seasonId);
    const members = this.filter(queried, memberList, seasonId);

    const embed = clanGamesEmbedMaker(clan, { members, filters: { maxPoints: args.max, minPoints: args.filter }, seasonId });
    if (interaction.isButton() && interaction.message.type === MessageType.ChatInputCommand) {
      embed.setFooter({
        text: embed.data.footer!.text,
        iconURL: interaction.user.displayAvatarURL()
      });
    }
    if (this.latestSeason !== seasonId) embed.setTimestamp(null);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(JSON.stringify({ cmd: this.id, max: false, tag: clan.tag, season: seasonId }))
          .setEmoji(EMOJIS.REFRESH)
          .setStyle(ButtonStyle.Secondary)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId(JSON.stringify({ cmd: this.id, max: !args.max, filter: false, tag: clan.tag, season: seasonId }))
          .setLabel(args.max ? 'Permissible Points' : 'Maximum Points')
          .setStyle(ButtonStyle.Primary)
      );
    return interaction.editReply({ embeds: [embed], components: [row], content: null });
  }

  private getSeasonId(seasonId?: string) {
    if (seasonId) return seasonId;
    return this.latestSeason;
  }

  private get latestSeason() {
    const now = new Date();
    if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
    return now.toISOString().slice(0, 7);
  }

  private query(clanTag: string, _clan: APIClan, seasonId: string) {
    const cursor = this.client.db.collection(Collections.CLAN_GAMES_POINTS).aggregate<ClanGamesEntity>([
      {
        $match: { __clans: clanTag, season: seasonId }
      },
      {
        $limit: 60
      }
    ]);

    return cursor.toArray();
  }

  private filter(dbMembers: ClanGamesEntity[], clanMembers: Member[], seasonId: string) {
    if (seasonId !== this.latestSeason) {
      return dbMembers
        .map((m) => ({
          tag: m.tag,
          name: m.name,
          points: m.current - m.initial,
          endedAt: m.completedAt
        }))
        .sort((a, b) => b.points - a.points)
        .sort((a, b) => {
          if (a.endedAt && b.endedAt) {
            return a.endedAt.getTime() - b.endedAt.getTime();
          }
          return 0;
        });
    }

    const members = clanMembers.map((member) => {
      const mem = dbMembers.find((m) => m.tag === member.tag);
      return {
        name: member.name,
        tag: member.tag,
        points: mem ? member.points - mem.initial : 0,
        endedAt: mem?.completedAt
      };
    });

    const missingMembers: Member[] = dbMembers
      .filter((mem) => !members.find((m) => m.tag === mem.tag))
      .map((mem) => ({
        name: mem.name,
        tag: mem.tag,
        points: mem.current - mem.initial,
        endedAt: mem.completedAt
      }));

    return [...members, ...missingMembers]
      .sort((a, b) => b.points - a.points)
      .sort((a, b) => clanGamesSortingAlgorithm(a.endedAt ? a.endedAt.getTime() : 0, b.endedAt ? b.endedAt.getTime() : 0));
  }
}

interface Member {
  tag: string;
  name: string;
  points: number;
  endedAt?: Date | null;
}
