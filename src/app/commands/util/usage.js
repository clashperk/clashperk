const { Command } = require('discord-akairo');
const { firebase } = require('../../struct/Database');

class UsageCommand extends Command {
	constructor() {
		super('usage', {
			aliases: ['usage'],
			category: 'beta',
			cooldown: 1000,
			description: {
				content: 'Displays the usage statistics of the bot.'
			},
			clientPermissions: ['EMBED_LINKS']
		});
	}

	async exec(message) {
		const guilds = await this.guilds();
		const users = await this.users();
		const { commands, total } = await this.commands();

		const embed = this.client.util.embed()
			.setAuthor(`${this.client.user.username} Usage  Statistics`, this.client.user.displayAvatarURL())
			.setColor(0x5970c1)
			.setFooter('Since August 1, 2019')
			.setTitle(`${total}x commands used`)
			.addField('Users', [
				`\u200b${users.splice(0, 10).map(({ id, uses }, index) => `\`${++index}.\` \u200b\`${this.client.users.get(id).tag}\` \u200b\`${uses}x\``).join('\n')}`
			])
			.addField('Servers', [
				`\u200b${guilds.splice(0, 10).map(({ id, uses }, index) => `\`${++index}.\` \u200b\`${this.client.guilds.get(id).name}\` \u200b\`${uses}x\``).join('\n')}`
			])
			.addField('Commands', [
				`\u200b${commands.splice(0, 10).map(({ id, uses }, index) => `\`${++index}.\` \u200b\`${this.client.commandHandler.modules.get(id).aliases[0].replace(/-/g, '')}\` \u200b\`${uses}x\``).join('\n')}`
			]);

		return message.util.send({ embed });
	}

	async users() {
		const ref = await firebase.ref('users');
		const data = await ref.once('value').then(snap => snap.val());
		const users = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.users.has(key)) continue;
			users.push({ uses: value, id: key });
		}

		return this.sort(users);
	}

	async guilds() {
		const ref = await firebase.ref('guilds');
		const data = await ref.once('value').then(snap => snap.val());
		const guilds = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.guilds.has(key)) continue;
			guilds.push({ uses: value, id: key });
		}

		return this.sort(guilds);
	}

	async commands() {
		const ref = await firebase.ref('commands');
		const data = await ref.once('value').then(snap => snap.val());
		const commands = [];
		for (const [key, value] of Object.entries(data)) {
			if (!this.client.commandHandler.modules.get(key) || !this.client.commandHandler.modules.get(key).aliases.length) continue;
			commands.push({ uses: value, id: key });
		}

		return { commands: this.sort(commands), total: this.total(commands) };
	}

	async commandsTotal() {
		const ref = await firebase.ref('stats');
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

