const { Command, Flag } = require('discord-akairo');
const { stripIndents, stripIndent } = require('common-tags');
const heroes = [
	'<:barbarianking:524939911581663242>',
	'<:archerqueen:524939902408720394>',
	'<:grandwarden:524939931303411722>'
];

class _PingCommand extends Command {
	constructor() {
		super('_ping', {
			aliases: ['_ping', 'test'],
			category: 'owner',
			cooldown: 1000,
			description: {
				content: 'Pings me!'
			}
		});
	}

	async exec(message) {
		const embed = this.client.util.embed()
			// .setTitle(stripIndent`#        #        #        #`);
			.setTitle(stripIndent`#        ${heroes[0]}        ${heroes[1]}        ${heroes[2]}`);
		return message.util.send({ embed });
	}
}

module.exports = _PingCommand;
