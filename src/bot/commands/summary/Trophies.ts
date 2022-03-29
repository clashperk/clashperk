import { Collections } from '../../util/Constants';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Command } from '../../lib';
import { Clan } from 'clashofclans.js';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('trophy-summary', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction) {
		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild!.id }).toArray();

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const collection: Clan[] = await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)));
		const members = collection.map((clan) => clan.memberList).flat();
		members.sort((a, b) => b.trophies - a.trophies);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild!.name} Best Trophies` })
			.setDescription(
				[
					'```',
					`\u200e # TROPHY  ${'NAME'}`,
					members
						.slice(0, 100)
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
