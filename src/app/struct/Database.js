const path = require('path');
const readdir = require('util').promisify(require('fs').readdir);
const Sequelize = require('sequelize');

const db = new Sequelize(process.env.POSTGRES, { logging: false });

class Database {
	static get db() {
		return db;
	}

	static async authenticate() {
		try {
			await db.authenticate();
			console.log('DATABASE INSTANCE CONNECTED');
			await this.loadModels(path.join(__dirname, '..', 'models'));
		} catch (err) {
			console.error('UNABLE TO CONNECT TO THE DATABASE INSTANCE');
			console.log('RECONNECTING AGAIN IN 5 SECONDS');
			setTimeout(this.authenticate.bind(this), 5000);
		}
	}

	static async loadModels(modelsPath) {
		const files = await readdir(modelsPath);
		for (const file of files) {
			const filePath = path.join(modelsPath, file);
			if (!filePath.endsWith('.js')) continue;
			await require(filePath).sync({ alter: true });
		}
	}
}

module.exports = Database;
