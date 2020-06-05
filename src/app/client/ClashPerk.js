const { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler, Flag } = require('discord-akairo');
const Settings = require('../struct/SettingsProvider');
const CacheHandler = require('../core/CacheHandler');
const VoteHandler = require('../struct/VoteHandler');
const Storage = require('../struct/StorageHandler');
const PostStats = require('../struct/PostStats');
const Database = require('../struct/Database');
const Firebase = require('../struct/Firebase');
const { MessageEmbed } = require('discord.js');
const { Client } = require('clashofclans.js');
const Patrons = require('../struct/Patrons');
const Logger = require('../util/logger');
const path = require('path');

class ClashPerk extends AkairoClient {
	constructor(config) {
		super({ ownerID: config.owner }, {
			messageCacheMaxSize: 10,
			messageCacheLifetime: 150,
			messageSweepInterval: 150,
			ws: {
				intents: [
					'GUILDS',
					'GUILD_MESSAGES',
					// 'GUILD_MEMBERS',
					// 'GUILD_PRESENCES',
					'GUILD_MESSAGE_REACTIONS'
				]
			}
		});

		this.logger = new Logger(this);

		this.commandHandler = new CommandHandler(this, {
			directory: path.join(__dirname, '..', 'commands'),
			aliasReplacement: /-/g,
			prefix: message => this.settings.get(message.guild, 'prefix', '*'),
			allowMention: true,
			commandUtil: true,
			commandUtilLifetime: 15e4,
			commandUtilSweepInterval: 15e4,
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

		setInterval(() => {
			for (const guild of this.guilds.cache.values()) {
				guild.presences.cache.clear();
				for (const id of guild.members.cache.keys()) {
					if (this.user.id !== id) {
						guild.members.cache.delete(id);
					}
				}
				this.users.cache.clear();
			}
		}, 5 * 60 * 1000);
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

		await Database.connect();
		this.settings = new Settings(Database.mongodb.db('clashperk').collection('settings'));


		this.firebase = new Firebase(this);
		this.firebase = new Firebase(this);
		this.coc = new Client({ token: process.env.DEVELOPER_TOKEN });
		this.postStats = new PostStats(this);
		this.voteHandler = new VoteHandler(this);

		this.patron = new Patrons(this);
		await this.settings.init();
		await this.patron.refresh();

		this.cacheHandler = new CacheHandler(this);
		this.storage = new Storage(this);

		this.once('ready', () => {
			if (this.user.id === process.env.CLIENT_ID) {
				this.patron.init();
				this.firebase.init();
				this.voteHandler.init();
				this.postStats.status();
				this.cacheHandler.init();
			}
		});
	}

	async start(token) {
		await this.init();
		return this.login(token);
	}
}

module.exports = ClashPerk;
