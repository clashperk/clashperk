import { Collections, Settings, WarType } from '@app/constants';
import { CapitalRaidSeasonsEntity, ClanGamesEntity } from '@app/entities';
import { APIClanWar, APIPlayer } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, User, escapeMarkdown } from 'discord.js';
import moment from 'moment';
import { group } from 'radash';
import { Args, Command } from '../../lib/handlers.js';
import { CustomIdProps } from '../../struct/component-handler.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/emojis.js';
import { Util } from '../../util/toolkit.js';

const RemainingType = {
  WAR_ATTACKS: 'war-attacks',
  CAPITAL_RAIDS: 'capital-raids',
  CLAN_GAMES: 'clan-games'
} as const;

interface CommandArgs {
  tag?: string;
  war_id?: number;
  user?: User;
  player_tag?: string;
  is_grouped?: boolean;
  type?: (typeof RemainingType)[keyof typeof RemainingType];
}

export default class RemainingCommand extends Command {
  public constructor() {
    super('remaining', {
      category: 'war',
      channel: 'guild',
      clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
      defer: true
    });
  }

  public args(): Args {
    return {
      clan: {
        id: 'tag',
        match: 'STRING'
      },
      player: {
        id: 'player_tag',
        match: 'STRING'
      }
    };
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: CommandArgs) {
    if ((args.user || args.player_tag) && args.type) {
      return this.forUsers(interaction, args);
    }

    const clan = await this.client.resolver.resolveClan(interaction, args.tag);
    if (!clan) return;

    let body: APIClanWar | null = null;
    if (args.war_id) {
      const war = await this.getWar(args.war_id, clan.tag);
      if (!war) return interaction.editReply(this.i18n('command.remaining.no_war_id', { lng: interaction.locale }));
      body = war;
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

    if (!clan.isWarLogPublic) {
      const { res } = await this.client.coc.getClanWarLeagueGroup(clan.tag);
      if (res.ok) {
        return this.handler.exec(interaction, this.handler.getCommand('cwl-attacks')!, { tag: clan.tag });
      }
      embed.setDescription('Private War Log');
      return interaction.editReply({ embeds: [embed] });
    }

    if (!body) {
      const { body: war, res } = await this.client.coc.getCurrentWar(clan.tag);
      if (!res.ok) return interaction.editReply('**504 Request Timeout!**');
      body = war;
    }

    if (body.state === 'notInWar') {
      const { res } = await this.client.coc.getClanWarLeagueGroup(clan.tag);
      if (res.ok) {
        return this.handler.exec(interaction, this.handler.getCommand('cwl-attacks')!, { tag: clan.tag });
      }
      embed.setDescription(this.i18n('command.lineup.not_in_war', { lng: interaction.locale }));
      return interaction.editReply({ embeds: [embed] });
    }

    return this.sendResult(interaction, body);
  }

  private async getWar(id: number | string, tag: string) {
    const collection = this.client.db.collection(Collections.CLAN_WARS);
    const data =
      id === 'last'
        ? await collection.findOne(
            {
              $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
              warType: { $ne: WarType.CWL },
              state: 'warEnded'
            },
            { sort: { _id: -1 } }
          )
        : await collection.findOne({ id: Number(id), $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }] });

    if (!data) return null;

