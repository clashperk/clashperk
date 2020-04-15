const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const moment = require('moment');
require('moment-duration-format');
const { geterror, fetcherror } = require('../../util/constants');
const { emoji } = require('../../util/emojis');

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
			.setDescription(`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses,` : ''} win streak ${data.warWinStreak}`);

		if (data.isWarLogPublic === false) {
			embed.setDescription('War Log is Private');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/warlog?limit=10`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
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
				embed.addField(`**${(++index).toString().padStart(2, '0')} ${emoji.cwl} Clan War League**`, [
					`\u200e\u2002 \u2002${emoji.star_small} ${this.padStart(our_stars)} / ${this.padEnd(opp_stars)} ${emoji.fire_small} ${our_destruct.toFixed(2)}% ${emoji.attacksword} ${our_attacks} `,
					`\u2002 \u2002${emoji.users_small} ${this.padStart(size)} / ${this.padEnd(size)} ${emoji.clock_small} ${time} ago`
				]);
			} else {
				const opp_name = opp;
				const result = results[oppnames.indexOf(opp)].replace(/lose/g, 'Lost').replace(/win/g, 'Won').replace(/tie/g, 'Tied');
				const opp_tag = opptags[oppnames.indexOf(opp)];
				const size = warSizes[oppnames.indexOf(opp)];
				const our_attacks = ourattacks[oppnames.indexOf(opp)];
				const our_stars = ourstars[oppnames.indexOf(opp)];
				const our_destruct = ourdes[oppnames.indexOf(opp)];
				const EndTime = new Date(moment(endTimes[oppnames.indexOf(opp)]).toDate()).getTime();
				const time = moment.duration(Date.now() - EndTime).format('D [days], H [hours]');
				const opp_stars = oppstars[oppnames.indexOf(opp)];
				const opp_destruct = oppdes[oppnames.indexOf(opp)];
				embed.addField(`**${(++index).toString().padStart(2, '0')} ${this.result(result)} against ${this.name(opp_name)}**`, [
					`\u200e\u2002 \u2002${emoji.star_small} ${this.padStart(our_stars)} / ${this.padEnd(opp_stars)} ${emoji.fire_small} ${our_destruct}% / ${opp_destruct}% ${emoji.attacksword} ${our_attacks}`,
					`\u2002 \u2002${emoji.users_small} ${this.padStart(size)} / ${this.padEnd(size)} ${emoji.clock_small} ${time} ago`
				]);
			}
		}

		return message.util.send({ embed });
	}

	result(result) {
		if (result === 'Won') return `${emoji.ok} Won`;
		if (result === 'Lost') return `${emoji.wrong} Lost`;
		if (result === 'Tied') return '<:empty:699639532013748326> Tied ';
	}

	name(data) {
		return data.split('').slice(0, 10).join('');
	}

	padEnd(num) {
		return num.toString().padEnd(3, '\u2002');
	}

	padStart(num) {
		return num.toString().padStart(3, '\u2002');
	}
}

module.exports = WarlogCommand;
