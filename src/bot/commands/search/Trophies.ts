import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class TrophiesCommand extends Command {
	public constructor() {
		super('trophies', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'List of clan members with trophies.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		if (clan.members < 1) {
			return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));
		}

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
			.setDescription(
				[
					'```',
					`\u200e # TROPHY  ${'NAME'}`,
					clan.memberList
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
