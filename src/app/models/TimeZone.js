const { db } = require('../struct/Database');
const Sequelize = require('sequelize');

const TimeZone = db.define('timezone', {
	guild: {
		type: Sequelize.STRING,
		allowNull: false
	},
	user: {
		type: Sequelize.STRING,
		allowNull: false
	},
	timezone: {
		type: Sequelize.STRING,
		allowNull: false
	},
	createdAt: {
		type: Sequelize.DATE,
		defaultValue: Sequelize.NOW
	},
	updatedAt: {
		type: Sequelize.DATE,
		defaultValue: Sequelize.NOW
	}
});

module.exports = TimeZone;
