import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('attack-summary', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild!.id }).toArray();

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const members = await this.client.db
			.collection(Collections.CLAN_MEMBERS)
			.find({ season, clanTag: { $in: clans.map((clan) => clan.tag) } }, { projection: { attackWins: 1, name: 1 } })
			.sort({ attackWins: -1 })
			.limit(100)
			.toArray();
		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild!.name} Attack Wins` })
			.setDescription(
				[
					'```',
					members
						.slice(0, 100)
						.map((member, index) => {
							const attackWins = `${member.attackWins.toString().padStart(5, ' ') as string}`;
							return `${(index + 1).toString().padStart(2, ' ')}  ${attackWins}  \u200e${member.name as string}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			)
			.setFooter({ text: `Season ${season}` });

		return interaction.editReply({ embeds: [embed] });
	}
}
