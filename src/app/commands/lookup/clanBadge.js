const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');

class ClanBadgeCommand extends Command {
	constructor() {
		super('clan-badge', {
			aliases: ['clan-badge', 'badge'],
			category: 'lookup',
			description: {
				content: 'Clash of Clans clan badge lookup command.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS']
		});
	}

	*args() {
		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return Fetch.clan(str).then(data => {
						if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_clans')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				if (!data[msg.guild.id]) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return Fetch.clan(data[msg.guild.id].tag).then(data => {
					if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
					return data;
				});
			},
			prompt: {
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};
		return { data };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setColor(0x5970c1)
			.setImage(data.badgeUrls.large);

		return message.util.send({ embed });
	}
}

module.exports = ClanBadgeCommand;
