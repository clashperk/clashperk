const { Command, Flag } = require('discord-akairo');

class SetupCommand extends Command {
	constructor() {
		super('setup', {
			aliases: ['setup'],
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Setup different logs and live boards.',
					'',
					'**Available Methods**',
					'• memberlog `<clanTag> [channel/role]`',
					'• gameboard `<clanTag> [channel/color]`',
					'• clanembed `<clanTag>`',
					'• clanwarlog `<clanTag> [channel]`',
					'• donationlog `<clanTag> [channel/color]`',
					'• onlineboard `<clanTag> [channel/color]`',
					'',
					'**Required: `<>` | Optional: `[]`**',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <...args>',
				examples: [
					'memberlog #8QU8J9LP',
					'gameboard #8QU8J9LP',
					'clanembed #8QU8J9LP',
					'clanwarlog #8QU8J9LP',
					'donationlog #8QU8J9LP',
					'onlineboard #8QU8J9LP'
				]
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	*args() {
		const method = yield {
			type: [
				['donationlog', 'dl'],
				['lastonlineboard', 'onlineboard', 'ob'],
				['clangamesboard', 'cgboard', 'cg', 'gameboard'],
				['patron-clanembed', 'clanembed', 'embed', 'ce'],
				['clan-warlog', 'warlog', 'clanwarlog', 'wl'],
				['playerlog', 'clanlog', 'cl', 'pl', 'memberlog']
			],
			otherwise: message => {
				const prefix = this.handler.prefix(message);
				const embed = this.client.util.embed()
					.setColor(this.client.embed(message))
					.setAuthor('Command List', this.client.user.displayAvatarURL())
					.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);
				const commands = this.handler.categories.get('setup-hidden')
					.values();
				embed.addField('__**Setup**__', [
					Array.from(commands)
						.concat(this.handler.modules.get('clanembed'))
						.sort((a, b) => a.aliases[0].length - b.aliases[0].length)
						.map(command => `**\`${prefix}setup ${command.aliases[0]}\`**\n${command.description.content}`)
						.join('\n')
				]);

				return embed;
			}
		};

		return Flag.continue(method);
	}
}

module.exports = SetupCommand;
