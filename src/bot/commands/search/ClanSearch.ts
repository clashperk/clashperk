import { MessageEmbed, Message } from 'discord.js';
import { Command, Argument } from 'discord-akairo';

export default class ClanSearchCommand extends Command {
	public constructor() {
		super('clan-search', {
			aliases: ['search', 'clan-search', 'cs'],
			category: 'search',
			description: {
				content: 'Search in-game clans by name.',
				usage: '<clanName>',
				examples: ['air hounds']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			args: [
				{
					'id': 'name',
					'match': 'content',
					'type': Argument.validate('string', (msg, name) => name.length >= 3),
					'default': ''
				}
			]
		});
	}

	public async exec(message: Message, { name }: { name: string }) {
		const data = await this.client.http.clans({ name, limit: 10 });
		if (!data.ok) {
			return message.channel.send('Something went wrong!');
		}

		if (!data.items.length) {
			return message.util!.send('I could not find any clans!');
		}

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`Showing Top ${data.items.length} Results`)
			.setTitle(`Searching clans with name ${name}`)
			.setDescription([
				data.items.map(clan => {
					const clanType = clan.type.replace(/inviteOnly/g, 'Invite Only')
						.replace(/closed/g, 'Closed')
						.replace(/open/g, 'Open');
					return [
						`**[${clan.name} (${clan.tag})](https://www.clashofstats.com/clans/${clan.tag.substr(1)})**`,
						`${clan.clanLevel} level, ${clan.members} member${clan.members > 1 ? 's' : ''}, ${clan.clanPoints} points`,
						`${clanType}, ${clan.requiredTrophies} required${clan.location ? `, ${clan.location.name}` : ''}`
					].join('\n');
				}).join('\n\n')
			].join('\n'));

		return message.util!.send({ embeds: [embed] });
	}
}
