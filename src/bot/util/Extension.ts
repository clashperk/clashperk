import { Message, CommandInteraction, Interaction, InteractionReplyOptions, ButtonInteraction, Collection, Snowflake } from 'discord.js';
import 'moment-duration-format';
import { EMOJIS } from './Emojis';

export class InteractionUtil {
	public shouldEdit: boolean;
	public lastResponse: Message | null;
	public message: CommandInteraction | ButtonInteraction;

	public constructor(message: CommandInteraction | ButtonInteraction) {
		this.message = message;
		this.shouldEdit = false;
		this.lastResponse = null;
	}

	public setLastResponse(message: Message) {
		this.shouldEdit = Boolean(true);
		this.lastResponse = message;
		return this.lastResponse;
	}

	public addMessage() {
		// TODO: NEVER DO
	}

	public setEditable() {
		// TODO: NEVER DO
	}

	public async send(options: string | InteractionReplyOptions): Promise<Message> {
		const transformedOptions = (this.constructor as typeof InteractionUtil).transformOptions(options);
		if (this.shouldEdit) {
			const messageId = this.lastResponse?.flags.has('EPHEMERAL') ? '@original' : this.lastResponse?.id ?? '@original';
			try {
				const msg = await this.message.webhook.editMessage(messageId, transformedOptions);
				return msg as Message;
			} catch {
				const msg = await this.message.webhook.send(transformedOptions);
				this.setLastResponse(msg as Message);
				return msg as Message;
			}
		}

		const sent = await this.message.webhook.send(transformedOptions);
		this.setLastResponse(sent as Message);
		return sent as Message;
	}

	public update(interaction: ButtonInteraction) {
		this.shouldEdit = Boolean(true);
		return interaction.update({ content: `**Fetching data... ${EMOJIS.LOADING}**`, components: [], embeds: [] });
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
		if ((now - message.createdTimestamp) > 10 * 60 * 1000) {
			interactions.delete(message.id);
		}
	}
};
setInterval(sweepInteractions.bind(null), 5 * 60 * 1000);

Object.defineProperties(Interaction.prototype, {
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
			return { id: this.id, user: this.user, type: this.type };
		}
	}
});
