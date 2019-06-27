const { db } = require('../struct/Database');
const Sequelize = require('sequelize');

const Clans = db.define('clans', {
	guild: {
		type: Sequelize.STRING,
		allowNull: false
	},
	user: {
		type: Sequelize.STRING,
		allowNull: false
	},
	channel: {
		type: Sequelize.STRING,
		allowNull: false
	},
	tag: {
		type: Sequelize.STRING,
		allowNull: false
	},
	name: {
		type: Sequelize.STRING,
		allowNull: true
	},
	tracking: {
		type: Sequelize.BOOLEAN,
		defaultValue: true
	},
	color: {
		type: Sequelize.STRING,
		defaultValue: '#5970C1'
	},
	createdAt: {
		type: Sequelize.DATE,
		defaultValue: Sequelize.NOW
	}
});

module.exports = Clans;
