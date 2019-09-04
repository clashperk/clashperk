const { MessageEmbed } = require('discord.js');

const status_code = {
	504: 'Service is temprorarily unavailable.',
	400: 'Client provided incorrect parameters for the request.',
	403: 'Access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
	404: 'Invalid tag, resource was not found.',
	429: 'Request was throttled, because amount of requests was above the threshold defined for the used API token.',
	500: 'Unknown error happened when handling the request.',
	503: 'Service is temprorarily unavailable because of maintenance.'
};

class Constatns {
	static status(code) {
		return status_code[code];
	}

	static geterror(member, type) {
		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11)
			.setDescription([
				`Couldn't find a ${type} linked to **${member.user.tag}!**`,
				`Either provide a tag or link a ${type} to your Discord.`
			]);

		return embed;
	}

	static fetcherror(code) {
		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11)
			.setDescription([
				`${status_code[code]}`
			]);

		return embed;
	}
}

module.exports = Constatns;
