const { Command, Argument } = require('discord-akairo');
const { firebase } = require('../../struct/Database');
const Chart = require('../../core/ChartHandler');
const { MessageAttachment, MessageEmbed } = require('discord.js');

class UsageCommand extends Command {
	constructor() {
		super('usage', {
			aliases: ['usage'],
			category: 'beta',
			description: {
				content: 'Displays the usage statistics of the bot.'
			},
			clientPermissions: ['EMBED_LINKS'],
			args: [
				{
					id: 'growth',
					type: ['growth']
				},
				{
					id: 'limit',
					type: Argument.range('integer', 15, 30, true),
					default: 15
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { growth: graph, limit }) {
		if (graph) {
			const { addition, deletion, growth } = await this.growth();
			const buffer = await this.buffer(limit);
			const file = new MessageAttachment(buffer, 'growth.png');
			const embed = new MessageEmbed()
				.setAuthor('ClashPerk', this.client.user.displayAvatarURL())
				.setColor(this.client.embed(message))
				.setImage('attachment://growth.png')
				.setFooter(`${'⚙️'} Today's Growth: ${addition}/${Math.abs(deletion)}/${growth}`);
			return message.util.send(embed.footer.text, { /* embed, */ files: [file] });
		}

		// const guilds = await this.guilds();
		// const users = await this.users();
		const { commands, total } = await this.commands();
		const embed = this.client.util.embed()
			.setAuthor(`${this.client.user.username}`, this.client.user.displayAvatarURL())
			.setColor(this.client.embed(message))
			.setTitle('Usage')
			.setURL('https://clashperk.statuspage.io/')
			.setFooter(`${total}x Total • Since April 2019`);
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
			`__**\`\u200e # ${'Uses'.padStart(6, ' ')}  ${'CommandID'.padEnd(15, ' ')}\u200f\`**__`,
			...commands.splice(0, 15)
				.map(({ id, uses }, index) => {
					const command = this.client.commandHandler.modules.get(id).aliases[0].replace(/-/g, '');
					return `\`\u200e${(index + 1).toString().padStart(2, ' ')} ${uses.toString().padStart(5, ' ')}x  ${command.padEnd(15, ' ')}\u200f\``;
				})
		]);

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

	async growth() {
		const now = new Date(Date.now() + 198e5);
		const id = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('-');
		const ref = firebase.ref('growth').child(id);
		const data = await ref.once('value').then(snap => snap.val());
		if (!data) return { addition: 0, deletion: 0, growth: 0 };
		return { addition: data.addition, deletion: data.deletion, growth: data.addition + data.deletion };
	}

	async buffer(limit) {
		const data = await firebase.ref('growth')
			.once('value')
			.then(snap => snap.val());
		const collection = [];
		for (const [key, value] of Object.entries(data)) {
			collection.push({ date: new Date(key), value });
		}
		collection.sort((a, b) => a.date - b.date);
		return Chart.growth(collection.slice(-limit));
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

