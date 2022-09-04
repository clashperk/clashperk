import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('trophy-summary', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild!.id }).toArray();

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const members =
			Season.ID === season
				? (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag))))
						.filter((res) => res.ok)
						.map((clan) => clan.memberList)
						.flat()
				: (
						await this.client.db
							.collection(Collections.PLAYER_SEASONS)
							.find({ season, __clans: { $in: clans.map((clan) => clan.tag) } })
							.sort({ 'trophies.current': -1 })
							.limit(100)
							.toArray()
				  ).map((member) => ({ name: member.name, trophies: member.trophies.current }));
		members.sort((a, b) => b.trophies - a.trophies);
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild!.name} Best Trophies` })
			.setDescription(
				[
					'```',
					`\u200e # TROPHY  ${'NAME'}`,
					members
						.slice(0, 100)
						.map((member, index) => {
							const trophies = `${member.trophies.toString().padStart(5, ' ') as string}`;
							return `${(index + 1).toString().padStart(2, ' ')}  ${trophies}  \u200e${member.name as string}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			)
			.setFooter({ text: `Season ${season}` });

		return interaction.editReply({ embeds: [embed] });
	}
}
