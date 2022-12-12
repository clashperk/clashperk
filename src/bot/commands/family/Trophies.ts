import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';

export default class FamilyTrophiesCommand extends Command {
	public constructor() {
		super('family-trophies', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction) {
		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild!.id }).toArray();

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const allClans = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		const members = allClans.map((clan) => clan.memberList).flat();
		allClans.reduce<Record<string, { clanPoints: number; totalTrophies: number; legends: number }>>((acc, clan) => {
			acc[clan.tag] = {
				clanPoints: clan.clanPoints,
				totalTrophies: clan.memberList.reduce((prev, mem) => prev + mem.trophies, 0),
				legends: clan.memberList.filter((mem) => mem.trophies >= 5000).length
			};
			return acc;
		}, {});
		members.sort((a, b) => b.trophies - a.trophies);
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild!.name} Best Trophies` })
			.setDescription(
				[
					'```',
					`\u200e # TROPHY  ${'NAME'}`,
					members
						.slice(0, 99)
						.map((member, index) => {
							const trophies = `${member.trophies.toString().padStart(5, ' ')}`;
							return `${(index + 1).toString().padStart(2, ' ')}  ${trophies}  \u200e${member.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);

		return interaction.editReply({ embeds: [embed] });
	}
}
