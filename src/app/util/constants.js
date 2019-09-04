const { MessageEmbed } = require('discord.js');

module.exports = {
	STATUS: {
		504: 'service is temprorarily unavailable.',
		400: 'client provided incorrect parameters for the request.',
		403: 'access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
		404: 'invalid tag, resource was not found.',
		429: 'request was throttled, because amount of requests was above the threshold defined for the used API token.',
		500: 'unknown error happened when handling the request.',
		503: 'service is temprorarily unavailable because of maintenance.'
	},

	reply: (message, member, type) => {
		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setDescription([
				`Could not find a ${type} linked to **${member.user.tag}!**`,
				`Either provide a tag or link a ${type} to your Discord.`
			]);
		return embed;
	}
};
