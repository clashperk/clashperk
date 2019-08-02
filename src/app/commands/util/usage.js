const { Command } = require('discord-akairo');
const { firebaseApp } = require('../../struct/Database');

class UsageCommand extends Command {
	constructor() {
		super('usage', {
			aliases: ['usage'],
			category: 'beta',
			description: {
				content: 'Displays the usage statistics of the bot.'
			},
			clientPermissions: ['EMBED_LINKS']
		});
	}

	async exec(message) {
		const guilds = await this.guilds();
		const users = await this.users();
		const commands = await this.commands();

		const embed = this.client.util.embed()
			.setAuthor(`${this.client.user.username} Usage  Statistics`, this.client.user.displayAvatarURL())
			.setColor(0x5970c1)
			.addField('Commands Ran', `${await this.commandsTotal()}x`)
			.addField('Top Users', [
				users.splice(0, 10).map(({ id, uses }, index) => `**${++index}.** ${this.client.users.get(id).tag} **${uses}x**`).join('\n')
			])
			.addField('Top Servers', [
				guilds.splice(0, 10).map(({ id, uses }, index) => `**${++index}.** ${this.client.guilds.get(id).name} **${uses}x**`).join('\n')
			])
			.addField('Top commands', [
				commands.splice(0, 10).map(({ id, uses }, index) => `**${++index}.** ${this.client.commandHandler.modules.get(id).aliases[0]} **${uses}x**`).join('\n')
			]);

		return message.util.send({ embed });
	}

	async users() {
		const ref = await firebaseApp.database().ref('users');
		const data = await ref.once('value').then(snap => snap.val());
		const users = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.users.has(key)) continue;
			users.push({ uses: value, id: key });
		}

		return this.sort(users);
	}

	async guilds() {
		const ref = await firebaseApp.database().ref('guilds');
		const data = await ref.once('value').then(snap => snap.val());
		const guilds = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.guilds.has(key)) continue;
			guilds.push({ uses: value, id: key });
		}

		return this.sort(guilds);
	}

	async commands() {
		const ref = await firebaseApp.database().ref('commands');
		const data = await ref.once('value').then(snap => snap.val());
		const commands = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.commandHandler.modules.get(key) || !this.client.commandHandler.modules.get(key).aliases.length) continue;
			commands.push({ uses: value, id: key });
		}

		return this.sort(commands);
	}

	async commandsTotal() {
		const ref = await firebaseApp.database().ref('stats');
		const data = await ref.once('value').then(snap => snap.val());

		return data ? data.commands_used : 0;
	}

	sort(items) {
		return items.sort((a, b) => b.uses - a.uses);
	}
}

module.exports = UsageCommand;

