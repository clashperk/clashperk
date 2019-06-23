const { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler } = require('discord-akairo');

class Client extends AkairoClient {
	constructor(config) {
		super({ ownerID: config.owner }, {
			disableEveryone: true,
			disabledEvents: ['TYPING_START']
		});

		this.commandHandler = new CommandHandler(this, {
			directory: './src/commands/',
			aliasReplacement: /-/g,
			prefix: '*',
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

		this.inhibitorHandler = new InhibitorHandler(this, { directory: './src/inhibitors/' });

		this.listenerHandler = new ListenerHandler(this, { directory: './src/listeners/' });

		this.setup();
	}

	setup() {
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
		return this.login(token);
	}
}

module.exports = Client;
