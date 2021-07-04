import { Message, CommandInteraction, InteractionReplyOptions, ButtonInteraction, Collection, Snowflake } from 'discord.js';

export class InteractionUtil {
	public shouldEdit: boolean;
	public lastResponse: Message | null;
	public message: CommandInteraction | ButtonInteraction;

	public constructor(message: CommandInteraction | ButtonInteraction) {
		this.message = message;
		this.shouldEdit = false;
		this.lastResponse = null;
	}

	public addMessage() {
		// TODO: NEVER DO
	}

	public setLastResponse(message: Message | Message[]) {
		this.shouldEdit = true;
		if (Array.isArray(message)) {
			this.lastResponse = message.slice(-1)[0];
		} else {
			this.lastResponse = message;
		}

		return this.lastResponse;
	}

	public setEditable() {
		// TODO: NEVER DO
	}

	public async send(options: string | InteractionReplyOptions): Promise<Message | Message[]> {
		const transformedOptions = (this.constructor as typeof InteractionUtil).transformOptions(options);
		if (!this.lastResponse?.deleted && this.shouldEdit) {
			return this.message.webhook.editMessage(this.lastResponse!.id, transformedOptions) as Promise<Message>;
		}

		const sent = await this.message.webhook.send(transformedOptions);
		this.setLastResponse(sent as Message);
		return sent as Message;
	}

	public async sendNew(options: string | InteractionReplyOptions) {
		return this.message.webhook.send(options);
	}

	public static transformOptions(options: string | InteractionReplyOptions) {
		const transformedOptions = typeof options === 'string' ? { content: options } : { ...options };
		if (!transformedOptions.content) transformedOptions.content = null;
		if (!transformedOptions.embeds) transformedOptions.embeds = [];
		return transformedOptions;
	}
}

const interactions = new Collection<Snowflake, InteractionUtil>();
const sweepInteractions = () => {
	for (const interaction of interactions.values()) {
		const now = Date.now();
		const message = interaction.message;
		if ((now - message.createdTimestamp) > 15 * 60 * 1000) {
			interactions.delete(message.id);
		}
	}
};
setInterval(sweepInteractions.bind(null), 15 * 60 * 1000);

Object.defineProperties(CommandInteraction.prototype, {
	author: {
		get: function() {
			return this.user;
		}
	},
	util: {
		get: function() {
			if (interactions.has(this.id)) return interactions.get(this.id);
			interactions.set(this.id, new InteractionUtil(this));
			return interactions.get(this.id);
		}
	},
	interaction: {
		get: function() {
			return {
				id: this.id, type: this.type,
				user: this.user, commandName: this.commandName
			};
		}
	}
});

Object.defineProperties(ButtonInteraction.prototype, {
	author: {
		get: function() {
			return this.user;
		}
	},
	util: {
		get: function() {
			if (interactions.has(this.id)) return interactions.get(this.id);
			interactions.set(this.id, new InteractionUtil(this));
			return interactions.get(this.id);
		}
	},
	interaction: {
		get: function() {
			return {
				id: this.id, type: this.type,
				user: this.user, commandName: this.customID
			};
		}
	}
});
