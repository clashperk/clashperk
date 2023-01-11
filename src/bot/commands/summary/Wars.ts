import { ClanWar, WarClan } from 'clashofclans.js';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { EMOJIS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

const states: Record<string, string> = {
	inWar: '**End Time:**',
	preparation: '**Start Time:**',
	warEnded: '**End Time:**'
};

export default class FamilyWarsCommand extends Command {
	public constructor() {
		super('family-wars', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guild.id);
		if (!clans.length) return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));

		const embed = new EmbedBuilder();
		const result = await Promise.all(clans.map((clan) => this.getWAR(clan.tag) as Promise<ClanWar & { round?: number }>));
		const wars = result.filter((res) => res.ok && res.state !== 'notInWar');

		wars.sort((a, b) => this.remAtkDiff(a) - this.remAtkDiff(b));
		wars.sort((a, b) => this.dateDiff(a) - this.dateDiff(b));

		const prepWars = wars.filter((war) => war.state === 'preparation');
		const inWarWars = wars.filter((war) => war.state === 'inWar' && !this.isCompleted(war));
		const completedWars = wars.filter((war) => war.state === 'inWar' && this.isCompleted(war));
		const endedWars = wars.filter((war) => war.state === 'warEnded');

		for (const data of [...inWarWars, ...completedWars, ...prepWars, ...endedWars]) {
			embed.addFields([
				{
					name: `${data.clan.name} ${EMOJIS.VS_BLUE} ${data.opponent.name} ${data.round ? `(CWL Round #${data.round})` : ''}`,
					value: [
						`${data.state === 'preparation' ? '' : this.getLeaderBoard(data.clan, data.opponent)}`,
						`${states[data.state]} ${Util.getRelativeTime(moment(this._getTime(data)).toDate().getTime())}`,
						'\u200b'
					].join('\n')
				}
			]);
		}

		if (!embed.data.fields?.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		const embeds = Array(Math.ceil(embed.data.fields.length / 15))
			.fill(0)
			.map(() => embed.data.fields!.splice(0, 15))
			.map((fields) => new EmbedBuilder({ color: this.client.embed(interaction), fields }));
		if (embeds.length === 1) return interaction.editReply({ embeds: [embeds.shift()!] });
		for (const embed of embeds) {
			await interaction.followUp({ embeds: [embed] });
		}
	}

	private get onGoingCWL() {
		return new Date().getDate() >= 1 && new Date().getDate() <= 10;
	}

	private getWAR(clanTag: string) {
		if (this.onGoingCWL) return this.getCWL(clanTag);
		return this.client.http.currentClanWar(clanTag);
	}

	private async getCWL(clanTag: string) {
		const res = await this.client.http.clanWarLeague(clanTag);
		if (res.statusCode === 504 || res.state === 'notInWar') return { statusCode: 504 };
		if (!res.ok) return this.client.http.currentClanWar(clanTag);
		const rounds = res.rounds.filter((d) => !d.warTags.includes('#0'));

		const chunks = [];
		for (const { warTags } of rounds.slice(-2)) {
			for (const warTag of warTags) {
				const data = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;
				if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
					chunks.push({
						...data,
						round: res.rounds.findIndex((d) => d.warTags.includes(warTag)) + 1,
						clan: data.clan.tag === clanTag ? data.clan : data.opponent,
						opponent: data.clan.tag === clanTag ? data.opponent : data.clan
					});
					break;
				}
			}
		}

		if (!chunks.length) return { statusCode: 504 };
		return (
			chunks.find((en) => en.state === 'inWar') ??
			chunks.find((en) => en.state === 'preparation') ??
			chunks.find((en) => en.state === 'warEnded')!
		);
	}

	private getLeaderBoard(clan: WarClan, opponent: WarClan) {
		return [
			`${EMOJIS.STAR} ${clan.stars}/${opponent.stars}`,
			`${EMOJIS.SWORD} ${clan.attacks}/${opponent.attacks}`,
			`${EMOJIS.FIRE} ${clan.destructionPercentage.toFixed(2)}%/${opponent.destructionPercentage.toFixed(2)}%`
		].join(' ');
	}

	private _getTime(data: ClanWar) {
		return data.state === 'preparation' ? data.startTime : data.endTime;
	}

	private dateDiff(data: ClanWar) {
		return Math.abs(moment(data.endTime).toDate().getTime() - new Date().getTime());
	}

	private remAtkDiff(data: ClanWar) {
		return (data.clan.attacks * 100) / (data.teamSize * (data.attacksPerMember || 1));
	}

	private isCompleted(data: ClanWar) {
		return data.clan.attacks === data.teamSize * (data.attacksPerMember || 1);
	}
}
