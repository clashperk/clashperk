const { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler, Flag } = require('discord-akairo');
const Settings = require('../struct/SettingsProvider');
const { firestore } = require('../struct/Database');
const path = require('path');
const Database = require('../struct/Database');
const Tracker = require('../struct/Tracker');
const fetch = require('node-fetch');
const Patrons = require('../struct/Patrons');
const Voter = require('../struct/Voter');
const PostStats = require('../struct/PostStats');
const Firebase = require('../struct/Firebase');

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
					modifyStart: (msg, text) => text && `${msg.author}, ${text} \n\nType \`cancel\` to cancel this command.`,
					modifyRetry: (msg, text) => text && `${msg.author}, ${text} \n\nType \`cancel\` to cancel this command.`,
					timeout: msg => `${msg.author}, time ran out, command has been cancelled.`,
					ended: msg => `${msg.author}, too many retries, command has been cancelled.`,
					cancel: msg => `${msg.author}, command has been cancelled.`,
					retries: 1,
					time: 30000
				}
			}
		});

		this.inhibitorHandler = new InhibitorHandler(this, { directory: path.join(__dirname, '..', 'inhibitors') });
		this.listenerHandler = new ListenerHandler(this, { directory: path.join(__dirname, '..', 'listeners') });

		const STATUS = {
			100: 'service is temprorarily unavailable.',
			400: 'client provided incorrect parameters for the request.',
			403: 'access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
			404: 'invalid tag, resource was not found.',
			429: 'request was throttled, because amount of requests was above the threshold defined for the used API token.',
			500: 'unknown error happened when handling the request.',
			503: 'service is temprorarily unavailable because of maintenance.'
		};

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

		setInterval(() => {
			for (const guild of this.guilds.values()) {
				guild.presences.clear();
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
		this.tracker = new Tracker(this);
		this.firebase = new Firebase(this);
		this.patron = new Patrons(this);
		this.voter = new Voter(this);

		await Database.authenticate();
		await this.settings.init();
		await this.patron.init();
	}

	async run() {
		if (this.user.id === process.env.CLIENT_ID) {
			this.firebase.init();
			this.postStats.init();
			this.tracker.init();
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
