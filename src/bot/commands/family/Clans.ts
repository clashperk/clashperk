import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class FamilyClansCommand extends Command {
	public constructor() {
		super('family-clans', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guild.id);
		const clanList = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		if (!clans.length) return [];

		clanList.sort((a, b) => b.members - a.members);
		const nameLen = Math.max(...clanList.map((clan) => clan.name.length)) + 1;
		const tagLen = Math.max(...clanList.map((clan) => clan.tag.length)) + 1;
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
			.setDescription(
				clanList
					.map(
						(clan) =>
							`\`\u200e${clan.name.padEnd(nameLen, ' ')} ${clan.tag.padStart(tagLen, ' ')}  ${clan.members
								.toString()
								.padStart(2, ' ')}/50 \u200f\``
					)
					.join('\n')
			);

		return interaction.editReply({ embeds: [embed] });
	}
}
