import { MessageEmbed, CommandInteraction } from 'discord.js';
import { Command } from '../../lib';

export default class ClanSearchCommand extends Command {
	public constructor() {
		super('clan-search', {
			name: 'search',
			category: 'search',
			channel: 'guild',
			description: {
				content: 'Search in-game clans by name.'
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction, { name }: { name?: string }) {
		const data = await this.client.http.clans({ name, limit: 10 });
		if (!data.ok) {
			return interaction.editReply('Something went wrong!');
		}

		if (!data.items.length) {
			return interaction.editReply('I could not find any clans!');
		}

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `Showing Top ${data.items.length} Results` })
			.setTitle(`Searching clans with name ${name!}`)
			.setDescription(
				[
					data.items
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
