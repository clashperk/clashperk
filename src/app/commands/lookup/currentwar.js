const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Fetch = require('../../struct/Fetch');
const fetch = require('node-fetch');
const { firestore } = require('../../struct/Database');
const moment = require('moment');
require('moment-duration-format');
const { geterror, fetcherror } = require('../../util/constants');

class CurrentWarCommand extends Command {
	constructor() {
		super('current-war', {
			aliases: ['current-war', 'war'],
			category: 'lookup',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about currentwar.',
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
				const data = await firestore.collection('linked_accounts')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				if (!data.clan) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return Fetch.clan(data.clan).then(data => {
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
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setThumbnail(data.badgeUrls.medium);

		if (data.isWarLogPublic === false) {
			embed.setDescription('War log is Private');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		}).then(res => res.json());

		if (body.state === 'notInWar') {
			embed.setDescription('Not In War');
		} else if (body.state === 'preparation') {
			embed.setDescription(`Preparation day against **${body.opponent.name} (${body.opponent.tag})**`)
				.addField('War State', 'Preparation Day')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('Start Time', moment.duration(new Date(moment(body.startTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		} else if (body.state === 'inWar') {
			embed.setDescription(`Battle day against **${body.opponent.name} (${body.opponent.tag})**`)
				.addField('War State', 'Battle Day')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('War Stats', [
					`<:cp_star:696274427972681768> ${body.clan.stars} / ${body.opponent.stars}`,
					`<:cp_fire:696276054058467328> ${body.clan.destructionPercentage}% / ${body.opponent.destructionPercentage}%`,
					`<:attacks:534757491775504425> ${body.clan.attacks} / ${body.opponent.attacks}`
				])
				.addField('End Time', moment.duration(new Date(moment(body.endTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		} else if (body.state === 'warEnded') {
			embed.setDescription(`War ended against **${body.opponent.name} (${body.opponent.tag})**`)
				.addField('War State', 'War Ended')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('War Stats', [
					`<:cp_star:696274427972681768> ${body.clan.stars} / ${body.opponent.stars}`,
					`<:cp_fire:696276054058467328> ${body.clan.destructionPercentage}% / ${body.opponent.destructionPercentage}%`,
					`<:attacks:534757491775504425> ${body.clan.attacks} / ${body.opponent.attacks}`
				])
				.addField('War Ended', moment.duration(Date.now() - new Date(moment(body.endTime).toDate()).getTime()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		}
		return message.util.send({ embed });
	}
}

module.exports = CurrentWarCommand;
