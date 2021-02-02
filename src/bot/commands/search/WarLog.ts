import { MessageEmbed, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import 'moment-duration-format';
import moment from 'moment';

export default class WarlogCommand extends Command {
	public constructor() {
		super('warlog', {
			aliases: ['warlog', 'wl'],
			category: 'cwl',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows your clan war log.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				}
			]
		});
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${data.tag}`)
			.setDescription([
				'\u200e',
				`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses!} losses,` : ''} win streak ${data.warWinStreak}`
					.padEnd(50, '\u200b \u2002'),
				'\u200f',
				'\u200e',
				'\u200b'
			].join(' '));

		if (!data.isWarLogPublic) {
			embed.setDescription('War Log is Private');
			return message.util!.send({ embed });
		}

		const body = await this.client.http.clanWarLog(data.tag, { limit: 10 });

		for (const item of body.items) {
			const { clan, opponent } = item;
			const time = this.format(Date.now() - new Date(moment(item.endTime).toDate()).getTime());
			embed.addField(`\u200e**${this.result(item.result)} ${opponent.name as string || 'Clan War League'}**`, [
				`${EMOJIS.STAR} \`\u200e${this.padStart(clan.stars)} / ${this.padEnd(opponent.stars)}\u200f\`\u200e ${EMOJIS.FIRE} ${clan.destructionPercentage.toFixed(2) as number}% ${opponent.name ? `/ ${opponent.destructionPercentage.toFixed(2) as number}` : ''}`,
				`${EMOJIS.USERS} \`\u200e${this.padStart(item.teamSize)} / ${this.padEnd(item.teamSize)}\u200f\`\u200e ${EMOJIS.CLOCK} ${time} ago ${EMOJIS.ATTACK_SWORD} ${clan.attacks as number}`
			]);
		}

		return message.util!.send({ embed });
	}

	private result(result: string) {
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

	private format(time: number) {
		if (time > 864e5) {
			return moment.duration(time).format('d[d] H[h]', { trim: 'both mid' });
		} else if (time > 36e5) {
			return moment.duration(time).format('H[h] m[m]', { trim: 'both mid' });
		}
		return moment.duration(time).format('m[m] s[s]', { trim: 'both mid' });
	}
}
