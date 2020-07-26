const fetch = require('node-fetch');
const moment = require('moment');

class Chart {
	constructor(client) {
		this.client = client;
	}

	build(data) {
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

		return dataSet.reverse().map((a, i) => {
			const time = moment(new Date(a.time)).utcOffset('+05:30').format('kk:mm');
			const short = (i + 1) % 2 === 0
				? time.includes('24') || time.includes('23')
					? moment(new Date(a.time)).utcOffset('+05:30').format('DD MMM')
					: time
				: '';
			return {
				short,
				count: a.count
			};
		});
	}

	async chart(data, color) {
		const collection = [];
		if (Array.isArray(data)) {
			for (const d of data) {
				collection.push({ name: d.name, data: this.build(d) });
			}
		} else {
			collection.push({ name: data.name, data: this.build(data) });
		}

		const colors = ['#266ef7', '#c63304', '#50c878'];

		const datasets = collection.map((obj, i) => ({
			label: obj.name,
			type: 'line',
			fill: false,
			backgroundColor: colors[i],
			borderColor: colors[i],
			borderWidth: 2,
			data: [...obj.data.map(d => d.count)]
		}));

		const body = {
			backgroundColor: 'white',
			width: 500,
			height: 300,
			format: 'png',
			chart: {
				type: 'bar',
				data: {
					labels: [...collection[0].data.map(d => d.short)],
					datasets
				},
				options: {
					responsive: true,
					legend: {
						position: 'top'
					},
					title: {
						display: false,
						text: ['Online Members Over Time']
					}
				}
			}
		};

		const res = await fetch('https://quickchart.io/chart', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		return res.buffer();
	}
}

module.exports = Chart;

