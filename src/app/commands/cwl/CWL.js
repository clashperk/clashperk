const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class CWLComamnd extends Command {
	constructor() {
		super('cwl', {
			aliases: ['cwl'],
			category: 'cwl',
			description: {
				content: [
					'Full list of CWL commands',
					'',
					'**Available Methods**',
					'• roster `<clanTag>`',
					'• round `<clanTag>`',
					'• attacks `<clanTag>`',
					'• remaining `<clanTag>`',
					'• stats `<clanTag>`',
					'• members `<clanTag>`',
					'• stars `<clanTag>`',
					'• ranks `<clanTag>`',
					'• legends `<clanTag>`',
					'',
					'For additional `<...args>` usage refer to the examples below.'
				],
				examples: [
					'',
					'roster #8QU8J9LP',
					'round #8QU8J9LP',
					'attacks #8QU8J9LP',
					'remaining #8QU8J9LP',
					'stats #8QU8J9LP',
					'members #8QU8J9LP',
					'stars #8QU8J9LP',
					'ranks #8QU8J9LP',
					'legends #8QU8J9LP'
				],
				usage: '<method> <...args>'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	*args() {
		const command = yield {
			type: [
				['cwl-attacks', 'attacks'],
				['cwl-remaining', 'remaining', 'missing', 'rem'],
				['cwl-round', 'round'],
				['cwl-roster', 'roster'],
				['cwl-stats', 'stats'],
				['cwl-legends', 'top', 'mvp', 'legends'],
				['cwl-ranking', 'rank', 'ranks', 'ranking'],
				['cwl-members', 'members', 'lineup', 'mem'],
				['cwl-stars', 'stars', 'star']
			],
			otherwise: message => {
				const prefix = this.handler.prefix(message);
				const embed = new MessageEmbed()
					.setColor(this.client.embed(message))
					.setAuthor('Command List', this.client.user.displayAvatarURL())
					.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);
				const commands = this.handler.categories.get('cwl-hidden')
					.values();
				embed.addField('__**CWL**__', [
					Array.from(commands)
						.map(command => {
							const description = Array.isArray(command.description.content)
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

module.exports = CWLComamnd;
