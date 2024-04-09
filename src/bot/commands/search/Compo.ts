import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, User, parseEmoji } from 'discord.js';
import { getClanSwitchingMenu } from '../../helper/clans.helper.js';
import { Command } from '../../lib/index.js';
import { EMOJIS, ORANGE_NUMBERS, TOWN_HALLS } from '../../util/Emojis.js';

export default class CompoCommand extends Command {
	public constructor() {
		super('compo', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;
		if (clan.members < 1) {
			return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));
		}

		const reduced = clan.memberList.reduce<{ [key: string]: number }>((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
			.sort((a, b) => b.level - a.level);
		const avg = townHalls.reduce((p, c) => p + c.total * c.level, 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

		const { id } = parseEmoji(EMOJIS.TOWN_HALL)!;
		const embed = new EmbedBuilder()
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
			.setColor(this.client.embed(interaction))
			.setThumbnail(clan.badgeUrls.small)
			.setDescription(townHalls.map((th) => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}\u200b`).join('\n'))
			.setFooter({
				text: `Avg: ${avg.toFixed(2)} [${clan.members}/50]`,
				iconURL: `https://cdn.discordapp.com/emojis/${id!}.png?v=1`
			});

		const payload = {
			cmd: this.id,
			tag: clan.tag
		};

		const customIds = {
			refresh: this.createId(payload)
		};

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setCustomId(customIds.refresh).setStyle(ButtonStyle.Secondary)
		);

		const clanRow = await getClanSwitchingMenu(interaction, this.createId({ cmd: this.id, string_key: 'tag' }), clan.tag);

		return interaction.editReply({ embeds: [embed], components: clanRow ? [row, clanRow] : [row] });
	}
}
