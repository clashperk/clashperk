const { Listener } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

class GuildCreateListener extends Listener {
	constructor() {
		super('guildCreate', {
			emitter: 'client',
			event: 'guildCreate',
			category: 'client'
		});
	}

	async fetchWebhook() {
		if (this.webhook) return this.webhook;
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'webhook', undefined)).catch(() => null);
		this.webhook = webhook;
		return webhook;
	}

	async exec(guild) {
		if (!guild.available) return;
		this.client.logger.debug(`${guild.name} (${guild.id})`, { label: 'GUILD_CREATE' });

		await this.intro(guild);
		await this.restore(guild);

		const user = await this.client.users.fetch(guild.ownerID).catch(() => null);
		const webhook = await this.fetchWebhook().catch(() => null);
		if (webhook) {
			const embed = this.client.util.embed()
				.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL())
				.setTitle(`${this.client.emojis.cache.get('609254782808621066')} ${user.tag} (${user.id})`)
				.setFooter(`${guild.memberCount} members`, user.displayAvatarURL())
				.setColor(0x38d863)
				.setTimestamp();

			return webhook.send({ embeds: [embed] });
		}
	}

	async intro(guild) {
		const prefix = this.client.settings.get(guild, 'prefix', '*');
		const embed = this.client.util.embed()
			.setAuthor('Thanks for Inviting me, have a nice day!', this.client.user.displayAvatarURL())
			.setDescription([
				`My default prefix is \`${prefix}\``,
				`If you want to change my prefix, just type \`${prefix}prefix <new prefix>\``,
				'',
				`To get the full list of commands type \`${prefix}help\``,
				`To view more details for a command, do \`${prefix}help <command>\``
			])
			.addField('Add to Discord', [
				'ClashPerk can be added to as many servers as you want!',
				'Please share the bot with your Friends. [Invite Link](https://clashperk.xyz/invite)'
			])
			.addField('Support', [
				'Join [Support Server](https://discord.gg/ppuppun) if you need help.',
				'',
				'If you like the bot, please support us on [Patreon](https://patreon.com/clashperk)'
			]);
		if (guild.systemChannelID) {
			const channel = guild.channels.cache.get(guild.systemChannelID);
			if (channel.permissionsFor(channel.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS', 'VIEW_CHANNEL'], false)) {
				return channel.send({ embed });
			}
		}

		const channel = guild.channels.cache.filter(channel => channel.type === 'text')
			.filter(channel => channel.permissionsFor(channel.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS', 'VIEW_CHANNEL'], false))
			.first();
		if (channel) return channel.send({ embed });
		return this.client.logger.info(`Failed on ${guild.name} (${guild.id})`, { label: 'INTRO_MESSAGE' });
	}

	async restore(guild) {
		const restored = await firestore.collection('tracking_clans')
			.where('guild', '==', guild.id)
			.get()
			.then(snapstot => {
				snapstot.forEach(doc => {
					const data = doc.data();
					this.client.tracker.add(data.tag, data.guild, data);
					this.client.tracker.push(data);
				});
				return snapstot.size;
			});
		return restored;
	}
}

module.exports = GuildCreateListener;
