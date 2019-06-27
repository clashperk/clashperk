const { db } = require('../struct/Database');
const Sequelize = require('sequelize');

const Profile = db.define('profile', {
	user: {
		type: Sequelize.STRING,
		allowNull: false
	},
	guild: {
		type: Sequelize.STRING,
		allowNull: false
	},
	tag: {
		type: Sequelize.STRING,
		allowNull: true
	},
	name: {
		type: Sequelize.STRING,
		allowNull: true
	},
	clan_tag: {
		type: Sequelize.STRING,
		allowNull: true
	},
	clan_name: {
		type: Sequelize.STRING,
		allowNull: true
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

module.exports = Profile;
