const { db } = require('../struct/Database');
const Sequelize = require('sequelize');

const Notes = db.define('notes', {
	guild: {
		type: Sequelize.STRING,
		allowNull: false
	},
	user: {
		type: Sequelize.STRING,
		allowNull: false
	},
	tag: {
		type: Sequelize.STRING,
		allowNull: false
	},
	note: {
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

module.exports = Notes;
