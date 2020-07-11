const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');
const Resolver = require('../../struct/Resolver');

class RemainingAttacksCommand extends Command {
	constructor() {
		super('remaining', {
			aliases: ['remaining', 'missing', 'missing-attacks', 'rem'],
			category: 'cwl',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: [
					'Shows info about remaining attacks.',
					'',
					'**Flags**',
					'`--cwl` or `cwl` for cwl missing attacks.'
				],
				usage: '<clanTag> [--cwl/cwl]',
				examples: ['#8QU8J9LP', '8QU8J9LP --cwl', '#8QU8J9LP cwl']
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
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`);

		if (data.isWarLogPublic === false) {
			const isCWL = await this.client.coc.clanWarLeague(data.tag).catch(() => null);
			if (isCWL) {
				embed.setDescription(`Clan is in CWL. Run \`${this.handler.prefix(message)}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Private WarLog');
			}
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar`, {
			method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).then(res => res.json());

		if (body.state === 'notInWar') {
			const isCWL = await this.client.coc.clanWarLeague(data.tag).catch(() => null);
			if (isCWL) {
				embed.setDescription(`Clan is in CWL. Run \`${this.handler.prefix(message)}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Not in War');
			}
			return message.util.send({ embed });
		}

		if (body.state === 'preparation') {
			embed.setDescription([
				'**War Against**',
				`${body.opponent.name} (${body.opponent.tag})`,
				'',
				'**War State**',
				'Preparation'
			]);
			return message.util.send({ embed });
		}

		let missing = '';
		missing = `**\`\u200e#  \u2002 X \u2002 ${'NAME'.padEnd(20, ' ')}\`**\n`;
		for (const member of this.short(body.clan.members)) {
			if (member.attacks && member.attacks.length === 2) continue;
			missing += `\`\u200e${member.mapPosition.toString().padEnd(2, ' ')} \u2002 ${member.attacks ? 2 - member.attacks.length : 2} \u2002 ${member.name.padEnd(20, ' ')}\`\n`;
		}
		embed.setDescription([
			'**War Against**',
			`${body.opponent.name} (${body.opponent.tag})`,
			'',
			'**War State**',
			`${body.state.replace(/warEnded/g, 'War Ended').replace(/inWar/g, 'Battle Day')}`,
			'',
			`**${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
			`${missing}`
		]);
		const endTime = new Date(moment(body.endTime).toDate()).getTime();
		if (body.state === 'inWar') embed.setFooter(`Ends in ${moment.duration(endTime - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })}`);
		else embed.setFooter(`Ended ${moment.duration(Date.now() - endTime).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })} ago`);

		return message.util.send({ embed });
	}

	short(items) {
		return items.sort((a, b) => a.mapPosition - b.mapPosition);
	}
}

module.exports = RemainingAttacksCommand;
