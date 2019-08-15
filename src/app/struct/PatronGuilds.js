const { Guild } = require('discord.js');
const { SequelizeProvider } = require('discord-akairo');

class SettingsProvider extends SequelizeProvider {
	constructor(table) {
		super(table, {
			idColumn: 'guild',
			dataColumn: 'settings'
		});
	}

	get(guild, key, defaultValue) {
		const id = this.constructor.getGuildID(guild);
		return super.get(id, key, defaultValue);
	}

	set(guild, key, value) {
		const id = this.constructor.getGuildID(guild);
		return super.set(id, key, value);
	}

	delete(guild, key) {
		const id = this.constructor.getGuildID(guild);
		return super.delete(id, key);
	}

	static getGuildID(guild) {
		if (guild instanceof Guild) return guild.id;
		if (typeof guild === 'string' && /^\d+$/.test(guild)) return guild;
		throw new TypeError('Invalid guild specified. Must be a Guild instance or guild ID.');
	}
}

module.exports = SettingsProvider;
