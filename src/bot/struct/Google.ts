import fetch from 'node-fetch';
import { google } from 'googleapis';

const GOOGLE_MAPS_API_BASE_URL = 'https://maps.googleapis.com/maps/api';

const auth = google.auth.fromJSON({
	type: 'authorized_user',
	client_id: process.env.GOOGLE_CLIENT_ID!,
	client_secret: process.env.GOOGLE_CLIENT_SECRET!,
	refresh_token: process.env.GOOGLE_REFRESH_TOKEN!
});

const drive = google.drive({ version: 'v3', auth });
const sheet = google.sheets({ version: 'v4', auth });

export default {
	async location(query: string) {
		const search = new URLSearchParams({
			address: query,
			key: process.env.GOOGLE!
		}).toString();

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

		const search = new URLSearchParams({
			key: process.env.GOOGLE!,
			timestamp: (new Date().getTime() / 1000).toString()
		}).toString();

		const lat = location.geometry.location.lat;
		const lng = location.geometry.location.lng;

		const timezone = await fetch(`${GOOGLE_MAPS_API_BASE_URL}/timezone/json?${search}&location=${lat},${lng}`)
			.then(
				(res) =>
					res.json() as unknown as {
						rawOffset: string;
						dstOffset: string;
						timeZoneName: string;
						timeZoneId: string;
					}
			)
			.catch(() => null);

		if (!timezone) return null;
		return { location, timezone };
	},

	sheet() {
		return sheet;
	},

	drive() {
		return drive;
	},

	async publish(fileId: string) {
		return Promise.all([
			drive.permissions.create({
				requestBody: {
					role: 'reader',
					type: 'anyone'
				},
				fileId
			}),
			drive.revisions.update({
				requestBody: {
					publishedOutsideDomain: true,
					publishAuto: true,
					published: true
				},
				revisionId: '1',
				fields: '*',
				fileId
			})
		]);
	}
};
