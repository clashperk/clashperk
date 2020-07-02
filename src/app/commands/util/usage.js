const { Command } = require('discord-akairo');
const { firebase } = require('../../struct/Database');

class UsageCommand extends Command {
	constructor() {
		super('usage', {
			aliases: ['usage'],
			category: 'beta',
			cooldown: 3000,
			description: {
				content: 'Displays the usage statistics of the bot.'
			},
			clientPermissions: ['EMBED_LINKS']
		});
	}

	async exec(message) {
		// const guilds = await this.guilds();
		// const users = await this.users();
		const { commands, total } = await this.commands();

		const embed = this.client.util.embed()
			.setAuthor(`${this.client.user.username}`, this.client.user.displayAvatarURL())
			.setColor(this.client.embed(message))
			.setTitle('Usage')
			.setURL('https://clashperk.statuspage.io/')
			.setTimestamp(new Date('2019-07-31T18:30:00Z'))
			.setFooter(`${total}x Total`);
		if (this.client.isOwner(message.author.id)) {
			/* embed.addField('Users', [
				`\`\`\`${users.splice(0, 10).map(({ id, uses }, index) => {
					const user = this.client.users.cache.get(id);
					return `${(index + 1).toString().padStart(2, '0')} ${uses.toString().padStart(5, ' ')}x  ${user.username}`;
				}).join('\n')}\`\`\``
			]);
			embed.addField('Servers', [
				`\`\`\`${guilds.splice(0, 10).map(({ id, uses }, index) => {
					const guild = this.client.guilds.cache.get(id);
					return `${(index + 1).toString().padStart(2, '0')} ${uses.toString().padStart(5, ' ')}x  ${guild.name}`;
				}).join('\n')}\`\`\``
			]);*/
			embed.setDescription([
				'\`\`\`',
				...commands.splice(0, 20)
					.map(({ id, uses }, index) => {
						const command = this.client.commandHandler.modules.get(id).aliases[0].replace(/-/g, '');
						return `${(index + 1).toString().padStart(2, '0')} ${uses.toString().padStart(5, ' ')}x  ${command}`;
					}),
				'\`\`\`'
			]);
		}

		return message.util.send({ embed });
	}

	async users() {
		const ref = firebase.ref('users');
		const data = await ref.once('value').then(snap => snap.val());
		const users = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.users.cache.has(key)) continue;
			users.push({ uses: value, id: key });
		}

		return this.sort(users);
	}

	async guilds() {
		const ref = firebase.ref('guilds');
		const data = await ref.once('value').then(snap => snap.val());
		const guilds = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.guilds.cache.has(key)) continue;
			guilds.push({ uses: value, id: key });
		}

		return this.sort(guilds);
	}

	async commands() {
		const ref = firebase.ref('commands');
		const data = await ref.once('value').then(snap => snap.val());
		const commands = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.commandHandler.modules.get(key) || !this.client.commandHandler.modules.get(key).aliases.length) continue;
			commands.push({ uses: value, id: key });
		}

		return { commands: this.sort(commands), total: this.total(commands) };
	}

	async commandsTotal() {
		const ref = firebase.ref('stats');
		const data = await ref.once('value').then(snap => snap.val());

		return data ? data.commands_used : 0;
	}

	sort(items) {
		return items.sort((a, b) => b.uses - a.uses);
	}

	total(items) {
		return items.reduce((previous, currrent) => currrent.uses + previous, 0);
	}
}

module.exports = UsageCommand;

