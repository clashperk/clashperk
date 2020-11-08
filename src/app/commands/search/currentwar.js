const { Command, Flag } = require('discord-akairo');
const { MessageEmbed, Util } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');
const Resolver = require('../../struct/Resolver');
const { emoji, townHallEmoji } = require('../../util/emojis');

class CurrentWarCommand extends Command {
	constructor() {
		super('current-war', {
			aliases: ['war', 'cw', 'current-war'],
			category: 'cwl',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info and stats about current war.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		if (data.isWarLogPublic === false) {
			const res = await this.client.coc.clanWarLeague(data.tag).catch(() => null);
			if (res && res.ok) {
				embed.setDescription(`Clan is in CWL. Run \`${this.handler.prefix(message)}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Private WarLog');
			}
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).then(res => res.json());

		if (body.state === 'notInWar') {
			const res = await this.client.coc.clanWarLeague(data.tag).catch(() => null);
			if (res && res.ok) {
				embed.setDescription(`Clan is in CWL. Run \`${this.handler.prefix(message)}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Not in War');
			}
			return message.util.send({ embed });
		}

		if (body.state === 'preparation') {
			embed.setDescription([
				'**War Against**',
				`${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'Preparation Day',
				`Starts in ${moment.duration(new Date(moment(body.startTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })}`,
				'',
				'**War Size**',
				`${body.teamSize} vs ${body.teamSize}`
			]);
		} else if (body.state === 'inWar') {
			embed.setDescription([
				'**War Against**',
				`${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'Battle Day',
				`Ends in ${moment.duration(new Date(moment(body.endTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })}`,
				'',
				'**War Size**',
				`${body.teamSize} vs ${body.teamSize}`,
				'',
				'**War Stats**',
				`${emoji.star} ${body.clan.stars} / ${body.opponent.stars}`,
				`${emoji.fire} ${body.clan.destructionPercentage.toFixed(2)}% / ${body.opponent.destructionPercentage.toFixed(2)}%`,
				`${emoji.attacksword} ${body.clan.attacks} / ${body.opponent.attacks}`
			]);
		} else if (body.state === 'warEnded') {
			embed.setDescription([
				'**War Against**',
				`${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'War Ended',
				`Ended ${moment.duration(Date.now() - new Date(moment(body.endTime).toDate()).getTime()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })} ago`,
				'',
				'**War Size**',
				`${body.teamSize} vs ${body.teamSize}`,
				'',
				'**War Stats**',
				`${emoji.star} ${body.clan.stars} / ${body.opponent.stars}`,
				`${emoji.fire} ${body.clan.destructionPercentage.toFixed(2)}% / ${body.opponent.destructionPercentage.toFixed(2)}%`,
				`${emoji.attacksword} ${body.clan.attacks} / ${body.opponent.attacks}`
			]);
		}

		embed.setDescription([
			embed.description,
			'',
			'**Rosters**',
			`${Util.escapeMarkdown(body.clan.name)}`,
			`${this.count(body.clan.members)}`,
			'',
			`${Util.escapeMarkdown(body.opponent.name)}`,
			`${this.count(body.opponent.members)}`
		]);

		return message.util.send({ embed });
	}

	count(members) {
		const reduced = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map(entry => ({ level: entry[0], total: entry[1] }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map(chunks => chunks.map(th => `${townHallEmoji[th.level]} \`${th.total.toString().padStart(2, '0')}\``)
				.join(' '))
			.join('\n');
	}

	chunk(items = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}

module.exports = CurrentWarCommand;
