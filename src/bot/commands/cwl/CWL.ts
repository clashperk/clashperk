import { Command, Flag, PrefixSupplier } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';

export default class CWLComamnd extends Command {
	public constructor() {
		super('cwl', {
			aliases: ['cwl'],
			category: 'war',
			description: {
				content: [
					'CWL season overview and summary.',
					'',
					'**Available Methods**',
					'• roster `<clanTag>`',
					'• round `<clanTag>`',
					'• attacks `<clanTag>`',
					'• remaining `<clanTag>`',
					'• missed `<clanTag>`',
					'• stats `<clanTag>`',
					'• members `<clanTag>`',
					'• lineup `<clanTag>`',
					'• stars `<clanTag>`',
					'• gained `<clanTag>`',
					'• ranks `<clanTag>`',
					'• legends `<clanTag>`',
					'• export `<method>`',
					'',
					'For additional `<...args>` usage refer to the examples below.'
				],
				examples: [
					'',
					'roster #8QU8J9LP',
					'round #8QU8J9LP',
					'attacks #8QU8J9LP',
					'remaining #8QU8J9LP',
					'missed #8QU8J9LP',
					'stats #8QU8J9LP',
					'members #8QU8J9LP',
					'lineup #8QU8J9LP',
					'stars #8QU8J9LP',
					'gained #8QU8J9LP',
					'ranks #8QU8J9LP',
					'legends #8QU8J9LP',
					'export clans/all'
				],
				usage: '<method> <...args>'
			},
			optionFlags: ['--option']
		});
	}

	public *args(msg: Message) {
		const command = yield {
			flag: '--option',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: [
				['cwl-attacks', 'attacks'],
				['cwl-remaining', 'remaining', 'missing', 'rem'],
				['cwl-missed', 'missed'],
				['cwl-round', 'round'],
				['cwl-roster', 'roster'],
				['cwl-stats', 'stats'],
				['cwl-legends', 'top', 'mvp', 'legends'],
				['cwl-ranking', 'rank', 'ranks', 'ranking'],
				['cwl-members', 'members', 'mem'],
				['cwl-lineup', 'lineup'],
				['cwl-export', 'export'],
				['cwl-stars', 'stars', 'star'],
				['cwl-gained', 'gained', 'gain', 'lost']
			],
			otherwise: (message: Message) => {
				const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
				const embed = new MessageEmbed()
					.setColor(this.client.embed(message))
					.setAuthor('Command List', this.client.user!.displayAvatarURL())
					.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);
				const commands = this.handler.categories.get('cwl')!
					.values();
				embed.addField('__**CWL**__', [
					Array.from(commands)
						.map(command => {
							const description: string = Array.isArray(command.description.content)
								? command.description.content[0]
								: command.description.content;
							return `**\`${prefix}${command.id.replace(/-/g, '\u2002')}\`**\n${description}`;
						})
						.join('\n')
				]);

				return embed;
			}
		};

		return Flag.continue(command);
	}
}
