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
				usage: '<tag>'
			},
			optionFlags: ['--color']
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

		const color = yield {
			match: 'option',
			flag: ['--color'],
			type: 'color',
			default: 5861569
		};

		return { clan, leader, accepts, description, color };
	}

	async exec(message, { clan, clan: data, accepts, leader, description, color }) {
		if (!this.client.patron.get(message.guild.id, 'guild', false)) return;

		const clans = await this.clans(message);
		const max = this.client.patron.get(message.guild.id, 'limit', 2);
		if (clans.length >= max && !clans.map(clan => clan.tag).includes(data.tag)) {
			const embed = this.client.util.embed()
				.setDescription([
					'You can only claim 2 clans per guild!',
					'',
					'**Want more than that?**',
					'Consider subscribing to one of our premium plans on Patreon',
					'',
					'[Become a Patron](https://www.patreon.com/bePatron?u=14584309)'
				])
				.setColor(5861569);
			return message.util.send({ embed });
		}

		const isPatron = this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false);
		const isVoter = this.client.voter.isVoter(message.author.id);
		if (clans.length >= 1 && !clans.map(clan => clan.tag).includes(data.tag) && !(isVoter || isPatron)) {
			const embed = this.client.util.embed()
				.setDescription([
					'**Not Voted!**',
					'',
					'Want to claim one more clan? Please consider voting us on Discord Bot List',
					'',
					'[Vote ClashPerk](https://top.gg/bot/526971716711350273/vote)'
				])
				.setColor(5861569);
			return message.util.send({ embed });
		}

		if (!clans.map(clan => clan.tag).includes(data.tag) && !data.description.toLowerCase().includes('cp')) {
			const embed = this.client.util.embed()
				.setAuthor(`${data.name} - Donation Log Setup`, data.badgeUrls.small)
				.setDescription([
					'**Clan Description**',
					`${data.description}`,
					'',
					'**Verify Your Clan**',
					'Add the word `CP` at the end of the clan description.',
					'You can remove it after verification.',
					'This is a security feature to ensure you have proper leadership of the clan.'
				]);
			return message.util.send({ embed });
		}

		const embed = this.client.util.embed()
			.setColor(color)
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
				message: msg.id,
				color
			},
			guild: message.guild.id,
			isPremium: this.client.patron.get(message.guild.id, 'guild', false),
			createdAt: new Date()
		}, { merge: true });

		const metadata = await ref.get().then(snap => snap.data());

		this.client.tracker.add(clan.tag, message.guild.id, metadata);
		this.client.tracker.push(metadata);

		return this.save({
			guild: message.guild.id,
			tag: clan.tag,
			name: clan.name,
			channel: message.channel.id,
			message: msg.id,
			embed: {
				leader: leader.id,
				accepts: accepts.split(',').map(x => x.trim()),
				description,
				color
			}
		});
	}

	async clans(message, clans = []) {
		await firestore.collection('tracking_clans')
			.where('guild', '==', message.guild.id)
			.get()
			.then(snap => {
				snap.forEach(doc => {
					clans.push(doc.data());
				});
				if (!snap.size) clans = [];
			});
		return clans;
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
