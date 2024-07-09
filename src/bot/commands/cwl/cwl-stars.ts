import { APIClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, StringSelectMenuBuilder, User } from 'discord.js';
import moment from 'moment';
import { getClanSwitchingMenu } from '../../helper/clans.helper.js';
import { Command } from '../../lib/index.js';
import { ClanWarLeagueGroupAggregated } from '../../struct/Http.js';
import { EMOJIS } from '../../util/emojis.js';
import { padStart } from '../../util/helper.js';
import { Util } from '../../util/index.js';

export default class CWLStarsCommand extends Command {
  public constructor() {
    super('cwl-stars', {
      category: 'cwl',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User; season?: string }) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const [{ body, res }, group] = await Promise.all([
      this.client.http.getClanWarLeagueGroup(clan.tag),
      this.client.storage.getWarTags(clan.tag, args.season)
    ]);
    if (res.status === 504 || body.state === 'notInWar') {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.still_searching', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
      });
    }

    const isIncorrectSeason = !res.ok && !args.season && group && group.season !== Util.getCWLSeasonId();
    const entityLike = args.season && res.ok && args.season !== body.season ? group : res.ok ? body : group;
    const isApiData = args.season ? res.ok && body.season === args.season : res.ok;

    if ((!res.ok && !group) || !entityLike || isIncorrectSeason) {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
      });
    }

    const aggregated = await this.client.http.aggregateClanWarLeague(clan.tag, { ...entityLike, leagues: group?.leagues ?? {} }, isApiData);

    if (!aggregated) {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
      });
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
      args: {
        tag?: string;
        user?: User;
        list_view?: 'TOTAL' | 'GAINED';
      };
    }
  ) {
    const clanTag = clan.tag;
    const members: {
      [key: string]: {
        name: string;
        tag: string;
        of: number;
        attacks: number;
        stars: number;
        dest: number;
        lost: number;
        townhallLevel: number;
      };
    } = {};

    for (const data of body.rounds) {
      if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
        const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
        if (['inWar', 'warEnded'].includes(data.state)) {
          for (const m of clan.members) {
            // eslint-disable-next-line
            members[m.tag] ??= {
              name: m.name || m.tag,
              tag: m.tag,
              of: 0,
              attacks: 0,
              stars: 0,
              dest: 0,
              lost: 0,
              townhallLevel: m.townhallLevel
            };
            const member = members[m.tag];
            member.of += 1;

            if (m.attacks?.length) {
              member.attacks += 1;
              member.stars += m.attacks[0].stars;
              member.dest += m.attacks[0].destructionPercentage;
            }
            if (m.bestOpponentAttack) {
              member.lost += m.bestOpponentAttack.stars;
            }
          }
        }
      }
    }

    const leaderboard = Object.values(members);
    if (!leaderboard.length && body.season !== Util.getCWLSeasonId()) {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
      });
    }
    if (!leaderboard.length)
      return interaction.followUp({ ephemeral: true, content: this.i18n('command.cwl.no_rounds', { lng: interaction.locale }) });
    leaderboard.sort((a, b) => b.dest - a.dest).sort((a, b) => b.stars - a.stars);

    const comparisonMode = args.list_view === 'GAINED';
    const listView = comparisonMode ? 'GAINED' : 'TOTAL';

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small });

    if (comparisonMode) {
      embed.setDescription(
        [
          '**Clan War League Stars**',
          `**\`\u200e # STR GAIN TH  ${'NAME'.padEnd(15, ' ')}\`**`,
          leaderboard
            .filter((m) => m.of > 0)
            .map((m, i) => {
              const gained = m.stars - m.lost >= 0 ? `+${m.stars - m.lost}` : `${m.stars - m.lost}`;
              const name = Util.escapeBackTick(`${m.name}`).padEnd(15, ' ');
              return `\`\u200e${this.pad(++i)} ${this.pad(m.stars)}  ${gained.padStart(3, ' ')}  ${padStart(m.townhallLevel, 2)}  ${name}\``;
            })
            .join('\n')
        ].join('\n')
      );
    } else {
      embed.setDescription(
        [
          '**Clan War League Stars**',
          `\u200e\` # STR DEST HIT  TH ${'NAME'.padEnd(15, ' ')}\u200f\``,
          leaderboard
            .filter((m) => m.of > 0)
            .map((m, i) => {
              const idx = this.pad(++i);
              const stars = this.pad(m.stars, 3);
              const dest = `${Math.floor(m.dest)}%`.padStart(4, ' ');
              const hit = [m.attacks, m.of].join('/');
              const name = Util.escapeBackTick(m.name).padEnd(15, ' ');
              const th = padStart(m.townhallLevel, 2);
              return `\u200e\`${idx} ${stars} ${dest} ${hit}  ${th} ${name}\u200f\``;
            })
            .join('\n')
        ].join('\n')
      );
    }

    embed.setFooter({ text: `${moment(body.season).format('MMM YYYY')} CWL` });

    const payload = {
      cmd: this.id,
      tag: clanTag,
      list_view: args.list_view
    };

    const customIds = {
      refresh: this.createId(payload),
      toggle: this.createId({ ...payload, string_key: 'list_view' }),
      clans: this.createId({ cmd: this.id, string_key: 'tag' })
    };

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh)
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId(customIds.toggle)
      .setPlaceholder('Select a filter!')
      .addOptions(
        [
          {
            label: 'Total Stars (Offense)',
            value: 'TOTAL',
            description: 'Total offense stars comparison.'
          },
          {
            label: 'Offense vs/ Defense',
            value: 'GAINED',
            description: '[Offense - Defense] stars comparison.'
          }
        ].map((option) => ({
          ...option,
          default: option.value === listView
        }))
      );
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const clanMenu = await getClanSwitchingMenu(interaction, customIds.clans, clanTag);
    return interaction.editReply({ embeds: [embed], components: clanMenu ? [buttonRow, menuRow, clanMenu] : [buttonRow, menuRow] });
  }

  private pad(num: number, depth = 2) {
    return num.toString().padStart(depth, ' ');
  }
}
