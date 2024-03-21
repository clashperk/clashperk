import { EmbedBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class ClanSearchCommand extends Command {
	public constructor() {
		super('clan-search', {
			aliases: ['search'],
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction, { name }: { name?: string }) {
		if (!name) {
			return interaction.editReply(this.i18n('command.search.no_results', { lng: interaction.locale }));
		}
		const { body, res } = await this.client.http.getClans({ name, limit: 10 });
		if (!(res.ok && body.items.length)) {
			return interaction.editReply(this.i18n('command.search.no_results', { lng: interaction.locale }));
		}

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setTitle(this.i18n('command.search.searching', { lng: interaction.locale, name }))
			.setDescription(
				[
					body.items
						.map((clan) => {
							const clanType = clan.type
								.replace(/inviteOnly/g, 'Invite Only')
								.replace(/closed/g, 'Closed')
								.replace(/open/g, 'Open');
							return [
								`**[${clan.name} (${clan.tag})](https://www.clashofstats.com/clans/${clan.tag.substr(1)})**`,
								`${clan.clanLevel} level, ${clan.members} member${clan.members > 1 ? 's' : ''}, ${clan.clanPoints} points`,
								`${clanType}, ${clan.requiredTrophies} required${clan.location ? `, ${clan.location.name}` : ''}`
							].join('\n');
						})
						.join('\n\n')
				].join('\n')
			);

		return interaction.editReply({ embeds: [embed] });
	}
}
