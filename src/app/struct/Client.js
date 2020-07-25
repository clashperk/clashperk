const { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler } = require('discord-akairo');
const CacheHandler = require('../core/CacheHandler');
const { MessageEmbed } = require('discord.js');
const Settings = require('./SettingsProvider');
const { Client } = require('clashofclans.js');
const Storage = require('./StorageHandler');
const Logger = require('../util/logger');
const Database = require('./Database');
const Firebase = require('./Firebase');
const Patrons = require('./Patrons');
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
						.setAuthor(txt)
						.setFooter('Type `cancel` to cancel the command.'),
					modifyRetry: (msg, txt) => new MessageEmbed()
						.setAuthor(txt)
						.setFooter('Type `cancel` to cancel the command.'),
					timeout: new MessageEmbed()
						.setAuthor('Time ran out, command has been cancelled!'),
					ended: new MessageEmbed()
						.setAuthor('Too many retries, command has been cancelled!'),
					cancel: new MessageEmbed()
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

		await Database.connect(this);
		await Database.createIndex();
		this.settings = new Settings(Database.mongodb.db('clashperk').collection('settings'));
		this.mongodb = Database.mongodb.db('clashperk');

		this.firebase = new Firebase(this);
		this.firebase = new Firebase(this);
		this.coc = new Client({ timeout: 3000, token: process.env.DEVELOPER_TOKEN });
		this.embed = message => this.settings.get(message.guild, 'color', 5861569);

		this.patron = new Patrons(this);
		await this.settings.init();
		await this.patron.refresh();

		this.cacheHandler = new CacheHandler(this);
		this.storage = new Storage(this);

		this.once('ready', () => {
			if (this.user.id === process.env.CLIENT_ID) {
				this.patron.init();
				this.firebase.init();
				this.cacheHandler.init();
				this.cacheHandler.session();
			}
		});
	}

	async start(token) {
		await this.init();
		return this.login(token);
	}
}

module.exports = ClashPerk;
