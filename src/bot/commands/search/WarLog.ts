import { EmbedBuilder, CommandInteraction } from 'discord.js';
import moment from 'moment';
import { Collections, WarType } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

export default class WarLogCommand extends Command {
	public constructor() {
		super('warlog', {
			category: 'war',
			channel: 'guild',
			clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
			description: {
				content: 'Shows last 10 clan war logs with war Id.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const data = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!data) return;

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({
				name: `${data.name} (${data.tag})`,
				iconURL: `${data.badgeUrls.medium}`,
				url: `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`
			})
			.setDescription(
				[`${data.warWins} Wins, ${data.isWarLogPublic ? `${data.warLosses!} Losses,` : ''} ${data.warWinStreak} Win Streak`].join(
					'\n'
				)
			);

		if (!data.isWarLogPublic) {
			embed.setDescription('War Log is Private');
			return interaction.editReply({ embeds: [embed] });
		}

		const wars = await this.client.db
			.collection(Collections.CLAN_WARS)
			.find({
				$or: [{ 'clan.tag': data.tag }, { 'opponent.tag': data.tag }],
				warType: { $ne: WarType.CWL },
				state: 'warEnded'
			})
			.sort({ _id: -1 })
			.limit(20)
			.toArray();

		const body = await this.client.http.clanWarLog(data.tag, { limit: 10 });
		if (!body.ok) {
			return interaction.editReply('**504 Request Timeout!**');
		}

		for (const item of body.items) {
			const extra = this.getWarInfo(wars, item);
			const { clan, opponent } = item;
			const time = Util.duration(Date.now() - new Date(moment(item.endTime).toDate()).getTime());
			embed.addFields([
				{
					name: `\u200b\n\u200e${this.result(item.result)} ${opponent.name || 'Clan War League'} ${
						extra ? `\u200e(#${extra.id as string})` : ''
					}`,
					value: [
						`${EMOJIS.STAR} \`\u200e${this.padStart(clan.stars)} / ${this.padEnd(opponent.stars)}\u200f\`\u200e ${
							EMOJIS.FIRE
						} ${(clan.destructionPercentage || 0).toFixed(2)}% ${
							opponent.name ? `/ ${(opponent.destructionPercentage || 0).toFixed(2)}%` : ''
						}`,
						`${EMOJIS.USERS} \`\u200e${this.padStart(item.teamSize)} / ${this.padEnd(item.teamSize)}\u200f\`\u200e ${
							EMOJIS.SWORD
						} ${clan.attacks}${extra ? ` / ${extra.attacks as string}` : ''} ${EMOJIS.CLOCK} ${time} ago`
					].join('\n')
				}
			]);
		}

		return interaction.editReply({ embeds: [embed] });
	}

	private getWarInfo(wars: any[], war: any) {
		const data = wars.find(
			(en) =>
				war.opponent?.tag && [en.clan.tag, en.opponent.tag].includes(war.opponent.tag) && this.compareDate(war.endTime, en.endTime)
		);
		if (!data) return null;
		return { id: data.id, attacks: data.opponent.attacks };
	}

	private result(result: string | null) {
		if (result === 'win') return `${EMOJIS.OK}`;
		if (result === 'lose') return `${EMOJIS.WRONG}`;
		return EMOJIS.EMPTY;
	}

	private padEnd(num: number) {
		return num.toString().padEnd(3, ' ');
	}

	private padStart(num: number) {
		return num.toString().padStart(3, ' ');
	}

	private compareDate(apiDate: string, dbDate: Date) {
		return new Date(moment(apiDate).toDate()) >= dbDate;
	}
}
