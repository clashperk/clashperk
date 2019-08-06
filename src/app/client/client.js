const { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler, Flag } = require('discord-akairo');
const SettingsProvider = require('../struct/SettingsProviders');
const path = require('path');
const Tracker = require('../struct/Tracker');
const fetch = require('node-fetch');
const PostStats = require('../struct/PostStats');
const Firebase = require('../struct/Firebase');
const { firebase } = require('../struct/Database');

class Client extends AkairoClient {
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
			defaultCooldown: 5000,
			argumentDefaults: {
				prompt: {
					modifyStart: (msg, text) => text && `${msg.author}, ${text} \n\nType \`cancel\` to cancel this command.`,
					modifyRetry: (msg, text) => text && `${msg.author}, ${text} \n\nType \`cancel\` to cancel this command.`,
					timeout: msg => `${msg.author}, time ran out, command has been cancelled.`,
					ended: msg => `${msg.author}, too many retries, command has been cancelled.`,
					cancel: msg => `${msg.author}, command has been cancelled.`,
					retries: 2,
					time: 30000
				}
			}
		});

		this.inhibitorHandler = new InhibitorHandler(this, { directory: path.join(__dirname, '..', 'inhibitors') });

		this.listenerHandler = new ListenerHandler(this, { directory: path.join(__dirname, '..', 'listeners') });

		this.settings = new SettingsProvider(firebase.ref('settings'));

		this.postStats = new PostStats(this);

		this.tracker = new Tracker(this);

		this.firebase = new Firebase(this);

		const STATUS = {
			400: 'client provided incorrect parameters for the request.',
			403: 'access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
			404: 'invalid tag, resource was not found.',
			429: 'request was throttled, because amount of requests was above the threshold defined for the used API token.',
			500: 'unknown error happened when handling the request.',
			503: 'service is temprorarily unavailable because of maintenance.'
		};

		this.commandHandler.resolver.addType('player', async (msg, phrase) => {
			if (!phrase) return null;
			phrase = `#${phrase.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(phrase)}`;
			const res = await fetch(uri, {
				method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			});

			if (!res.ok) return Flag.fail(STATUS[res.status]);
			const data = await res.json();
			return data;
		});

		this.commandHandler.resolver.addType('clan', async (msg, phrase) => {
			if (!phrase) return null;
			const tag = `#${phrase.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
			const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`;
			const res = await fetch(uri, {
				method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			});

			if (!res.ok) return Flag.fail(STATUS[res.status]);
			const data = await res.json();
			return data;
		});

		setInterval(() => {
			for (const guild of this.guilds.values()) {
				guild.presences.clear();
			}
		}, 900);

		this.setup();
	}

	async setup() {
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
	}

	async start(token) {
		await this.settings.init();
		return this.login(token);
	}
}

module.exports = Client;
