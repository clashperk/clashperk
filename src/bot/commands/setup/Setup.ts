import { Command, Flag, PrefixSupplier } from 'discord-akairo';
import { Message } from 'discord.js';

export default class SetupCommand extends Command {
	public constructor() {
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
					'• `clangames <clanTag> [channel/color]`',
					'• `clan-wars <clanTag> [channel]`',
					'• `donations <clanTag> [channel/color]`',
					'• `clan-feed <clanTag> [channel/role]`',
					'• `clanembed <clanTag> [...args]`',
					'• `lastonline <clanTag> [channel/color]`',
					'',
					'**Required: `<>` | Optional: `[]`**',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <...args>',
				examples: [
					'clangames #8QU8J9LP',
					'clan-wars #8QU8J9LP',
					'donations #8QU8J9LP',
					'clan-feed #8QU8J9LP',
					'clanembed #8QU8J9LP',
					'lastonline #8QU8J9LP'
				]
			}
		});
	}

	public *args() {
		const method = yield {
			type: [
				['setup-donations', 'donations', 'donation-log'],
				['setup-lastonline', 'lastonline', 'onlineboard'],
				['setup-clangames', 'clangames', 'cgboard'],
				['setup-patron-clanembed', 'clanembed'],
				['setup-clan-wars', 'clanwarlog', 'clan-wars', 'war-feed'],
				['setup-clan-feed', 'memberlog', 'clan-feed']
			],
			otherwise: (message: Message) => {
				const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
				const embed = this.client.util.embed()
					.setColor(this.client.embed(message))
					.setAuthor('Command List', this.client.user!.displayAvatarURL())
					.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);
				const commands = this.handler.categories.get('setup-hidden')!
					.values();
				embed.addField('__**Setup Commands**__', [
					Array.from(commands)
						.concat(this.handler.modules.get('setup-clanembed')!)
						.sort((a, b) => a.id.length - b.id.length)
						.map(command => `**\`${prefix}setup ${command.id.replace(/setup-/g, '')}\`**\n${command.description.content as string}`)
						.join('\n')
				]);
				return embed;
			}
		};

		return Flag.continue(method);
	}
}
