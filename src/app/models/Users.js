const { db } = require('../struct/Database');
const Sequelize = require('sequelize');

const Users = db.define('users', {
	user: {
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

module.exports = Users;
