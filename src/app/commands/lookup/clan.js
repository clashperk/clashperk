const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');

class ClanCommand extends Command {
	constructor() {
		super('clan', {
			aliases: ['clan'],
			category: 'lookup',
			description: {
				content: 'Clash of Clans clan lookup command.',
				usage: '<tag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
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
					return fetch.clan(str).then(data => {
						if (data.status !== 200) return msg.util.reply(`${data.error}`) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_clans')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.reply(`could not find any player linked to **${resolver.user.tag}!**`) && Flag.cancel();
				if (!data[msg.guild.id]) return msg.util.reply(`could not find any player linked to **${resolver.user.tag}!**`) && Flag.cancel();
				return fetch.clan(data[msg.guild.id].tag).then(data => {
					if (data.status !== 200) return msg.util.reply(`${data.error}`) && Flag.cancel();
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
		let clan_type = '';
		if (data.type === 'inviteOnly') {
			clan_type = 'Invite Only';
		} else if (data.type === 'closed') {
			clan_type = 'Closed';
		} else if (data.type === 'open') {
			clan_type = 'Anybody Can Join';
		}

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setColor(0x5970c1)
			.setThumbnail(data.badgeUrls.medium)
			.addField('Level', data.clanLevel, true)
			.addField('Members', data.members, true)
			.addField('Required Trophies', `<:trophyc:534753357399588874> ${data.requiredTrophies}`, true)
			.addField('Clan Type', clan_type, true)
			.addField('Clan Points', `<:trophyc:534753357399588874> ${data.clanPoints} <:versustrophies:549844310858661888> ${data.clanVersusPoints}`, true)
			.addField('War Log', data.isWarLogPublic ? 'Public' : 'Private', true)
			.addField('War Wins', data.warWins, true)
			.addField('Win Streak', data.warWinStreak, true)
			.addField('War Frequency', data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase()), true)
			.addField('Location', data.location ? data.location.name : 'None', true)
			.addField('Description', data.description ? data.description : '\u200b');

		return message.util.send({ embed });
	}
}

module.exports = ClanCommand;
