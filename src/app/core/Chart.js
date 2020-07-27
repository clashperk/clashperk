const fetch = require('node-fetch');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class Chart {
	static build(data) {
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
			const time = new Date(new Date(a.time).getTime() + (330 * 60 * 1000));
			let hour = this.parse(time);
			if (time.getHours() === 0) hour = this.parse(time, time.getMonth());
			if (time.getHours() === 1) hour = this.parse(time, time.getMonth());

			return {
				short: (i + 1) % 2 === 0 ? hour : '',
				count: a.count
			};
		});
	}

	static parse(time, month = null) {
		const hour = time.getHours();
		const min = time.getMinutes();
		const date = time.getDate();
		if (month) return `${date.toString().padStart(2, '0')} ${months[month]}`;
		return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
	}

	static async chart(data, color) {
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
			pointBorderColor: colors[i],
			pointBackgroundColor: colors[i],
			pointRadius: 2,
			data: [...obj.data.map(d => d.count)]
		}));

		const body = {
			backgroundColor: color ? 'transparent' : 'white',
			width: 500,
			height: 300,
			format: 'png',
			chart: {
				type: 'bar',
				data: {
					labels: [...collection[0].data.map(d => d.short)],
					datasets: [...datasets]
				},
				options: {
					responsive: true,
					legend: {
						position: 'top',
						display: collection.length > 1 ? true : false
					},
					title: {
						display: collection.length > 1 ? false : true,
						text: [`${collection[0].name}`]
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

