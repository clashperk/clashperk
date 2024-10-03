import { APIClanWar, APIWarClan } from 'clashofclans.js';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { Util } from '../../util/toolkit.js';

const states: Record<string, string> = {
  inWar: '**End time:**',
  preparation: '**Start time:**',
  warEnded: '**Ended:**'
};

export default class SummaryWarsCommand extends Command {
  public constructor() {
    super('summary-wars', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const result = (await Promise.all(clans.map((clan) => this.getWAR(clan.tag)))).flat();
    const wars = result.filter((res) => res.state !== 'notInWar');

    wars.sort((a, b) => this.remAtkDiff(a) - this.remAtkDiff(b));
    wars.sort((a, b) => this.dateDiff(a) - this.dateDiff(b));

    const prepWars = wars.filter((war) => war.state === 'preparation');
    const inWarWars = wars.filter((war) => war.state === 'inWar' && !this.isCompleted(war));
    const completedWars = wars.filter((war) => war.state === 'inWar' && this.isCompleted(war));
    const endedWars = wars.filter((war) => war.state === 'warEnded');

    const sorted = [...inWarWars, ...completedWars, ...prepWars, ...endedWars];
    if (!sorted.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

    const chunks = Array(Math.ceil(sorted.length / 15))
      .fill(0)
      .map(() => sorted.splice(0, 15));
    for (const chunk of chunks) {
      const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
      for (const data of chunk) {
        embed.addFields({
          name: `${data.clan.name} ${EMOJIS.VS_BLUE} ${data.opponent.name} ${data.round ? `(CWL Round #${data.round})` : ''}`,
          value: [
            `${data.state === 'preparation' ? '' : this.getLeaderBoard(data.clan, data.opponent)}`,
            `${states[data.state]} ${Util.getRelativeTime(moment(this._getTime(data)).toDate().getTime())}`,
            '\u200b'
          ].join('\n')
        });
      }
      await interaction.followUp({ embeds: [embed] });
    }
  }

  private get onGoingCWL() {
    return new Date().getDate() >= 1 && new Date().getDate() <= 10;
  }

  private async getWAR(clanTag: string) {
    if (this.onGoingCWL) return this.getCWL(clanTag);
    const { res, body } = await this.client.coc.getCurrentWar(clanTag);
    return res.ok ? [{ ...body, round: 0 }] : [];
  }

  private async getCWL(clanTag: string) {
    const { res, body: group } = await this.client.coc.getClanWarLeagueGroup(clanTag);

    if (res.status === 504 || group.state === 'notInWar') return [];
    if (!res.ok) {
      const { res, body } = await this.client.coc.getCurrentWar(clanTag);
      return res.ok ? [{ ...body, round: 0 }] : [];
    }

    const chunks = await this.client.coc._clanWarLeagueRounds(clanTag, group);
    const war =
      chunks.find((data) => data.state === 'inWar') ??
      chunks.find((data) => data.state === 'preparation') ??
      chunks.find((data) => data.state === 'warEnded');
    return war ? [war] : [];
  }

  private getLeaderBoard(clan: APIWarClan, opponent: APIWarClan) {
    return [
      `${EMOJIS.STAR} ${clan.stars}/${opponent.stars}`,
      `${EMOJIS.SWORD} ${clan.attacks}/${opponent.attacks}`,
      `${EMOJIS.FIRE} ${clan.destructionPercentage.toFixed(2)}%/${opponent.destructionPercentage.toFixed(2)}%`
    ].join(' ');
  }

  private _getTime(data: APIClanWar) {
    return data.state === 'preparation' ? data.startTime : data.endTime;
  }

  private dateDiff(data: APIClanWar) {
    return Math.abs(moment(data.endTime).toDate().getTime() - new Date().getTime());
  }

  private remAtkDiff(data: APIClanWar) {
    return (data.clan.attacks * 100) / (data.teamSize * (data.attacksPerMember ?? 1));
  }

  private isCompleted(data: APIClanWar) {
    return data.clan.attacks === data.teamSize * (data.attacksPerMember ?? 1);
  }
}
