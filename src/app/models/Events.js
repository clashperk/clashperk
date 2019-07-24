const { db } = require('../struct/Database');
const Sequelize = require('sequelize');

const Events = db.define('events', {
	guild: {
		type: Sequelize.STRING,
		allowNull: false
	},
	user: {
		type: Sequelize.STRING,
		allowNull: false
	},
	time: {
		type: Sequelize.DATE,
		allowNull: false
	},
	name: {
		type: Sequelize.STRING,
		allowNull: true
	},
	action: {
		type: Sequelize.BOOLEAN,
		defaultValue: true
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

module.exports = Events;
