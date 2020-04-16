const { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler, Flag } = require('discord-akairo');
const Settings = require('../struct/SettingsProvider');
const { firestore } = require('../struct/Database');
const Database = require('../struct/Database');
const Logger = require('../util/logger');
const ClanTracker = require('../struct/ClanTracker');
const CWLTracker = require('../struct/CWL');
const fetch = require('node-fetch');
const Patrons = require('../struct/Patrons');
const Voter = require('../struct/Voter');
const PostStats = require('../struct/PostStats');
const Firebase = require('../struct/Firebase');
const { MessageEmbed } = require('discord.js');
const { status } = require('../util/constants');
const path = require('path');

class ClashPerk extends AkairoClient {
	constructor(config) {
		super({ ownerID: config.owner }, {
			messageCacheMaxSize: 50,
			messageCacheLifetime: 300,
			messageSweepInterval: 300,
			ws: {
				intents: [
					'GUILDS',
					'GUILD_MESSAGES',
					'GUILD_MEMBERS',
					'GUILD_PRESENCES',
					'GUILD_MESSAGE_REACTIONS'
				]
			}
		});

		this.logger = new Logger();

		this.commandHandler = new CommandHandler(this, {
			directory: path.join(__dirname, '..', 'commands'),
			aliasReplacement: /-/g,
			prefix: message => this.settings.get(message.guild, 'prefix', '*'),
			allowMention: true,
			commandUtil: true,
			commandUtilLifetime: 3e5,
			commandUtilSweepInterval: 3e5,
			handleEdits: true,
			defaultCooldown: 3000,
			argumentDefaults: {
				prompt: {
					modifyStart: (msg, txt) => new MessageEmbed()
						.setColor(3093046)
						.setAuthor(txt)
						.setFooter('Type `cancel` to cancel the command.'),
					modifyRetry: (msg, txt) => new MessageEmbed()
						.setColor(3093046)
						.setAuthor(txt)
						.setFooter('Type `cancel` to cancel the command.'),
					timeout: new MessageEmbed()
						.setColor(3093046)
						.setAuthor('Time ran out, command has been cancelled!'),
					ended: new MessageEmbed()
						.setColor(3093046)
						.setAuthor('Too many retries, command has been cancelled!'),
					cancel: new MessageEmbed()
						.setColor(3093046)
						.setAuthor('Command has been cancelled!'),
					retries: 1,
					time: 30000
				}
			}
		});

		this.inhibitorHandler = new InhibitorHandler(this, { directory: path.join(__dirname, '..', 'inhibitors') });
		this.listenerHandler = new ListenerHandler(this, { directory: path.join(__dirname, '..', 'listeners') });

		this.commandHandler.resolver.addType('guildMember', (msg, phrase) => {
			if (!phrase) return null;
			const mention = phrase.match(/<@!?(\d{17,19})>/);
			const id = phrase.match(/^\d+$/);
			if (id) return msg.guild.members.cache.get(id[0]) || null;
			if (mention) return msg.guild.members.cache.get(mention[1]) || null;
			return null;
		});

		this.commandHandler.resolver.addType('player', async (msg, tag) => {
			if (!tag) return null;
			const res = await fetch(`https://api.clashofclans.com/v1/players/%23${this.format(tag)}`, {
				method: 'GET', timeout: 3000, headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			}).catch(() => null);

			if (!res) return Flag.fail(status(504));
			if (!res.ok) return Flag.fail(status(res.status));
			return res.json();
		});

		this.commandHandler.resolver.addType('clan', async (msg, tag) => {
			if (!tag) return null;
			const res = await fetch(`https://api.clashofclans.com/v1/clans/%23${this.format(tag)}`, {
				method: 'GET', timeout: 3000, headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			}).catch(() => null);

			if (!res) return Flag.fail(status(504));
			if (!res.ok) return Flag.fail(status(res.status));
			return res.json();
		});

		setInterval(() => {
			for (const guild of this.guilds.cache.values()) {
				guild.presences.cache.clear();
			}
		}, 900);
	}

	format(tag) {
		return tag.toUpperCase().replace(/#/g, '').replace(/O|o/g, '0');
	}

	async init() {
		this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
		this.commandHandler.useListenerHandler(this.listenerHandler);
		this.listenerHandler.setEmitters({
			commandHandler: this.commandHandler,
			inhibitorHandler: this.inhibitorHandler,
			listenerHandler: this.listenerHandler
		});

		this.commandHandler.loadAll();
		this.inhibitorHandler.loadAll();
		this.listenerHandler.loadAll();

		this.settings = new Settings(firestore.collection('settings'));
		this.postStats = new PostStats(this);
		this.tracker = new ClanTracker(this);
		this.cwl = new CWLTracker(this);
		this.firebase = new Firebase(this);
		this.patron = new Patrons(this);
		this.voter = new Voter(this);

		await this.settings.init();
		await this.patron.init();
		await Database.connect();

		const intervalID = setInterval(() => {
			if (this.readyAt && this.user && this.user.id === process.env.CLIENT_ID) {
				this.firebase.init();
				this.postStats.init();
				this.tracker.init();
				this.voter.init();
				this.cwl.init();
				clearInterval(intervalID);
			}
		}, 2000);
	}

	async start(token) {
		await this.init();
		return this.login(token);
	}
}

module.exports = ClashPerk;
