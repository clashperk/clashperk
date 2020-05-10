const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class CWLComamnd extends Command {
	constructor() {
		super('cwl', {
			aliases: ['cwl'],
			category: 'cwl',
			cooldown: 0,
			description: {
				content: '',
				examples: [''],
				usage: '<method> <...args>'
			}
		});
	}

	*args(message) {
		const prefix = this.handler.prefix(message);
		const command = yield {
			type: [
				['cwl-attacks', 'attacks'],
				['cwl-remaining', 'remaining'],
				['cwl-round', 'round'],
				['cwl-roster', 'roster'],
				['cwl-stats', 'stats'],
				['cwl-top', 'top'],
				['cwl-members', 'members']
			],
			otherwise: new MessageEmbed()
				.setAuthor('CWL Commands')
				.setDescription([
					'**Usage**',
					`\`${prefix}cwl <method> <...args>\``,
					'',
					'**Available Methods**',
					'',
					'• roster `<clanTag>`',
					'• round `<clanTag>`',
					'• attacks `<clanTag>`',
					'• remaining `<clanTag>`',
					'• stats `<clanTag>`',
					'• members `<clanTag>`',
					'• top `<clanTag>`',
					'',
					'For additional `<...args>` usage refer to the examples below.',
					'',
					'**Examples**',
					`\`${prefix}cwl roster #8QU8J9LP\``,
					`\`${prefix}cwl round #8QU8J9LP\``,
					`\`${prefix}cwl attacks #8QU8J9LP\``,
					`\`${prefix}cwl remaining #8QU8J9LP\``,
					`\`${prefix}cwl stats #8QU8J9LP\``,
					`\`${prefix}cwl members #8QU8J9LP\``,
					`\`${prefix}cwl top #8QU8J9LP\``
				])
		};

		return Flag.continue(command);
	}
}

module.exports = CWLComamnd;
