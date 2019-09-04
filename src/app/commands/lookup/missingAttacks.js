const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const moment = require('moment');
require('moment-duration-format');
const { geterror, fetcherror } = require('../../util/constants');

class MissingAttacksCommand extends Command {
	constructor() {
		super('missing-attacks', {
			aliases: ['missing', 'missing-attacks'],
			category: 'lookup',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about missing attacks.',
				usage: '<tag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			}
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
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ↗`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setTitle(`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses,` : ''} win streak ${data.warWinStreak}`)
			.setThumbnail(data.badgeUrls.medium);

		if (data.isWarLogPublic === false) {
			embed.setDescription('War Log Is Private');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar`,
			{
				method: 'GET', headers: {
					Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}`
				}
			}).then(res => res.json());

		if (body.state === 'preparation') {
			embed.setDescription('Preparation Day');
			return message.util.send({ embed });
		}

		if (body.state === 'notInWar') {
			embed.setDescription('Not In War');
			return message.util.send({ embed });
		}

		let missing = '';
		for (const member of this.short(body.clan.members)) {
			if (member.attacks && member.attacks.length === 2) continue;
			missing += `**${member.mapPosition}.** ${member.name} ${member.tag} ~ ${member.attacks ? 2 - member.attacks.length : 2} \n`;
		}
		embed.setDescription([
			'**Missing Attacks**',
			'',
			missing
		]);
		const endTime = new Date(moment(body.endTime).toDate()).getTime();
		embed.setFooter(`Ends in ${moment.duration(endTime - Date.now()).format('D [days], H [hours] m [minutes]')}`);

		return message.util.send({ embed });
	}

	short(items) {
		return items.sort((a, b) => a.mapPosition - b.mapPosition);
	}
}

module.exports = MissingAttacksCommand;
