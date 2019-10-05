const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const Fetch = require('../../struct/Fetch');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');
const { geterror, fetcherror } = require('../../util/constants');
const { firestore } = require('../../struct/Database');

class CwlAttacksComamnd extends Command {
	constructor() {
		super('cwl-attacks', {
			aliases: ['cwl-attacks'],
			category: 'cwl',
			description: {
				content: 'Shows attacks of current cwl.',
				usage: '<tag>',
				examples: ['#8QU8J9LP'],
				fields: [
					{
						name: 'Flags',
						value: [
							'`--round <num>` or `-r <num>` to see specific round.'
						]
					}
				]
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 2000;
		return 15000;
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

	async exec(message, { data }) {
		await message.util.send('**Fetching data... <a:loading:538989228403458089>**');
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		});
		const body = await res.json();

		const embed = this.client.util.embed()
			.setColor(0x5970c1);

		if (!body.state) {
			embed.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('CLAN IS NOT IN CWL');
			return message.util.send({ embed });
		}

		return this.rounds(message, body, data);
	}

	async rounds(message, body, clan) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1);
		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'))
			.slice(-2)
			.reverse()
			.pop()
			.warTags;

		for (const tag of rounds) {
			const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(tag)}`, {
				method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			});
			const data = await res.json();
			if ((data.clan && data.clan.tag === clan.tag) || (data.opponent && data.opponent.tag === clan.tag)) {
				embed.setAuthor(`${data.clan.name} (${data.clan.tag})`, data.clan.badgeUrls.medium)
					.addField('War Against', `${data.opponent.name} (${data.opponent.tag})`)
					.addField('Team Size', `${data.teamSize}`);
				if (data.state === 'warEnded') {
					const end = new Date(moment(data.endTime).toDate()).getTime();
					embed.addField('State', 'War Ended')
						.addField('War Ended', `${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
						.addField('Stats', [
							`**${data.clan.name}**`,
							`\\⭐ ${data.clan.stars} \\🔥 ${data.clan.destructionPercentage.toFixed(2)}% \\⚔ ${data.clan.attacks}`,
							'',
							`**${data.opponent.name}**`,
							`\\⭐ ${data.opponent.stars} \\🔥 ${data.opponent.destructionPercentage.toFixed(2)}% \\⚔ ${data.opponent.attacks}`
						]);
				}
				if (data.state === 'inWar') {
					const started = new Date(moment(data.startTime).toDate()).getTime();
					let missing = '';
					const clanMembers = data.clan.tag === clan.tag ? data.clan.members : data.opponent.members;
					for (const member of this.short(clanMembers)) {
						if (!member.attacks) continue;
						missing += `**${member.mapPosition}.** ${member.name} \\⭐ ${member.attacks[0].stars} \\🔥 ${member.attacks[0].destructionPercentage}% \n`;
					}

					embed.addField('State', 'In War')
						.addField('Started', `${moment.duration(Date.now() - started).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
						.addField('Attacks', missing)
						.addField('Stats', [
							`**${data.clan.name}**`,
							`\\⭐ ${data.clan.stars} \\🔥 ${data.clan.destructionPercentage.toFixed(2)}% \\⚔ ${data.clan.attacks}`,
							'',
							`**${data.opponent.name}**`,
							`\\⭐ ${data.opponent.stars} \\🔥 ${data.opponent.destructionPercentage.toFixed(2)}% \\⚔ ${data.opponent.attacks}`
						]);
				}
				if (data.state === 'preparation') {
					const start = new Date(moment(data.startTime).toDate()).getTime();
					embed.addField('State', 'Preparation Day')
						.addField('Starting In', `${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`);
				}
			}
		}
		return message.util.send({ embed });
	}

	short(items) {
		return items.sort((a, b) => a.mapPosition - b.mapPosition);
	}
}

module.exports = CwlAttacksComamnd;
