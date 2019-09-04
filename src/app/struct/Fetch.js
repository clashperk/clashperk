const fetch = require('node-fetch');
const { status } = require('../util/constants');

class Fetch {
	static async player(str) {
		const tag = `#${str.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET', timeout: 3000, headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		}).catch(() => null);

		if (!res) return { status: 504, error: status(504) };
		if (!res.ok) return { status: res.status || 504, error: status(res.status || 504) };
		const data = await res.json();
		return this.assign(200, data);
	}

	static async clan(str) {
		const tag = `#${str.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET', timeout: 3000, headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		}).catch(() => null);

		if (!res) return { status: 504, error: status(504) };
		if (!res.ok) return { status: res.status || 504, error: status(res.status || 504) };
		const data = await res.json();
		return this.assign(200, data);
	}

	static assign(num, data) {
		const object = { status: num };
		return Object.assign(object, data);
	}
}

module.exports = Fetch;
