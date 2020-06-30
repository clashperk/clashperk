const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class CWLComamnd extends Command {
	constructor() {
		super('cwl', {
			aliases: ['cwl'],
			category: 'cwl',
			cooldown: 0,
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
					'• top `<clanTag>`',
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
					'top #8QU8J9LP'
				],
				usage: '<method> <...args>'
			}
		});
	}

	*args() {
		const command = yield {
			type: [
				['cwl-attacks', 'attacks'],
				['cwl-remaining', 'remaining', 'missing'],
				['cwl-round', 'round'],
				['cwl-roster', 'roster'],
				['cwl-stats', 'stats'],
				['cwl-top', 'top', 'mvp'],
				['cwl-ranking', 'rank', 'ranks', 'ranking'],
				['cwl-members', 'members', 'lineup'],
				['cwl-stars', 'stars', 'star']
			],
			otherwise: message => {
				const prefix = this.handler.prefix(message);
				const embed = new MessageEmbed()
					.setColor(0x5970c1)
					.setAuthor('Command List', this.client.user.displayAvatarURL())
					.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);
				const commands = this.handler.categories.get('cwl-hidden')
					.values();
				embed.addField('__**CWL**__', [
					Array.from(commands)
						.map(command => `**\`${prefix}${command.id.replace(/-/g, '\u2002')}\`**\n${command.description.content}`)
						.join('\n')
				]);

				return embed;
			}
		};

		return Flag.continue(command);
	}
}

module.exports = CWLComamnd;
