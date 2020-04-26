const { Command } = require('discord-akairo');
const { mongodb, firestore } = require('../../struct/Database');
const { emoji } = require('../../util/emojis');

class ClanEmbedCommand extends Command {
	constructor() {
		super('clanembed', {
			aliases: ['clanembed'],
			category: 'premium',
			cooldown: 3000,
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Creates a live updating clan embed.',
				usage: '<tag> [--accepts] [11 12 13]'
			}
		});
	}

	*args() {
		const clan = yield {
			type: 'clan',
			prompt: {
				start: 'What is the clan tag?',
				retry: 'Please provide a valid clan tag.'
			}
		};

		const leader = yield {
			type: 'member',
			prompt: {
				start: 'Who is the leader?',
				retry: 'Please mention a valid member...'
			}
		};

		const accepts = yield {
			type: 'string',
			prompt: {
				start: 'What townhalls are accepted?',
				retry: 'Please provide a valid number...'
			}
		};

		const description = yield {
			match: 'rest',
			prompt: {
				start: 'What would you like to set the description?',
				retry: 'Please provide a description...'
			}
		};

		return { clan, leader, accepts, description };
	}

	async exec(message, { clan, accepts, leader, description }) {
		if (!this.client.patron.get(message.guild.id, 'guild', false)) return;
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setTitle('Open In-Game')
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${clan.tag}`)
			.setThumbnail(clan.badgeUrls.medium)
			.setDescription(description)
			.addField(`${emoji.owner} Leader`, `${leader}`)
			.addField(`${emoji.townhall} Accepted Town-Hall`, accepts.split(',').map(x => x.trim()).join(', '))
			.addField(`${emoji.clan} War Info`, [
				`${clan.warWins} wins, ${clan.isWarLogPublic ? `${clan.warLosses} losses, ${clan.warTies} ties,` : ''} win streak ${clan.warWinStreak}`
			])
			.setFooter(`Members [${clan.members}/50]`, this.client.user.displayAvatarURL())
			.setTimestamp();

		const msg = await message.util.send({ embed });

		const ref = await firestore.collection('tracking_clans')
			.doc(`${message.guild.id}${clan.tag}`);
		await ref.update({
			tag: clan.tag,
			name: clan.name,
			user: message.author.id,
			verified: true,
			clanembed: {
				channel: message.channel.id,
				message: msg.id
			},
			guild: message.guild.id,
			isPremium: this.client.patron.get(message.guild.id, 'guild', false),
			createdAt: new Date()
		}, { merge: true });

		const metadata = await ref.get().then(snap => snap.data());

		// this.client.tracker.add(clan.tag, message.guild.id, metadata);
		// this.client.tracker.push(metadata);

		return this.save({
			guild: message.guild.id,
			tag: clan.tag,
			name: clan.name,
			channel: message.channel.id,
			message: msg.id,
			embed: {
				leader: leader.id,
				accepts: accepts.split(',').map(x => x.trim()),
				description
			}
		});
	}

	async save(data) {
		return mongodb.db('clashperk')
			.collection('clanembeds')
			.findOneAndUpdate({
				guild: data.guild,
				tag: data.tag
			}, {
				$set: {
					guild: data.guild,
					tag: data.tag,
					name: data.name,
					channel: data.channel,
					message: data.message,
					createdAt: new Date(),
					embed: data.embed
				}
			}, { upsert: true, returnOriginal: false });
	}
}

module.exports = ClanEmbedCommand;
