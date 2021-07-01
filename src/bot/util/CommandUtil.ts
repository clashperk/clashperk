import { Message, CommandInteraction, InteractionReplyOptions, ButtonInteraction } from 'discord.js';

export class CommandUtil {
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

	public async send(options: string | InteractionReplyOptions & { split: false }): Promise<Message | Message[]> {
		const transformedOptions = (this.constructor as typeof CommandUtil).transformOptions(options);
		if (!this.lastResponse?.deleted && this.shouldEdit) {
			return this.message.webhook.editMessage(this.lastResponse!.id, transformedOptions) as Promise<Message>;
		}

		const sent = await this.message.webhook.send(transformedOptions);
		this.setLastResponse(sent as Message);
		return sent as Message;
	}

	public async sendNew(options: string | InteractionReplyOptions & { split: false }) {
		return this.message.webhook.send(options);
	}

	public static transformOptions(options: string | InteractionReplyOptions & { split: false }) {
		const transformedOptions = typeof options === 'string' ? { content: options } : { ...options };
		if (!transformedOptions.content) transformedOptions.content = null;
		// @ts-expect-error
		if (!transformedOptions.embeds) transformedOptions.embeds = [];
		return transformedOptions;
	}
}
