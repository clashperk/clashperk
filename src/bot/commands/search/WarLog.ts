import { MessageEmbed, Message } from 'discord.js';
import { Collections, WarType } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import 'moment-duration-format';
import moment from 'moment';
import { Util } from '../../util/Util';

export default class WarLogCommand extends Command {
	public constructor() {
		super('warlog', {
			aliases: ['warlog', 'wl'],
			category: 'war',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows last 10 Clan War Logs with War ID.',
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(
				`${data.name} (${data.tag})`,
				`${data.badgeUrls.medium}`,
				`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`
			)
			.setDescription([
				`${data.warWins} Wins, ${data.isWarLogPublic ? `${data.warLosses!} Losses,` : ''} ${data.warWinStreak} Win Streak`
			].join('\n'));

		if (!data.isWarLogPublic) {
			embed.setDescription('War Log is Private');
			return message.util!.send({ embeds: [embed] });
		}

		const wars = await this.client.db.collection(Collections.CLAN_WARS)
			.find({
				$or: [{ 'clan.tag': data.tag }, { 'opponent.tag': data.tag }],
				warType: { $ne: WarType.CWL }, state: 'warEnded'
			})
			.sort({ preparationStartTime: -1 })
			.limit(11)
			.toArray();

		const body = await this.client.http.clanWarLog(data.tag, { limit: 10 });
		if (!body.ok) {
			return message.util!.send('**504 Request Timeout!**');
		}

		for (const item of body.items) {
			const extra = this.getWarInfo(wars, item);
			const { clan, opponent } = item;
			const time = Util.duration(Date.now() - new Date(moment(item.endTime).toDate()).getTime());
			embed.addField(
				`\u200b\n\u200e${this.result(item.result)} ${opponent.name || 'Clan War League'} ${extra ? `\u200e(#${extra.id as string})` : ''}`,
				[
					`${EMOJIS.STAR} \`\u200e${this.padStart(clan.stars)} / ${this.padEnd(opponent.stars)}\u200f\`\u200e ${EMOJIS.FIRE} ${(clan.destructionPercentage || 0).toFixed(2)}% ${opponent.name ? `/ ${(opponent.destructionPercentage || 0).toFixed(2)}%` : ''}`,
					`${EMOJIS.USERS} \`\u200e${this.padStart(item.teamSize)} / ${this.padEnd(item.teamSize)}\u200f\`\u200e ${EMOJIS.SWORD} ${clan.attacks}${extra ? ` / ${extra.attacks as string}` : ''} ${EMOJIS.CLOCK} ${time} ago`
				].join('\n')
			);
		}

		return message.util!.send({ embeds: [embed] });
	}

	private getWarInfo(wars: any[], war: any) {
		const data = wars.find(
			en => en.clan.tag === war.clan.tag &&
				en.opponent.tag === war.opponent?.tag &&
				this.compareDate(war.endTime, en.endTime)
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
		return (new Date(moment(apiDate).toDate()) >= dbDate);
	}
}
