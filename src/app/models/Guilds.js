const { db } = require('../struct/Database');
const Sequelize = require('sequelize');

const Guilds = db.define('guilds', {
	guild: {
		type: Sequelize.STRING,
		primaryKey: true,
		allowNull: false
	},
	settings: {
		type: Sequelize.JSONB,
		allowNull: false,
		default: {}
	}
});

module.exports = Guilds;
