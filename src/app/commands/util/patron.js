const { Command } = require('discord-akairo');
const { firestore, mongodb } = require('../../struct/Database');

class PatronCommand extends Command {
	constructor() {
		super('patron', {
			aliases: ['patron', 'donate', 'patreon'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Get information about the bot\'s patreon.'
			},
			args: [
				{
					id: 'action',
					type: ['add', 'del']
				},
				{
					id: 'id',
					type: 'string'
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { action, id }) {
		if (action && id && this.client.isOwner(message.author.id)) {
			const patrons = await this.patrons();
			const patron = patrons.find(d => d?.discord_id === id);
			for (const guild of patron?.guilds ?? []) {
				if (action === 'add') await this.add(guild.id);
				if (action === 'del') await this.del(guild.id);
			}

			if (action === 'add' && patron) {
				await firestore.collection('patrons').doc(patron.id).update({ active: true });
				await this.client.patron.refresh();
				return message.util.send('Success!');
			}

			if (action === 'del' && patron) {
				await firestore.collection('patrons').doc(patron.id).update({ active: false });
				await this.client.patron.refresh();
				return message.util.send('Success!');
			}

			return message.util.send('Failed!');
		}

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('ClashPerk', this.client.user.displayAvatarURL(), 'https://www.patreon.com/clashperk')
			.setDescription([
				'Help us with our hosting related expenses.',
				'Any help is beyond appreciated.',
				'',
				'**Benefits**',
				'• Faster updates & only 1 sec cooldown',
				'• Claim unlimited number of clans',
				'• Create live clan promotional embeds',
				'• Customize embed color in your discord',
				'• Export members, wars & cwl to excel',
				'• Patron role on our support discord',
				'',
				'[Become a Patron](https://www.patreon.com/clashperk)'
			]);

		if (!message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS'], false)) {
			return message.util.send({ embed });
		}

		const msg = await message.util.send({ embed });
		await msg.react('➕');
		const collector = msg.createReactionCollector(
			(reaction, user) => ['➕'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 1 }
		);

		const patrons = await this.patrons();
		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➕') {
				await collector.stop();
				embed.setDescription([
					embed.description,
					'',
					`**Our Current Patrons (${patrons.filter(d => d.active && !this.client.isOwner(d.discord_id)).length})**`,
					patrons.filter(d => d.active && !this.client.isOwner(d.discord_id))
						.map(d => `• ${d.discord_username ?? d.name}`)
						.join('\n')
				]);
				return msg.edit({ embed });
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
	}

	async patrons(patrons = []) {
		await firestore.collection('patrons')
			.orderBy('createdAt', 'asc')
			.get()
			.then(snapshot => {
				snapshot.forEach(snap => {
					const data = snap.data();
					patrons.push(data);
				});
			});
		return patrons;
	}

	async add(guild) {
		const db = mongodb.db('clashperk').collection('clanstores');
		await db.updateMany({ guild }, { $set: { active: true, patron: true } });
		const collection = await db.find({ guild }).toArray();
		collection.forEach(async data => {
			await this.client.cacheHandler.add(data._id, { tag: data.tag, guild: data.guild });
		});
		return collection;
	}

	async del(guild) {
		const db = mongodb.db('clashperk').collection('clanstores');
		await db.updateMany({ guild }, { $set: { patron: false } });
		const collection = await db.find({ guild }).skip(2).toArray();
		collection.forEach(async data => {
			await db.updateOne({ _id: data._id }, { $set: { active: false } });
			await this.client.cacheHandler.delete(data._id, { tag: data.tag });
		});
		return collection;
	}
}

module.exports = PatronCommand;
