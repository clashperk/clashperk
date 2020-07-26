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

		const newSet = dataSet.reverse().map((a, i) => {
			const short = moment(new Date(a.time)).utcOffset('+05:30').format('kk:mm');
			return { short, time: a.time, count: a.count };
		});

		return this.chart(newSet);
	}

	async chart(data = []) {
		const body = {
			backgroundColor: 'transparent',
			width: 500,
			height: 300,
			format: 'png',
			chart: {
				type: 'bar',
				data: {
					labels: [...data.map(a => a.short)],
					datasets: [
						{
							label: 'Online Members',
							type: 'line',
							fill: false,
							backgroundColor: 'rgba(255, 99, 132, 0.5)',
							borderColor: 'rgb(255, 99, 132)',
							borderWidth: 2,
							data: [...data.map(a => a.short)]
						}
					]
				},
				options: {
					responsive: true,
					legend: {
						position: 'top'
					},
					title: {
						display: true,
						text: ['Air Hounds']
					}
				}
			}
		};

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

