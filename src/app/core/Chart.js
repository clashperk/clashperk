const fetch = require('node-fetch');
const moment = require('moment');

class Chart {
	constructor(client) {
		this.client = client;
	}

	async build(data) {
		const dataSet = new Array(24).fill()
			.map((_, i) => {
				const decrement = new Date() - (60 * 60 * 1000 * i);
				const timeObj = new Date(decrement).toISOString();
				return {
					time: timeObj.substring(0, 14).concat('00'),
					count: 0
				};
			});

		for (const member of Object.values(data.members)) {
			if (!member.activities) continue;
			for (const date of Object.keys(member.activities)) {
				const item = dataSet.find(a => a.time === date);
				if (item) item.count += 1;
			}
		}

		return dataSet.map((a, i) => {
			const short = moment(new Date(a.time)).utcOffset('+05:30').format('kk:mm');
			return { short, time: a.time, count: a.count };
		});
	}

	async chart(body) {
		const res = await fetch('https://quickchart.io/chart/create', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: {
				'Content-Type': 'application/json'
			}
		});

		return res.buffer();
	}
}

module.exports = Chart;

