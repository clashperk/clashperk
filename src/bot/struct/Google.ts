import fetch from 'node-fetch';
import qs from 'querystring';

export default {
	async location(query: any) {
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
	},

	async timezone(query: any) {
		const raw = await this.location(query);
		if (!raw) return null;
		const location = raw.results[0];
		if (!location) return null;
		const search = qs.stringify({
			key: process.env.GOOGLE,
			timestamp: new Date().getTime() / 1000
		});

		const lat = location.geometry.location.lat as string;
		const lng = location.geometry.location.lng as string;

		const res = await fetch(
			`https://maps.googleapis.com/maps/api/timezone/json?${search}&location=${lat},${lng}`
		).catch(() => null);

		if (!res?.ok) return null;
		const data = await res.json();

		return { location: raw, timezone: data };
	}
};
