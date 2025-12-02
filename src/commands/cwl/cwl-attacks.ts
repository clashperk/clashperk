import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  User,
  escapeInlineCode,
  escapeMarkdown,
  time
} from 'discord.js';
import moment from 'moment';
import { Args, Command } from '../../lib/handlers.js';
import { ClanWarLeagueGroupAggregated } from '../../struct/clash-client.js';
import { EMOJIS, RED_NUMBERS, WAR_STAR_COMBINATIONS, WHITE_NUMBERS } from '../../util/emojis.js';
import { Util } from '../../util/toolkit.js';

const stars: Record<string, string> = {
  0: '☆☆☆',
  1: '★☆☆',
  2: '★★☆',
  3: '★★★'
};

const emojiStars: Record<string, string> = {
  0: WAR_STAR_COMBINATIONS.EEE,
  1: WAR_STAR_COMBINATIONS.NEE,
  2: WAR_STAR_COMBINATIONS.NNE,
  3: WAR_STAR_COMBINATIONS.NNN
};

export default class CWLAttacksCommand extends Command {
  public constructor() {
    super('cwl-attacks', {
      category: 'cwl',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public args(): Args {
    return {
      clan: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { tag?: string; user?: User; season?: string }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const [{ body, res }, group] = await Promise.all([
      this.client.coc.getClanWarLeagueGroup(clan.tag),
      this.client.storage.getWarTags(clan.tag, args.season)
    ]);
    if (res.status === 504 || body.state === 'notInWar') {
      return interaction.editReply(
        this.i18n('command.cwl.still_searching', {
          lng: interaction.locale,
          clan: `${clan.name} (${clan.tag})`
        })
      );
    }

    const isIncorrectSeason =
      !res.ok && !args.season && group && group.season !== Util.getCWLSeasonId();
    const entityLike =
      args.season && res.ok && args.season !== body.season ? group : res.ok ? body : group;
    const isApiData = args.season ? res.ok && body.season === args.season : res.ok;

    if ((!res.ok && !group) || !entityLike || isIncorrectSeason) {
      return interaction.editReply(
        this.i18n('command.cwl.not_in_season', {
          lng: interaction.locale,
          clan: `${clan.name} (${clan.tag})`
        })
      );
    }

    const aggregated = await this.client.coc.aggregateClanWarLeague(
      clan.tag,
      { ...entityLike, leagues: group?.leagues ?? {} },
      isApiData
    );

    if (!aggregated) {
      return interaction.editReply(
        this.i18n('command.cwl.not_in_season', {
          lng: interaction.locale,
          clan: `${clan.name} (${clan.tag})`
        })
      );
    }

    return this.rounds(interaction, {
      body: aggregated,
      clan,
      args
    });
  }

  private async rounds(
    interaction: CommandInteraction<'cached'>,
    {
      body,
      clan,
      args
    }: {
      body: ClanWarLeagueGroupAggregated;
      clan: APIClan;
      args: { tag?: string; user?: User; round?: number; missed?: boolean; season?: string };
    }
  ) {
    const clanTag = clan.tag;

    let i = 0;
    const missed: { [key: string]: { name: string; count: number } } = {};
    const chunks: { embed: EmbedBuilder; state: string; round: number }[] = [];
    for (const data of body.wars) {
      if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
        const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
        const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;

        const embed = new EmbedBuilder()
          .setColor(this.client.embed(interaction))
          .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

        if (['warEnded', 'inWar'].includes(data.state)) {
          const endTimestamp = new Date(moment(data.endTime).toDate());
          const attackers: {
            name: string;
            stars: number;
            destruction: number;
            mapPosition: number;
          }[] = [];
          const slackers: { name: string; mapPosition: number; townHallLevel: number }[] = [];

          const clanMembers =
            data.clan.tag === clan.tag ? data.clan.members : data.opponent.members;
          const starTypes = [] as number[];
          clanMembers
            .sort((a, b) => a.mapPosition - b.mapPosition)
            .forEach((member, index) => {
              if (member.attacks?.length) {
                attackers.push({
                  name: member.name || member.tag,
                  mapPosition: index + 1,
                  stars: member.attacks.at(0)!.stars,
                  destruction: member.attacks.at(0)!.destructionPercentage
                });
                starTypes.push(member.attacks.at(0)!.stars);
              } else {
                slackers.push({
                  name: member.name || member.tag,
                  mapPosition: index + 1,
                  townHallLevel: member.townhallLevel
                });
              }
            });

          const starCounts = Object.entries(
            starTypes.reduce<Record<number, number>>((acc, star) => {
              acc[star] = (acc[star] || 0) + 1;
              return acc;
            }, {})
          ).sort(([a], [b]) => Number(b) - Number(a));

          embed.setDescription(
            [
              '**War Against**',
              `\u200e${opponent.name} (${opponent.tag})`,
              '',
              `${data.state === 'inWar' ? 'Battle Day' : 'War Ended'} (${time(endTimestamp, 'R')})`
            ].join('\n')
          );

          if (attackers.length) {
            embed.setDescription(
              [
                embed.data.description,
                '',
                `**Total Attacks - ${clanMembers.filter((m) => m.attacks).length}/${data.teamSize}**`,
                attackers
                  .map(
                    (mem) =>
                      `\`\u200e${this.index(mem.mapPosition)} ${stars[mem.stars]} ${this.percentage(
                        mem.destruction
                      )}% ${this.padEnd(mem.name)}\``
                  )
                  .join('\n')
              ].join('\n')
            );
          }

          if (slackers.length) {
            embed.setDescription(
              [
                embed.data.description,
                '',
                `**${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
                slackers
                  .map((mem) => `\`\u200e${this.index(mem.mapPosition)} ${this.padEnd(mem.name)}\``)
                  .join('\n')
              ].join('\n')
            );
          } else {
            embed.setDescription(
              [
                embed.data.description,
                '',
                `**No ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`
              ].join('\n')
            );
          }

          if (data.state !== 'preparation' && starCounts.length) {
            embed.setDescription(
              [
                embed.data.description,
                '',
                '**Attack Summary**',
                starCounts
                  .map(([star, count]) => `**${emojiStars[star]} ${WHITE_NUMBERS[count]}**`)
                  .join(' ')
              ].join('\n')
            );
          }
        }

        if (data.state === 'preparation') {
          const startTimestamp = new Date(moment(data.startTime).toDate());
          embed.setDescription(
            [
              '**War Against**',
              `\u200e${opponent.name} (${opponent.tag})`,
              '',
              `Preparation (${time(startTimestamp, 'R')})`,
              '',
              'Wait for the Battle day!'
            ].join('\n')
          );
        }

        if (data.state === 'warEnded') {
          for (const mem of clan.members) {
            if (mem.attacks?.length) continue;
            missed[mem.tag] = {
              name: mem.name || mem.tag,
              count: Number((missed[mem.tag] || { count: 0 }).count) + 1
            };
          }
        }

        embed.setFooter({ text: `Round #${++i}` });
        chunks.push({ state: data.state, round: i, embed });
      }
    }

    if (!chunks.length && body.season !== Util.getCWLSeasonId()) {
      return interaction.editReply(
        this.i18n('command.cwl.not_in_season', {
          lng: interaction.locale,
          clan: `${clan.name} (${clan.tag})`
        })
      );
    }
    if (!chunks.length) {
      return interaction.editReply(this.i18n('command.cwl.no_rounds', { lng: interaction.locale }));
    }

    const members = Object.values(missed);
    const missedEmbed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
      .setDescription(
        [
          '**All Missed Attacks**',
          '',
          members.map((mem) => `${RED_NUMBERS[mem.count]} ${escapeMarkdown(mem.name)}`).join('\n')
        ].join('\n')
      );

    const round =
      chunks.find((c) => (args.round ? c.round === Number(args.round) : c.state === 'inWar')) ??
      chunks.slice(-1).at(0)!;
    const selectedRound = args.round ?? round.round;

    const payload = {
      cmd: this.id,
      tag: clanTag,
      season: args.season,
      missed: args.missed,
      round: args.round
    };

    const embed = args.missed ? missedEmbed : round.embed;

    const customIds = {
      refresh: this.createId({ ...payload }),
      missed: this.createId({ ...payload, missed: !args.missed }),
      rounds: this.createId({ ...payload, string_key: 'round' })
    };

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(args.missed ? 'Return to Attacks' : 'All Missed Attacks')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(customIds.missed)
    );

    const options = chunks
      .map((ch) => ({ label: `Round #${ch.round}`, value: ch.round.toString() }))
      .map((option) => ({
        ...option,
        default: option.value === selectedRound.toString()
      }));
    const menu = new StringSelectMenuBuilder()
      .addOptions(options)
      .setCustomId(customIds.rounds)
      .setPlaceholder('Select a round!');
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(menu);

    return interaction.editReply({
      embeds: [embed],
      components: args.missed ? [buttonRow] : [buttonRow, menuRow]
    });
  }

  private padEnd(name: string) {
    return escapeInlineCode(name).padEnd(20, ' ');
  }

  private index(num: number) {
    return num.toString().padStart(2, ' ');
  }

  private percentage(num: number) {
    return num.toString().padStart(3, ' ');
  }
}
