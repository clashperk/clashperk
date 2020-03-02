const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const moment = require('moment');
require('moment-duration-format');
const { geterror, fetcherror } = require('../../util/constants');

class WarlogCommand extends Command {
	constructor() {
		super('warlog', {
			aliases: ['warlog'],
			category: 'lookup',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Clash of Clans war log lookup command.',
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

		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}`;
		const body = await fetch(`${uri}/warlog?limit=10`, {
			method: 'GET', headers: {
				Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}`
			}
		}).then(res => res.json());

		const results = body.items.map(r => r.result);
		const oppnames = body.items.map(r => r.opponent.name);
		const opptags = body.items.map(r => r.opponent.tag);
		const endTimes = body.items.map(r => r.endTime);
		const warSizes = body.items.map(r => r.teamSize);
		const ourattacks = body.items.map(r => r.clan.attacks);
		const ourstars = body.items.map(r => r.clan.stars);
		const ourdes = body.items.map(r => r.clan.destructionPercentage);
		const oppstars = body.items.map(r => r.opponent.stars);
		const oppdes = body.items.map(r => r.opponent.destructionPercentage);

		let index = 0;
		for (const opp of oppnames) {
			if (!opp) {
				const size = warSizes[oppnames.indexOf(opp)];
				const our_attacks = ourattacks[oppnames.indexOf(opp)];
				const our_stars = ourstars[oppnames.indexOf(opp)];
				const our_destruct = ourdes[oppnames.indexOf(opp)];
				const EndTime = new Date(moment(endTimes[oppnames.indexOf(opp)]).toDate()).getTime();
				const time = moment.duration(Date.now() - EndTime).format('D [days], H [hours]');
				const opp_stars = oppstars[oppnames.indexOf(opp)];
				embed.addField(`**${++index}.** \\🌀 Clan War League`, [
					`\\⭐ ${our_stars} / ${opp_stars} \\🔥 ${our_destruct.toFixed(2)}% <:cp_sword:631128558206713856> ${our_attacks} `,
					`\\🆚 ${size} vs ${size} \\⏲ ${time} ago`
				]);
			} else {
				const opp_name = opp;
				const result = results[oppnames.indexOf(opp)].replace(/lose/g, 'Lose war').replace(/win/g, 'Win war');
				const opp_tag = opptags[oppnames.indexOf(opp)];
				const size = warSizes[oppnames.indexOf(opp)];
				const our_attacks = ourattacks[oppnames.indexOf(opp)];
				const our_stars = ourstars[oppnames.indexOf(opp)];
				const our_destruct = ourdes[oppnames.indexOf(opp)];
				const EndTime = new Date(moment(endTimes[oppnames.indexOf(opp)]).toDate()).getTime();
				const time = moment.duration(Date.now() - EndTime).format('D [days], H [hours]');
				const opp_stars = oppstars[oppnames.indexOf(opp)];
				const opp_destruct = oppdes[oppnames.indexOf(opp)];
				embed.addField(`**${++index}.** ${result === 'Win war' ? '<:tick_:545874377523068930>' : '\\❌'} ${result} against **${opp_name} (${opp_tag})**`, [
					`\\⭐ ${our_stars} / ${opp_stars} \\🔥 ${our_destruct}% / ${opp_destruct}% <:cp_sword:631128558206713856> ${our_attacks} `,
					`\\🆚 ${size} vs ${size} \\⏲ ${time} ago`
				]);
			}
		}

		return message.util.send({ embed });
	}
}

module.exports = WarlogCommand;
