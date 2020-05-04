const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');
const Resolver = require('../../struct/Resolver');
const { emoji } = require('../../util/emojis');

class CurrentWarCommand extends Command {
	constructor() {
		super('current-war', {
			aliases: ['current-war', 'war'],
			category: 'search',
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
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
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
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
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
					`${emoji.star} ${body.clan.stars} / ${body.opponent.stars}`,
					`${emoji.fire} ${body.clan.destructionPercentage}% / ${body.opponent.destructionPercentage}%`,
					`${emoji.attacksword} ${body.clan.attacks} / ${body.opponent.attacks}`
				])
				.addField('End Time', moment.duration(new Date(moment(body.endTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		} else if (body.state === 'warEnded') {
			embed.setDescription(`War ended against **${body.opponent.name} (${body.opponent.tag})**`)
				.addField('War State', 'War Ended')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('War Stats', [
					`${emoji.star} ${body.clan.stars} / ${body.opponent.stars}`,
					`${emoji.fire} ${body.clan.destructionPercentage}% / ${body.opponent.destructionPercentage}%`,
					`${emoji.attacksword} ${body.clan.attacks} / ${body.opponent.attacks}`
				])
				.addField('War Ended', moment.duration(Date.now() - new Date(moment(body.endTime).toDate()).getTime()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		}
		return message.util.send({ embed });
	}
}

module.exports = CurrentWarCommand;