    const clan = data.clan.tag === tag ? data.clan : data.opponent;
    const opponent = data.clan.tag === tag ? data.opponent : data.clan;
    return { ...data, clan, opponent } as unknown as APIClanWar;
  }

  private sendResult(interaction: CommandInteraction, body: APIClanWar & { id?: number }) {
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

    if (body.state === 'preparation') {
      embed.setDescription(
        ['**War Against**', `${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`, '', '**War State**', 'Preparation'].join('\n')
      );
      return interaction.editReply({ embeds: [embed] });
    }

    const [OneRem, TwoRem] = [
      body.clan.members.filter((m) => m.attacks && m.attacks.length === 1),
      body.clan.members.filter((m) => !m.attacks)
    ];
    const endTime = new Date(moment(body.endTime).toDate()).getTime();

    embed.setDescription(
      [
        '**War Against**',
        `${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
        '',
        '**War State**',
        `${body.state.replace(/warEnded/g, 'War Ended').replace(/inWar/g, 'Battle Day')}`,
        '',
        '**End Time**',
        `${Util.getRelativeTime(endTime)}`
      ].join('\n')
    );
    if (TwoRem.length) {
      embed.setDescription(
        [
          embed.data.description,
          '',
          `**${body.attacksPerMember ?? 2} ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
          ...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map(
            (m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${escapeMarkdown(m.name)}`
          )
        ].join('\n')
      );
    }

    if (OneRem.length && body.attacksPerMember !== 1) {
      embed.setDescription(
        [
          embed.data.description,
          '',
          `**1 ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
          ...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map(
            (m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${escapeMarkdown(m.name)}`
          )
        ].join('\n')
      );
    }

    if (body.id) embed.setFooter({ text: `War ID #${body.id}` });
    return interaction.editReply({ embeds: [embed] });
  }

  private async forUsers(interaction: CommandInteraction<'cached'>, args: CommandArgs) {
    const player = args.player_tag ? await this.client.resolver.resolvePlayer(interaction, args.player_tag) : null;
    if (args.player_tag && !player) return null;

    args.is_grouped =
      typeof args.is_grouped === 'boolean'
        ? args.is_grouped
        : this.client.settings.get(interaction.guildId, Settings.USE_GROUPED_TODO_LIST, true);

    const embeds: EmbedBuilder[] = [];
    switch (args.type) {
      case RemainingType.CAPITAL_RAIDS: {
        const embed = await this.capitalRaids(interaction, { ...args, player });
        embeds.push(embed);
        break;
      }
      case RemainingType.CLAN_GAMES: {
        const embed = await this.clanGames(interaction, { ...args, player });
        embeds.push(embed);
        break;
      }
      default: {
        const embed = await this.warAttacks(interaction, { ...args, player });
        embeds.push(embed);
        break;
      }
    }

    return interaction.editReply({
      components: [this.getComponents(args)],
      embeds
    });
  }

  private async warAttacks(interaction: CommandInteraction<'cached'>, args: CommandArgs & { player: APIPlayer | null }) {
    const playerTags = args.player ? [args.player.tag] : await this.client.resolver.getLinkedPlayerTags(args.user!.id);

    const wars = await this.client.db
      .collection(Collections.CLAN_WARS)
      .aggregate<APIClanWar>([
        {
          $match: {
            endTime: {
              $gte: new Date()
            },
            $or: [{ 'clan.members.tag': { $in: playerTags } }, { 'opponent.members.tag': { $in: playerTags } }]
          }
        },
        { $sort: { _id: -1 } }
      ])
      .toArray();

    const players = [];
    for (const data of wars) {
      data.clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
      data.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

      for (const tag of playerTags) {
        const __member = data.clan.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
        const member = __member ?? data.opponent.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
        if (!member) continue;

        const clan = __member ? data.clan : data.opponent;
        const attacks = member.attacks ?? [];
        if (attacks.length === data.attacksPerMember) continue;

        players.push({
          member,
          clan,
          attacksPerMember: data.attacksPerMember,
          state: data.state,
          endTime: new Date(data.endTime),
          remaining: (data.attacksPerMember ?? 2) - attacks.length
        });
      }
    }

    players.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

    const embed = new EmbedBuilder();
    embed.setColor(this.client.embed(interaction));
    embed.setTitle('Remaining Clan War Attacks');
    if (args.user && !args.player)
      embed.setAuthor({ name: `\u200e${args.user.displayName} (${args.user.id})`, iconURL: args.user.displayAvatarURL() });

    const groupedDescription = Object.entries(group(players, (player) => player.clan.tag))
      .flatMap(([, _wars]) => {
        const wars = _wars!;
        const clan = wars.at(0)!.clan;

        return [
          `### ${escapeMarkdown(clan.name)} (${clan.tag})`,
          wars
            .map(
              ({ member, endTime, remaining }) =>
                `- ${escapeMarkdown(member.name)} (${member.tag})\n - ${remaining} remaining (${Util.getRelativeTime(endTime.getTime())})`
            )
            .join('\n')
        ];
      })
      .join('\n');

    const listedDescription = players
      .map(({ member, endTime, attacksPerMember, clan, remaining }) => {
        return [
          `**${escapeMarkdown(member.name)} (${member.tag})**`,
          `${remaining}/${attacksPerMember} in ${escapeMarkdown(clan.name)} (${Util.getRelativeTime(endTime.getTime())})`
        ].join('\n');
      })
      .join('\n\n');

    if (args.is_grouped) embed.setDescription(groupedDescription || null);
    else embed.setDescription(listedDescription || null);

    const remaining = players.reduce((a, b) => a + b.remaining, 0);
    embed.setFooter({ text: `${remaining} Remaining` });

    return embed;
  }

  private async capitalRaids(interaction: CommandInteraction<'cached'>, args: CommandArgs & { player: APIPlayer | null }) {
    const playerTags = args.player ? [args.player.tag] : await this.client.resolver.getLinkedPlayerTags(args.user!.id);

    const { weekId, startTime, endTime } = Util.getRaidWeekEndTimestamp();
    const weekend = Util.raidWeekDateFormat(startTime, endTime);

    const raids = await this.client.db
      .collection(Collections.CAPITAL_RAID_SEASONS)
      .aggregate<CapitalRaidSeasonsEntity>([
        {
          $match: { weekId, 'members.tag': { $in: playerTags } }
        }
      ])
      .toArray();

    const players = [];
    for (const raid of raids) {
      for (const playerTag of playerTags) {
        const raidMember = raid.members.find((m) => m.tag === playerTag);
        if (!raidMember) continue;
        if (raidMember.attackLimit + raidMember.bonusAttackLimit === raidMember.attacks) continue;

        players.push({
          clan: {
            name: raid.name,
            tag: raid.tag
          },
          member: raidMember,
          attacks: raidMember.attacks,
          attackLimit: raidMember.attackLimit + raidMember.bonusAttackLimit,
          endTime: new Date(raid.endDate)
        });
      }
    }

    const embed = new EmbedBuilder();
    embed.setColor(this.client.embed(interaction));
    embed.setTitle('Remaining Capital Raid Attacks');

    if (args.user && !args.player)
      embed.setAuthor({ name: `\u200e${args.user.displayName} (${args.user.id})`, iconURL: args.user.displayAvatarURL() });

    const groupedDescription = Object.entries(group(players, (player) => player.clan.tag))
      .flatMap(([, _raids]) => {
        const raids = _raids!;
        const clan = raids.at(0)!.clan;

        return [
          `### ${escapeMarkdown(clan.name)} (${clan.tag})`,
          raids
            .map(
              ({ member, endTime, attackLimit, attacks }) =>
                `- ${escapeMarkdown(member.name)} (${
                  member.tag
                })\n - ${attacks}/${attackLimit} raids (${Util.getRelativeTime(endTime.getTime())})`
            )
            .join('\n')
        ];
      })
      .join('\n');

    const listedDescription = players
      .map(({ member, endTime, attackLimit, clan, attacks }) => {
        return [
          `**${escapeMarkdown(member.name)} (${member.tag})**`,
          `${attacks}/${attackLimit} in ${escapeMarkdown(clan.name)} (${Util.getRelativeTime(endTime.getTime())})`
        ].join('\n');
      })
      .join('\n\n');

    if (args.is_grouped) embed.setDescription(groupedDescription || null);
    else embed.setDescription(listedDescription || null);

    const totalAttacks = players.reduce((a, b) => a + b.attacks, 0);
    const maxTotalAttacks = players.reduce((a, b) => a + b.attackLimit, 0);
    embed.setFooter({ text: `${totalAttacks}/${maxTotalAttacks} ${Util.plural(totalAttacks, 'Raid')} (${weekend})` });

    return embed;
  }

  private async clanGames(interaction: CommandInteraction<'cached'>, args: CommandArgs & { player: APIPlayer | null }) {
    const playerTags = args.player ? [args.player.tag] : await this.client.resolver.getLinkedPlayerTags(args.user!.id);

    const seasonId = Util.clanGamesSeasonId();
    const maxPoints = Util.getClanGamesMaxPoints(seasonId);

    const members = await this.client.db
      .collection(Collections.CLAN_GAMES_POINTS)
      .aggregate<ClanGamesEntity>([
        {
          $match: { season: seasonId, tag: { $in: playerTags } }
        }
      ])
      .toArray();

    const players = [];
    for (const member of members) {
      for (const playerTag of playerTags) {
        if (member.tag !== playerTag) continue;
        if (member.current - member.initial >= maxPoints) continue;

        players.push({
          clan: {
            name: member.clans.at(0)!.name,
            tag: member.clans.at(0)!.tag
          },
          member: {
            name: member.name,
            tag: member.tag,
            points: member.current - member.initial
          },
          points: member.current - member.initial,
          maxPoints
        });
      }
    }

    const embed = new EmbedBuilder();
    embed.setColor(this.client.embed(interaction));
    embed.setTitle('Remaining Clan Games Points');

    if (args.user && !args.player)
      embed.setAuthor({ name: `\u200e${args.user.displayName} (${args.user.id})`, iconURL: args.user.displayAvatarURL() });

    const groupedDescription = Object.entries(group(players, (player) => player.clan.tag))
      .flatMap(([, _raids]) => {
        const raids = _raids!;
        const clan = raids.at(0)!.clan;

        return [
          `### ${escapeMarkdown(clan.name)} (${clan.tag})`,
          raids
            .map(({ member, maxPoints, points }) => `- ${escapeMarkdown(member.name)} (${member.tag})\n - ${points}/${maxPoints} scored`)
            .join('\n')
        ];
      })
      .join('\n');

    const listedDescription = players
      .map(({ member, points, clan, maxPoints }) => {
        return `**${escapeMarkdown(member.name)} (${member.tag})** \n${points}/${maxPoints} in ${escapeMarkdown(clan.name)} scored`;
      })
      .join('\n\n');

    if (args.is_grouped) embed.setDescription(groupedDescription || null);
    else embed.setDescription(listedDescription || null);

    const totalPoints = players.reduce((a, b) => a + b.points, 0);
    const maxTotalPoints = players.reduce((a, b) => a + b.maxPoints, 0);
    embed.setFooter({
      text: `${totalPoints.toLocaleString()}/${maxTotalPoints.toLocaleString()} ${Util.plural(totalPoints, 'Point')} (${seasonId})`
    });

    return embed;
  }

  private getComponents(args: CommandArgs) {
    const payload: CustomIdProps = {
      cmd: this.id,
      user_id: args.user?.id,
      player_tag: args.player_tag,
      is_grouped: args.is_grouped
    };

    const customIds = {
      clanGames: this.createId({ ...payload, type: RemainingType.CLAN_GAMES }),
      capitalRaids: this.createId({ ...payload, type: RemainingType.CAPITAL_RAIDS }),
      warAttacks: this.createId({ ...payload, type: RemainingType.WAR_ATTACKS }),
      refresh: this.createId({ ...payload, type: args.type }),
      group: this.createId({ ...payload, type: args.type, is_grouped: !args.is_grouped })
    };

    const row = new ActionRowBuilder<ButtonBuilder>();

    const refreshButton = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh).setEmoji(EMOJIS.REFRESH);
    const sortButton = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(customIds.group).setEmoji(EMOJIS.SORTING);

    row.addComponents(refreshButton, sortButton);

    if (args.type !== RemainingType.WAR_ATTACKS)
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setCustomId(customIds.warAttacks).setLabel('War Attacks'));

    if (args.type !== RemainingType.CAPITAL_RAIDS && !(new Date().getDay() > 1 && new Date().getDay() < 5))
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setCustomId(customIds.capitalRaids).setLabel('Capital Raids'));

    if (args.type !== RemainingType.CLAN_GAMES && new Date().getDate() >= 22 && new Date().getDate() <= 28)
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setCustomId(customIds.clanGames).setLabel('Clan Games'));

    return row;
  }
}
