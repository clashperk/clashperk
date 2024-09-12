import { Command } from '@lib/core';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  escapeMarkdown,
  Interaction,
  StringSelectMenuBuilder
} from 'discord.js';
import moment from 'moment';
import { CompeteBoardsEntity } from '../../entities/compete-boards.entity.js';
import { ATTACK_COUNTS, Collections, LEGEND_LEAGUE_ID } from '../../util/constants.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/emojis.js';
import { padStart } from '../../util/helper.js';
import { createInteractionCollector } from '../../util/pagination.js';
import { Season } from '../../util/index.js';
import { Util } from '../../util/index.js';

export default class CompeteCommand extends Command {
  public constructor() {
    super('compete', {
      aliases: ['eos-signup'],
      category: 'compete',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'ManageRoles'],
      defer: true
    });
  }

  async pre(_: Interaction, args: { signup: boolean }) {
    if (args.signup) {
      this.ephemeral = true;
    } else {
      this.ephemeral = false;
    }
  }

  async exec(interaction: CommandInteraction<'cached'>, args: { player_tag: string; signup: boolean; season: string; layout: string }) {
    const collection = this.client.db.collection<CompeteBoardsEntity>(Collections.COMPETE_BOARDS);
    const board = await collection.findOne({ type: 'LEGEND_LEAGUE_TROPHY', guildId: interaction.guildId });

    const seasonId = args.season ?? Season.ID;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(JSON.stringify({ cmd: this.id, seasonId, layout: args.layout })),
      new ButtonBuilder()
        .setLabel('Participate')
        .setStyle(ButtonStyle.Success)
        .setCustomId(this.createId({ cmd: this.id, signup: true, seasonId }))
    );

    if (args.signup) {
      const customIds = {
        account: this.client.uuid(interaction.user.id)
      };

      const linkedPlayers = await this.client.resolver.getPlayers(interaction.user.id, 75);
      const players = linkedPlayers.filter((player) => player.league?.id === LEGEND_LEAGUE_ID);
      players.sort((a, b) => b.trophies - a.trophies);

      if (!players.length) {
        return interaction.editReply({ content: 'No linked accounts found in the Legend League.' });
      }

      const options = players
        .filter((player) => !board?.members.includes(player.tag))
        .slice(0, 25)
        .map((player) => ({
          label: `${player.trophies} | ${player.name} (${player.tag})`,
          emoji: EMOJIS.LEGEND_LEAGUE,
          value: player.tag
        }));

      if (!options.length) {
        return interaction.editReply({ content: 'All linked accounts are already participating.' });
      }

      const menu = new StringSelectMenuBuilder()
        .setMinValues(1)
        .setMaxValues(options.length)
        .setCustomId(customIds.account)
        .setOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
      const message = await interaction.followUp({
        content: 'Select your account(s) to participate in the legend league leaderboard.',
        components: [row],
        ephemeral: true
      });

      return createInteractionCollector({
        message,
        interaction,
        customIds,
        onSelect: async (action) => {
          await action.deferUpdate();

          await collection.updateOne(
            { type: 'LEGEND_LEAGUE_TROPHY', guildId: interaction.guildId },
            {
              $setOnInsert: {
                createdAt: new Date()
              },
              $set: {
                updatedAt: new Date()
              },
              $addToSet: {
                members: { $each: action.values }
              }
            },
            { upsert: true }
          );

          await action.editReply({ content: 'Successfully signed up!', components: [] });
          const embed = await this.getLegendEmbed(interaction, {
            seasonId,
            layout: args.layout,
            playerTags: [...action.values, ...(board?.members ?? [])]
          });

          return interaction.editReply({ embeds: [embed] });
        }
      });
    }

    if (!board || !board.members.length) {
      const embed = new EmbedBuilder()
        .setTitle(`Legend Leaderboard ${moment(seasonId).format('MMM YYYY')}`)
        .setColor(this.client.embed(interaction))
        .setDescription('Waiting for participants...');
      return interaction.editReply({ embeds: [embed] });
    }

    const embed = await this.getLegendEmbed(interaction, { seasonId, playerTags: board.members, layout: args.layout });
    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  public async getLegendEmbed(interaction: CommandInteraction<'cached'>, args: { seasonId: string; playerTags: string[]; layout: string }) {
    const raw = await this.client.db
      .collection(Collections.LEGEND_ATTACKS)
      .find({
        tag: { $in: args.playerTags },
        seasonId: args.seasonId
      })
      .toArray();

    const clans = await this.client.storage.find(interaction.guildId);
    const clansMap = clans.reduce<Record<string, string>>((acc, cur) => {
      acc[cur.tag] = cur.alias ?? cur.name;
      return acc;
    }, {});

    const players = await this.client.http._getPlayers(args.playerTags.map((tag) => ({ tag })));
    const playerClansMap = players.reduce<Record<string, string>>((acc, cur) => {
      acc[cur.tag] = clansMap[cur.clan?.tag ?? '#'] ?? cur.clan?.name ?? '-';
      return acc;
    }, {});

    const members = [];
    const { startTime, endTime, day } = this.getDay();
    for (const legend of raw) {
      const logs = legend.logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
      if (logs.length === 0) continue;

      const attacks = logs.filter((en) => en.type === 'attack' || en.inc > 0);
      const defenses = logs.filter((en) => en.type === 'defense' || en.inc <= 0);

      const [initial] = logs;
      const [current] = logs.slice(-1);

      const attackCount = Math.min(attacks.length);
      const defenseCount = Math.min(defenses.length);

      const trophiesFromAttacks = attacks.reduce((acc, cur) => acc + cur.inc, 0);
      const trophiesFromDefenses = defenses.reduce((acc, cur) => acc + cur.inc, 0);

      const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

      members.push({
        name: legend.name,
        tag: legend.tag,
        attacks,
        defenses,
        attackCount,
        defenseCount,
        trophiesFromAttacks,
        trophiesFromDefenses,
        netTrophies,
        initial,
        current
      });
    }
    members.sort((a, b) => b.current.end - a.current.end);

    const embed = new EmbedBuilder()
      .setTitle(`Legend Leaderboard ${moment(Season.ID).format('MMM YYYY')}`)
      .setColor(this.client.embed(interaction))
      .setTimestamp()
      .setFooter({ text: `Day ${day}` });

    if (!members.length) {
      embed.setDescription('Waiting for participants...');
      return embed;
    }

    if (args.layout === 'compact') {
      embed.setDescription(
        members
          .map((member, idx) => {
            const name = escapeMarkdown(member.name);
            const trophies = `${padStart(member.current.end, 4)}`;
            const clan = escapeMarkdown(playerClansMap[member.tag]);

            return `${BLUE_NUMBERS[idx + 1]} \`${trophies} ${name} ${clan}\``;
          })
          .join('\n')
      );
    } else {
      embed.setDescription(
        members
          .map((member, idx) => {
            const attackCount = padStart(`+${member.trophiesFromAttacks}${ATTACK_COUNTS[Math.min(9, member.attackCount)]}`, 4);
            const defenseCount = padStart(`-${Math.abs(member.trophiesFromDefenses)}${ATTACK_COUNTS[Math.min(9, member.defenseCount)]}`, 4);
            const trophies = `${padStart(member.current.end, 4)}`;
            const name = escapeMarkdown(member.name);

            return `${BLUE_NUMBERS[idx + 1]} \`${trophies}\` \u200b \`${attackCount}\` \u200b \`${defenseCount}\` ${name}`;
          })
          .join('\n')
      );
    }

    return embed;
  }

  private getDay(day?: number) {
    if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };
    const days = Util.getLegendDays();
    const num = Math.min(days.length, Math.max(day, 1));
    return { ...days[num - 1], day };
  }
}
