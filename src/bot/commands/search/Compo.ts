import { EmbedBuilder, CommandInteraction, parseEmoji, User } from 'discord.js';
import { TOWN_HALLS, EMOJIS, ORANGE_NUMBERS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';

export default class CompoCommand extends Command {
	public constructor() {
		super('compo', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Calculates TH compositions of a clan.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;
		if (clan.members < 1) {
			return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));
		}

		const hrStart = process.hrtime();
		const fetched = await this.client.http.detailedClanMembers(clan.memberList);
		const reduced = fetched
			.filter((res) => res.ok)
			.reduce<{ [key: string]: number }>((count, member) => {
				const townHall = member.townHallLevel;
				count[townHall] = (count[townHall] || 0) + 1;
				return count;
			}, {});

		const townHalls = Object.entries(reduced)
			.map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
			.sort((a, b) => b.level - a.level);
		const avg = townHalls.reduce((p, c) => p + c.total * c.level, 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

		const { id } = parseEmoji(EMOJIS.TOWNHALL)!;
		const embed = new EmbedBuilder()
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
			.setColor(this.client.embed(interaction))
			.setThumbnail(clan.badgeUrls.small)
			.setDescription(townHalls.map((th) => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}\u200b`).join('\n'))
			.setFooter({
				text: `Avg: ${avg.toFixed(2)} [${clan.members}/50]`,
				iconURL: `https://cdn.discordapp.com/emojis/${id!}.png?v=1`
			});

		const diff = process.hrtime(hrStart);
		this.client.logger.debug(`Executed in ${(diff[0] * 1000 + diff[1] / 1000000).toFixed(2)}ms`, { label: 'COMPO' });
		return interaction.editReply({ embeds: [embed] });
	}
}
