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
					'Full list of CWL commands ({prefix}cwl for more info)',
					'',
					'**Available Methods**',
					'• roster `<clanTag>`',
					'• round `<clanTag>`',
					'• attacks `<clanTag>`',
					'• remaining `<clanTag>`',
					'• stats `<clanTag>`',
					'• members `<clanTag>`',
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
					'top #8QU8J9LP'
				],
				usage: '<method> <...args>'
			}
		});
	}

	*args(message) {
		const prefix = this.handler.prefix(message);
		const command = yield {
			type: [
				['cwl-attacks', 'attacks'],
				['cwl-remaining', 'remaining', 'missing'],
				['cwl-round', 'round'],
				['cwl-roster', 'roster'],
				['cwl-stats', 'stats'],
				['cwl-top', 'top', 'mvp'],
				['cwl-members', 'members', 'lineup']
			],
			otherwise: new MessageEmbed()
				.setAuthor('CWL Commands')
				.setColor(0x5970c1)
				.setDescription([
					'**Usage**',
					`\`${prefix}cwl <method> <...args>\``,
					'',
					'**Available Methods**',
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
