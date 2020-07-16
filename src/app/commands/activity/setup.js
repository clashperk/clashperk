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
					'• donationlog `<clanTag> [channel/color]`',
					'• onlineboard `<clanTag> [channel/color]`',
					'• cgboard `<clanTag> [channel/color]`',
					'• warlog `<clanTag> [channel]`',
					'• clanlog `<clanTag> [channel/role]`',
					'',
					'**Required: `<>` | Optional: `[]`**',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <...args>',
				examples: [
					'donationlog #8QU8J9LP',
					'onlineboard #8QU8J9L',
					'cgboard #8QU8J9L',
					'warlog #8QU8J9L',
					'clanlog #8QU8J9L'
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
				['donationlog'],
				['lastonlineboard', 'onlineboard'],
				['clangamesboard', 'cgboard'],
				['clanembed', 'cembed'],
				['clan-warlog', 'warlog', 'livewar'],
				['playerlog', 'clanlog']
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
					Array.from(commands).filter(command => !command.ownerOnly)
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
