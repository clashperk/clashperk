const { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler, Flag } = require('discord-akairo');
const Settings = require('../struct/SettingsProvider');
const { firestore } = require('../struct/Database');
const path = require('path');
const Logger = require('../util/logger');
const ClanTracker = require('../struct/ClanTracker');
const fetch = require('node-fetch');
const Patrons = require('../struct/Patrons');
const Voter = require('../struct/Voter');
const PostStats = require('../struct/PostStats');
const Firebase = require('../struct/Firebase');
const { MessageEmbed } = require('discord.js');

class ClashPerk extends AkairoClient {
	constructor(config) {
		super({ ownerID: config.owner }, {
			messageCacheMaxSize: 50,
			messageCacheLifetime: 300,
			messageSweepInterval: 300,
			disableEveryone: true,
			disabledEvents: [
				'TYPING_START',
				'CHANNEL_PINS_UPDATE',
				'GUILD_EMOJIS_UPDATE',
				'GUILD_INTEGRATIONS_UPDATE',
				'GUILD_MEMBERS_CHUNK',
				'MESSAGE_DELETE',
				'MESSAGE_DELETE_BULK',
				'MESSAGE_REACTION_REMOVE',
				'MESSAGE_REACTION_REMOVE_ALL',
				'PRESENCE_UPDATE',
				'VOICE_SERVER_UPDATE',
				'VOICE_STATE_UPDATE',
				'WEBHOOKS_UPDATE',
				'USER_UPDATE'
			]
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

		const STATUS = {
			100: 'Service is temprorarily unavailable.',
			400: 'Client provided incorrect parameters for the request.',
			403: 'Access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
			404: 'Invalid tag, resource was not found.',
			429: 'Request was throttled, because amount of requests was above the threshold defined for the used API token.',
			500: 'Unknown error happened when handling the request.',
			503: 'Service is temprorarily unavailable because of maintenance.'
		};

		this.commandHandler.resolver.addType('guildMember', (msg, str) => {
			if (!str) return null;
			const mention = str.match(/<@!?(\d{17,19})>/);
			const id = str.match(/^\d+$/);
			if (id) return msg.guild.members.cache.get(id[0]) || null;
			if (mention) return msg.guild.members.cache.get(mention[1]) || null;
			return null;
		});

		this.commandHandler.resolver.addType('player', async (msg, str) => {
			if (!str) return null;
			const tag = `#${str.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
			const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
				method: 'GET', timeout: 3000, headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			}).catch(() => null);

			if (!res) return Flag.fail(STATUS[100]);
			if (!res.ok) return Flag.fail(STATUS[res.status]);
			const data = await res.json();
			return data;
		});

		this.commandHandler.resolver.addType('clan', async (msg, str) => {
			if (!str) return null;
			const tag = `#${str.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
			const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
				method: 'GET', timeout: 3000, headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			}).catch(() => null);

			if (!res) return Flag.fail(STATUS[100]);
			if (!res.ok) return Flag.fail(STATUS[res.status]);
			const data = await res.json();
			return data;
		});

		this.commandHandler.resolver.addType('guild_', async (msg, id) => {
			if (!id) return null;
			return this.guilds.cache.get(id);
		});

		this.commandHandler.resolver.addType('user_', async (msg, id) => {
			if (!id) return null;
			return this.users.cache.get(id);
		});

		this.commandHandler.resolver.addType('textChannel_', (msg, str) => {
			if (!str) return null;
			const mention = str.match(/<#(\d{17,19})>/);
			const id = str.match(/^\d+$/);
			if (id) return this.channels.cache.get(id[0]) || null;
			if (mention) return this.channels.cache.get(mention[1]) || null;
			return null;
		});

		setInterval(() => {
			for (const guild of this.guilds.cache.values()) {
				guild.presences.cache.clear();
			}
		}, 900);
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
		this.firebase = new Firebase(this);
		this.patron = new Patrons(this);
		this.voter = new Voter(this);

		await this.settings.init();
		await this.patron.init();
	}

	async run() {
		if (this.user.id === process.env.CLIENT_ID) {
			this.firebase.init();
			this.postStats.init();
			// this.tracker.init();
			this.voter.init();
		}
	}

	async start(token) {
		await this.init();
		await this.login(token);
		this.run();
	}
}

module.exports = ClashPerk;
