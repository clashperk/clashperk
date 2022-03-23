import fetch from 'node-fetch';
import qs from 'querystring';

const GOOGLE_MAPS_API_BASE_URL = 'https://maps.googleapis.com/maps/api';

export default {
	async location(query: string) {
		const search = qs.stringify({
			address: query,
			key: process.env.GOOGLE
		});

		return fetch(`${GOOGLE_MAPS_API_BASE_URL}/geocode/json?${search}`)
			.then(
				(res) =>
					res.json() as unknown as {
						results: { geometry: { location: { lat: string; lng: string } }; formatted_address: string }[];
					}
			)
			.catch(() => null);
	},

	async timezone(query: string) {
		const location = (await this.location(query))?.results[0];
		if (!location) return null;

		const search = qs.stringify({
			key: process.env.GOOGLE,
			timestamp: new Date().getTime() / 1000
		});

		const lat = location.geometry.location.lat;
		const lng = location.geometry.location.lng;

		const timezone = await fetch(`${GOOGLE_MAPS_API_BASE_URL}/timezone/json?${search}&location=${lat},${lng}`)
			.then((res) => res.json())
			.catch(() => null);

		if (!timezone) return null;
		return { location, timezone };
	}
};
