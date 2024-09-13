import { APIClanWar, APIClanWarAttack, APIClanWarMember, APIWarClan } from 'clashofclans.js';
import { CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { Collections, WarType } from '../../util/constants.js';
import { BLUE_NUMBERS, EMOJIS, ORANGE_NUMBERS, WHITE_NUMBERS } from '../../util/emojis.js';
import { getExportComponents } from '../../util/helper.js';
import { handlePagination } from '../../util/pagination.js';
import { Util } from '../../util/toolkit.js';

const stars: Record<string, string> = {
  0: '☆☆☆',
  1: '★☆☆',
  2: '★★☆',
  3: '★★★'
};

const warTypes: Record<string, string> = {
  1: 'REGULAR',
  2: 'FRIENDLY',
  3: 'CWL'
};

export default class WarHistoryCommand extends Command {
  public constructor() {
    super('war-attacks-history', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; player_tag?: string; user?: User }) {
    if (args.player_tag) {
      const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
      if (!player) return null;
      return this.getIndividualWars(interaction, [player]);
    }

    if (args.clans) {
      const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
      if (!clans) return;

      const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag).slice(0, 1));
      const players = _clans.flatMap((clan) => clan.memberList);
      return this.getIndividualWars(interaction, players);
    }

    const players = await this.client.resolver.getPlayers(args.user?.id ?? interaction.user.id);
    return this.getIndividualWars(interaction, players);
  }

  private async getHistory(interaction: CommandInteraction<'cached'>, _playerTags: string[]) {
    const { attacks: _wars } = await this.getWars('', { name: '', tag: '' });

    const warMap = _wars.reduce<Record<string, IWar[]>>((acc, war) => {
      const key = `${war.member.name} (${war.member.tag})`;
      acc[key] ??= []; // eslint-disable-line
      acc[key].push(war);
      return acc;
    }, {});

    const embeds: EmbedBuilder[] = [];
    Object.entries(warMap)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([key, userGroups]) => {
        const embed = new EmbedBuilder().setColor(this.client.embed(interaction));

        const _warsMap = userGroups.reduce<Record<string, IWar[]>>((acc, war) => {
          const seasonId = war.endTime.toISOString().slice(0, 7);
          acc[seasonId] ??= []; // eslint-disable-line
          acc[seasonId].push(war);
          return acc;
        }, {});

        const __wars = Object.entries(_warsMap);
        const value = __wars
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([seasonId, wars], i) => {
            wars.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
            const participated = wars.filter((war) => war.attack).length;
            const totalStars = wars.reduce((acc, war) => acc + (war.attack?.stars ?? 0), 0);
            const totalDestruction = wars.reduce((acc, war) => acc + (war.attack?.destructionPercentage ?? 0), 0);
            const season = moment(seasonId).format('MMM YYYY').toString();
            const [{ member }] = wars;
            return [
              `**${season}** (#${member.mapPosition}, TH${member.townhallLevel})`,
              wars
                .filter((war) => war.attack)
                .map(({ attack, defender }, i) => {
                  return `${WHITE_NUMBERS[i + 1]} ${stars[attack!.stars]} \`${this.percentage(
                    attack!.destructionPercentage
                  )}\` \u200b → ${BLUE_NUMBERS[defender!.mapPosition]}${ORANGE_NUMBERS[defender!.townhallLevel]}`;
                })
                .join('\n'),
              `${EMOJIS.CROSS_SWORD} ${participated}/${wars.length} wars, ${totalStars} stars, ${totalDestruction}%`,
              i === __wars.length - 1 ? '' : '\u200b'
            ].join('\n');
          })
          .join('\n');
        embed.setTitle('**War attack history (last 3 months)**');
        embed.setDescription(`**${key}**\n\n${value}`);
        embeds.push(embed);
      });

    if (!embeds.length) {
      return interaction.editReply('No war attack history found.');
    }

    if (embeds.length === 1) {
      return interaction.editReply({ embeds: [...embeds], components: [] });
    }

    return handlePagination(interaction, embeds);
  }

  private async getIndividualWars(interaction: CommandInteraction<'cached'>, players: { name: string; tag: string }[]) {
    const result = await Promise.all(players.map((player) => this.getWars(player.tag, player)));
    if (!result.length) {
      return interaction.editReply('No war history available at this moment.');
    }
    return this.export(interaction, result);
  }

  private async getWars(tag: string, player: { name: string; tag: string }) {
    const cursor = this.client.db.collection(Collections.CLAN_WARS).aggregate<APIClanWar & { warType: number }>([
      {
        $match: {
          preparationStartTime: {
            $gte: moment().startOf('month').subtract(6, 'month').toDate()
          },
          warType: WarType.REGULAR,
          $or: [{ 'clan.members.tag': tag }, { 'opponent.members.tag': tag }]
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const attacks = [];
    const wars: WarHistory[] = [];
    for await (const data of cursor) {
      data.clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
      data.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

      const clanMember = data.clan.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
      const member = clanMember ?? data.opponent.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
      if (!member) continue;

      const clan = clanMember ? data.clan : data.opponent;
      const opponent = clan.tag === data.clan.tag ? data.opponent : data.clan;
      const __attacks = clan.members.flatMap((m) => m.attacks ?? []);

      const war: WarHistory = {
        warType: data.warType,
        clan: {
          name: clan.name,
          tag: clan.tag
        },
        opponent: {
          name: opponent.name,
          tag: opponent.tag
        },
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        attacker: {
          name: member.name,
          mapPosition: member.mapPosition,
          tag: member.tag,
          townHallLevel: member.townhallLevel
        },
        attacks: []
      };

      const memberAttacks = __attacks.filter((atk) => atk.attackerTag === tag);
      if (!memberAttacks.length) {
        attacks.push({
          attack: null,
          previousBestAttack: null,
          defender: null,
          clan: {
            name: clan.name,
            tag: clan.tag
          },
          endTime: new Date(data.endTime),
          member
        });
      }

      for (const atk of memberAttacks) {
        const { previousBestAttack, defender } = this.getPreviousBestAttack(__attacks, opponent, atk);

        attacks.push({
          attack: atk,
          previousBestAttack,
          defender,
          clan: {
            name: clan.name,
            tag: clan.tag
          },
          endTime: new Date(data.endTime),
          member
        });

        war.attacks.push({
          defender: {
            tag: defender.tag,
            mapPosition: defender.mapPosition,
            townHallLevel: defender.townhallLevel
          },
          defenderTag: defender.tag,
          destructionPercentage: atk.destructionPercentage,
          stars: atk.stars
        });
      }
      wars.push(war);
    }

    return { wars, attacks, player };
  }

  private percentage(num: number) {
    return `${num}%`.toString().padStart(4, ' ');
  }

  private getPreviousBestAttack(attacks: APIClanWarAttack[], opponent: APIWarClan, atk: APIClanWarAttack) {
    const defender = opponent.members.find((m) => m.tag === atk.defenderTag)!;
    const defenderDefenses = attacks.filter((atk) => atk.defenderTag === defender.tag);
    const isFresh = defenderDefenses.length === 0 || atk.order === Math.min(...defenderDefenses.map((d) => d.order));
    const previousBestAttack = isFresh
      ? null
      : [...attacks]
          .filter((_atk) => _atk.defenderTag === defender.tag && _atk.order < atk.order && _atk.attackerTag !== atk.attackerTag)
          .sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)
          .at(0) ?? null;
    return { previousBestAttack: isFresh ? null : previousBestAttack, defender, isFresh };
  }

  private async export(
    interaction: CommandInteraction<'cached'>,
    aggregated: { wars: WarHistory[]; player: { name: string; tag: string } }[]
  ) {
    const sheets: CreateGoogleSheet[] = [];

    for (const { wars, player } of aggregated) {
      const warsFlatten = wars
        .map((war) => {
          if (war.attacks.length) {
            return war.attacks.map((attack) => ({ ...war, attack }));
          }
          return [{ ...war, attack: null }];
        })
        .flat();

      sheets.push({
        title: Util.escapeSheetName(`${player.name} (${player.tag})`),
        columns: [
          { name: 'War Type', width: 100, align: 'LEFT' },
          { name: 'Clan', width: 160, align: 'LEFT' },
          { name: 'Opponent', width: 160, align: 'LEFT' },
          { name: 'Date', width: 160, align: 'LEFT' },
          { name: 'Map Position', width: 100, align: 'RIGHT' },
          { name: 'Town Hall', width: 100, align: 'RIGHT' },
          { name: 'Stars', width: 100, align: 'RIGHT' },
          { name: 'Destruction', width: 100, align: 'RIGHT' },
          { name: 'Opponent Map', width: 100, align: 'RIGHT' },
          { name: 'Opponent TH', width: 100, align: 'RIGHT' }
        ],
        rows: warsFlatten.map((war) => [
          warTypes[war.warType],
          war.clan.name,
          war.opponent.name,
          moment(war.startTime).toDate(),
          war.attacker.mapPosition,
          war.attacker.townHallLevel,
          war.attack?.stars,
          war.attack?.destructionPercentage,
          war.attack?.defender.mapPosition,
          war.attack?.defender.townHallLevel
        ])
      });
    }

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [War Attack History]`, sheets);
    return interaction.editReply({ content: '**War Attacks History (last 6 months)**', components: getExportComponents(spreadsheet) });
  }
}

interface WarHistory {
  warType: number;
  startTime: Date;
  endTime: Date;
  clan: {
    name: string;
    tag: string;
  };
  opponent: {
    name: string;
    tag: string;
  };
  attacker: {
    name: string;
    tag: string;
    townHallLevel: number;
    mapPosition: number;
  };
  attacks: {
    stars: number;
    defenderTag: string;
    destructionPercentage: number;
    defender: {
      tag: string;
      townHallLevel: number;
      mapPosition: number;
    };
  }[];
}

interface IWar {
  attack: APIClanWarAttack | null;
  previousBestAttack: APIClanWarAttack | null;
  defender: APIClanWarMember | null;
  clan: {
    name: string;
    tag: string;
  };
  endTime: Date;
  member: APIClanWarMember;
}
