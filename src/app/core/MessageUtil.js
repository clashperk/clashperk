const { APIMessage, Collection } = require('discord.js');

class CommandUtil {
	constructor() {
		this.msg = null;
		this.shouldEdit = false;
		this.cac = new Map();
	}

	async s(message) {
		const msg = await message.channel.send('s');
		this.message = msg;
		this.cac.set(msg.id, { m: msg });
		return msg;
	}

	setLastResponse(message) {
		if (Array.isArray(message)) {
			this.lastResponse = message.slice(-1)[0];
		} else {
			this.lastResponse = message;
		}

		this.msg = this.lastResponse;
		return this.lastResponse;
	}

	setEditable(state) {
		this.shouldEdit = Boolean(state);
		return this;
	}

	async send(message, content, options) {
		this.message = message;
		const transformedOptions = this.constructor.transformOptions(content, options);
		const hasFiles = (transformedOptions.files && transformedOptions.files.length > 0) ||
			(transformedOptions.embed && transformedOptions.embed.files && transformedOptions.embed.files.length > 0);

		if (this.shouldEdit && !hasFiles && !this.lastResponse.deleted && !this.lastResponse.attachments.size) {
			return this.lastResponse.edit(transformedOptions);
		}

		const sent = await this.message.channel.send(transformedOptions);
		const lastSent = this.setLastResponse(sent);
		this.setEditable(!lastSent.attachments.size);
		return sent;
	}

	async sendNew(content, options) {
		const sent = await this.message.channel.send(this.constructor.transformOptions(content, options));
		const lastSent = this.setLastResponse(sent);
		this.setEditable(!lastSent.attachments.size);
		return sent;
	}

	edit(content, options) {
		return this.lastResponse.edit(content, options);
	}

	static transformOptions(content, options, extra) {
		const transformedOptions = APIMessage.transformOptions(content, options, extra);
		if (!transformedOptions.content) transformedOptions.content = null;
		if (!transformedOptions.embed) transformedOptions.embed = null;
		return transformedOptions;
	}
}

module.exports = CommandUtil;
