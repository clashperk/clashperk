import { Command, Flag, PrefixSupplier } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';

export default class CWLCommand extends Command {
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
					'• stars `<clanTag>`',
					'• attacks `<clanTag>`',
					'• stats `<clanTag>`',
					'• members `<clanTag>`',
					'• lineup `<clanTag>`',
					'• ranks `<clanTag>`',
					'• export `<method>`',
					'',
					'For additional `<...args>` usage refer to the examples below.'
				],
				examples: [
					'roster #8QU8J9LP',
					'round #8QU8J9LP',
					'attacks #8QU8J9LP',
					'stats #8QU8J9LP',
					'members #8QU8J9LP',
					'lineup #8QU8J9LP',
					'stars #8QU8J9LP',
					'ranks #8QU8J9LP',
					'export clans/all'
				],
				usage: '<method> <...args>'
			},
			optionFlags: ['--option']
		});
	}

	public *args(msg: Message): unknown {
		const command = yield {
			flag: '--option',
			match: msg.interaction ? 'option' : 'phrase',
			type: [
				['cwl-round', 'round'],
				['cwl-stats', 'stats'],
				['cwl-lineup', 'lineup'],
				['cwl-export', 'export'],
				['cwl-roster', 'roster'],
				['cwl-attacks', 'attacks'],
				['cwl-stars', 'stars', 'star'],
				['cwl-members', 'members', 'mem'],
				/**
				 * @deprecated
				 */
				['cwl-legends', 'top', 'mvp', 'legends'],
				['cwl-ranking', 'ranking', 'ranks', 'rank'],
				['cwl-missed', 'missing', 'rem', 'remaining', 'missed']
			],
			otherwise: (message: Message) => {
				const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
				const embed = new MessageEmbed()
					.setColor(this.client.embed(message))
					.setAuthor('Command List', this.client.user!.displayAvatarURL())
					.setDescription(`To view more details for a command, do \`${prefix}help <command>\``);
				const commands = this.handler.categories.get('cwl')!.values();
				embed.addField('__**CWL**__', [
					Array.from(commands)
						.concat(this.getCommand('cwl-round'))
						.concat(this.getCommand('cwl-roster'))
						.map(command => {
							const description: string = Array.isArray(command.description.content)
								? command.description.content[0]
								: command.description.content;
							return `**\`${prefix}${command.id.replace(/-/g, '\u2002')}\`**\n${description}`;
						})
						.join('\n')
				].join('\n'));

				return { embeds: [embed] };
			}
		};

		return Flag.continue(command);
	}

	private getCommand(id: string) {
		return this.handler.modules.get(id)!;
	}
}
