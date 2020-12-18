const fetch = require('node-fetch');
const qs = require('querystring');

class Google {
	static async location(query) {
		const search = qs.stringify({
			address: query,
			key: process.env.GOOGLE
		});
		const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${search}`)
			.catch(() => null);

		if (!res?.ok) return null;
		const data = await res.json();
		if (data.status !== 'OK') return null;

		return data;
	}

	static async timezone(query) {
		const raw = await this.location(query);
		if (!raw) return null;
		const location = raw.results[0];
		if (!location) return null;
		const search = qs.stringify({
			key: process.env.GOOGLE,
			timestamp: new Date() / 1000
		});

		const lat = location.geometry.location.lat;
		const lng = location.geometry.location.lng;

		const res = await fetch(
			`https://maps.googleapis.com/maps/api/timezone/json?${search}&location=${lat},${lng}`
		).catch(() => null);

		if (!res?.ok) return null;
		const data = await res.json();

		return { location: raw, timezone: data };
	}
}

module.exports = Google;
