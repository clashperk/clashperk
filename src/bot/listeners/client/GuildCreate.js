const { Listener } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { emoji } = require('../../util/emojis');

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
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'defaultWebhook', undefined)).catch(() => null);
		this.webhook = webhook;
		return webhook;
	}

	async exec(guild) {
		if (!guild.available) return;
		this.client.logger.debug(`${guild.name} (${guild.id})`, { label: 'GUILD_CREATE' });

		await this.intro(guild);
		await this.restore(guild);
		await this.client.stats.post();
		await this.client.stats.addition(guild.id);
		await this.client.stats.guilds(guild.id, 0);

		const user = await this.client.users.fetch(guild.ownerID).catch(() => null);
		const webhook = await this.fetchWebhook().catch(() => null);
		if (webhook) {
			const embed = this.client.util.embed()
				.setColor(0x38d863)
				.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL())
				.setTitle(`${emoji.owner} ${user.tag} (${user.id})`)
				.setFooter(`${guild.memberCount} members (Shard ${guild.shard.id})`, user.displayAvatarURL())
				.setTimestamp();
			return webhook.send({ embeds: [embed], username: 'ClashPerk', avatarURL: this.client.user.displayAvatarURL() });
		}
	}

	async intro(guild) {
		const prefix = this.client.settings.get(guild, 'prefix', '*');
		const embed = this.client.util.embed()
			.setAuthor('Thanks for inviting me, have a nice day!', this.client.user.displayAvatarURL())
			.setDescription([
				`My default prefix is \`${prefix}\``,
				`If you want to change my prefix, just type \`${prefix}prefix <new>\``,
				'',
				`To get the full list of commands type \`${prefix}help\``,
				`To view more details for a command, type \`${prefix}help <command>\``,
				`For a quick setup guide, type \`${prefix}guide\``
			])
			.addField('Add to Discord', [
				'ClashPerk can be added to as many servers as you want!',
				'Please share the bot with your Friends. [Invite Link](https://clashperk.com/invite)'
			])
			.addField('Support', [
				'Join [Support Server](https://discord.gg/ppuppun) if you need help.',
				'',
				'If you like the bot, please support us on [Patreon](https://www.patreon.com/clashperk)'
			]);
		if (guild.systemChannelID) {
			const channel = guild.channels.cache.get(guild.systemChannelID);
			if (channel.permissionsFor(channel.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS', 'VIEW_CHANNEL'], false)) {
				return channel.send({ embed });
			}
		}

		const channel = guild.channels.cache.filter(channel => channel.type === 'text')
			.sort((a, b) => a.createdAt - b.createdAt)
			.filter(channel => channel.permissionsFor(channel.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS', 'VIEW_CHANNEL'], false))
			.first();
		if (channel) return channel.send({ embed });
		return this.client.logger.info(`Failed on ${guild.name} (${guild.id})`, { label: 'INTRO_MESSAGE' });
	}

	async restore(guild) {
		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find({ guild: guild.id })
			.toArray();

		collection.forEach(async data => {
			await this.client.cacheHandler.add(data._id, { tag: data.tag, guild: guild.id });
		});

		return collection.length;
	}
}

module.exports = GuildCreateListener;
