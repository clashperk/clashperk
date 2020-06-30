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
					'Setup logs and live boards.',
					'',
					'**Available Methods**',
					'• donationlog `<clanTag> [channel/color]`',
					'• onlineboard `<clanTag> [channel/color]`',
					'• cgboard `<clanTag> [channel/color]`',
					'• warfeed `<clanTag> [channel/color]`',
					'• playerlog `<clanTag> [channel/color]`',
					'',
					'**Required: `<>` | Optional: `[]`**',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <...args>',
				examples: [
					'donationlog #8QU8J9LP',
					'onlineboard #8QU8J9L',
					'cgboard #8QU8J9L',
					'warfeed #8QU8J9L',
					'playerlog #8QU8J9L'
				]
			}
		});
	}

	*args() {
		const method = yield {
			type: [
				['donationlog'],
				['lastonlineboard'],
				['clangamesboard'],
				['clanembed'],
				['warfeed']
			],
			otherwise: message => {
				const prefix = this.handler.prefix(message);
				const embed = this.client.util.embed()
					.setColor(0x5970c1)
					.setFooter('Page 1/1', this.client.user.displayAvatarURL())
					.setAuthor('Setup Command List')
					.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);
				const commands = this.handler.categories.get('setup-hidden')
					.values();
				embed.addField('__**Setup**__', [
					Array.from(commands)
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
