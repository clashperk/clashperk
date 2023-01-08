import { CommandInteraction, EmbedBuilder, escapeMarkdown, User } from 'discord.js';
import moment from 'moment';
import { Args, Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';

// ¹²³⁴⁵⁶⁷⁸
const attackCounts: Record<string, string> = {
	0: '⁰',
	1: '¹',
	2: '²',
	3: '³',
	4: '⁴',
	5: '⁵',
	6: '⁶',
	7: '⁷',
	8: '⁸'
};

export default class LegendAttacksCommand extends Command {
	public constructor() {
		super('legend-attacks', {
			category: 'legend',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public args(): Args {
		return {
			clan_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	private getDates() {
		const start =
			moment().hour() >= 5 ? moment().startOf('day').add(5, 'hours') : moment().startOf('day').subtract(1, 'day').add(5, 'hours');

		return { startTime: start.toDate().getTime(), endTime: start.clone().add(1, 'day').subtract(1, 'second').toDate().getTime() };
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		const multi = this.client.redis.multi();
		clan.memberList.map((mem) => multi.json.get(`LP${mem.tag}`));
		const raw = (await multi.exec()) as unknown as ({
			name: string;
			tag: string;
			logs: { start: number; end: number; timestamp: number; inc: number; type?: string }[];
		} | null)[];

		const members = [];
		for (const legend of raw) {
			if (!legend) continue;
			const { startTime, endTime } = this.getDates();

			const logs = legend.logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
			if (logs.length === 0) continue;

			const attacks = logs.filter((en) => en.inc > 0 || en.type === 'attack');
			const defenses = logs.filter((en) => en.inc < 0 || en.type === 'defense');

			const [initial] = logs;
			const [current] = logs.slice(-1);

			const attackCount = attacks.length;
			const defenseCount = defenses.length;

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

		const embed = new EmbedBuilder()
			.setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
			.setColor(this.client.embed(interaction));

		embed.setDescription(
			[
				'**Legend League Attacks**',
				'```',
				'INIT GAIN LOSS FINL NAME',
				...members.map(
					(mem) =>
						`${this.pad(mem.initial.start)} ${this.pad(mem.trophiesFromAttacks, 3)}${attackCounts[mem.attackCount]} ${this.pad(
							Math.abs(mem.trophiesFromDefenses),
							3
						)}${attackCounts[mem.defenseCount]} ${this.pad(mem.current.end)} ${escapeMarkdown(mem.name)}`
				),
				'```'
			].join('\n')
		);

		embed.setFooter({ text: `Day ${moment().diff(Season.startTimestamp, 'days')} (${Season.ID})` });

		return interaction.editReply({ embeds: [embed] });
	}

	private pad(num: number | string, padding = 4) {
		return num.toString().padStart(padding, ' ');
	}
}
