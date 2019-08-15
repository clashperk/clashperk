const Guilds = require('../models/Guilds');
const Users = require('../models/Users');
const PatronUsers = require('../struct/PatronUsers');
const PatronGuilds = require('../struct/PatronGuilds');

class Patron {
	constructor(client, {} = {}) {
		this.client = client;
		this.users = new PatronUsers(Users);
		this.guilds = new PatronGuilds(Guilds);
	}

	async init() {
		await this.users.init();
		await this.guilds.init();
	}

	users() {
		return this.users;
	}

	guilds() {
		return this.guilds;
	}
}

module.exports = Patron;
