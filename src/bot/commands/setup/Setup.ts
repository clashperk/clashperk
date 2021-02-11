import { Command, Flag } from 'discord-akairo';
import { Message, TextChannel } from 'discord.js';

export default class SetupCommand extends Command {
	public constructor() {
		super('setup', {
			aliases: ['setup'],
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Enable features and assign clans to channels.',
					'',
					'• **[Commands Only](https://clashperk.com)**',
					'• `#CLAN_TAG #CHANNEL`',
					'',
					'• **[Clan Feed](https://clashperk.com)**',
					'• `FEED #CLAN_TAG`',
					'• `FEED #CLAN_TAG @ROLE`',
					'',
					'• **[War Feed](https://clashperk.com)**',
					'• `WAR #CLAN_TAG`',
					'',
					'• **[Last Seen](https://clashperk.com)**',
					'• `LASTSEEN #CLAN_TAG`',
					'• `LASTSEEN #CLAN_TAG #HEX_COLOR`',
					'',
					'• **[Clan Games](https://clashperk.com)**',
					'• `GAMES #CLAN_TAG`',
					'• `GAMES #CLAN_TAG #HEX_COLOR`',
					'',
					'• **[Clan Embed](https://clashperk.com)**',
					'• `EMBED #CLAN_TAG`',
					'',
					'• **[Donation Log](https://clashperk.com)**',
					'• `DONATION #CLAN_TAG`',
					'• `DONATION #CLAN_TAG #HEX_COLOR`'
				],
				usage: '[#clanTag] [#channel] [...args]',
				examples: [
					'#8QU8J9LP #clashperk',
					'FEED #8QU8J9LP @ROLE',
					'LASTSEEN #8QU8J9LP #ff0'
				]
			},
			optionFlags: ['--option', '--tag', '--channel']
		});
	}

	public *args(msg: Message) {
		const method = yield {
			type: [
				['setup-clan-embed', 'embed', 'clanembed'],
				['setup-last-seen', 'lastseen', 'lastonline'],
				['setup-clan-feed', 'feed', 'memberlog', 'clan-feed'],
				['setup-donations', 'donation', 'donations', 'donation-log'],
				['setup-clan-games', 'game', 'games', 'clangames', 'cgboard'],
				['setup-clan-wars', 'war', 'wars', 'clanwarlog', 'clan-wars', 'war-feed']
			],
			flag: '--option',
			unordered: msg.hasOwnProperty('token') ? false : [0, 1],
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		if (method && (method as string).includes('setup')) return Flag.continue(method);

		const tag = yield {
			flag: '--tag',
			unordered: msg.hasOwnProperty('token') ? false : [0, 1],
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null
		};

		const channel = yield {
			flag: '--channel',
			type: 'textChannel',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { channel, tag };
	}

	public exec(message: Message, { channel, tag }: { channel?: TextChannel; tag?: string }) {
		console.log(channel?.id, tag);
	}
}
