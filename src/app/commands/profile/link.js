const { Command } = require('discord-akairo');
const { yellow } = require('chalk');

class LinkCommand extends Command {
	constructor() {
		super('link', {
			aliases: ['link'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: [
					'Links a clan or player to your account.',
					'',
					'**Available Methods**',
					'• clan `<clanTag>`',
					'• player `<playerTag>`',
					'',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <...args>',
				examples: ['clan #8QU8J9LP', 'player #9Q92C8R20']
			},
			flags: ['clan', 'player']
		});
	}

	*args() {
		const flag1 = yield {
			match: 'flag',
			flag: 'clan'
		};

		const flag2 = yield {
			match: 'flag',
			flag: 'player'
		};

		const tag = yield {
			match: 'phrase',
			type: 'string'
		};

		const rest = yield {
			match: 'rest',
			type: 'string',
			default: ''
		};

		return { flag1, flag2, rest, tag };
	}

	async exec(message, { flag1, flag2, rest, tag }) {
		if (flag1) {
			const command = this.handler.modules.get('link-clan');
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command, true);
		} else if (flag2) {
			const command = this.handler.modules.get('link-player');
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command, true);
		}

		const tags = await Promise.all([
			this.client.coc.clan(tag).catch(() => ({ ok: false })),
			this.client.coc.player(tag).catch(() => ({ ok: false }))
		]);

		if (tags.every(a => a.ok)) {
			const embed = this.client.util.embed()
				.setAuthor('..')
				.setDescription([
					...tags.map((a, i) => `**${++i}** ${a.name} ${a.tag}`)
				]);
			return message.channel.send({ embed });
		}
	}
}

module.exports = LinkCommand;
