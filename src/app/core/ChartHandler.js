const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const { renderChart } = require('./ChartRender');
const { loadImage } = require('canvas');

class Chart {
	static build(data, offset) {
		const dataSet = new Array(24).fill()
			.map((_, i) => {
				const decrement = new Date() - (60 * 60 * 1000 * i);
				const timeObj = new Date(decrement).toISOString()
					.substring(0, 14)
					.concat('00');
				const id = data.entries.find(e => e.time === timeObj);
				if (id) return { time: id.time, count: id.count };
				return {
					time: timeObj,
					count: 0
				};
			});

		return dataSet.reverse().map((a, i) => {
			const time = new Date(new Date(a.time).getTime() + (offset * 1000));
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

	static async chart(data, timezone, color) {
		const collection = [];
		if (Array.isArray(data)) {
			for (const d of data) {
				collection.push({ name: d.name, data: this.build(d, timezone.offset) });
			}
		} else {
			collection.push({ name: data.name, data: this.build(data, timezone.offset) });
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
			devicePixelRatio: 2.0,
			format: 'png',
			chart: {
				type: 'bar',
				data: {
					labels: [...collection[0].data.map(d => d.short)],
					datasets: [...datasets]
				},
				options: {
					responsive: false,
					legend: {
						position: 'top',
						display: true,
						labels: {
							fontSize: 10,
							padding: 4
						}
					},
					title: {
						display: true,
						fontSize: 10,
						padding: 2,
						text: [`Online Members Per Hour (${timezone.name})`]
					}
				}
			}
		};

		const buffer = await this.buffer();
		return renderChart(body.width, body.height, body.backgroundColor, body.devicePixelRatio, body.chart, buffer);
	}

	static async growth(collection = []) {
		const body = {
			backgroundColor: 'white',
			width: 400,
			height: 250,
			devicePixelRatio: 2.0,
			format: 'png',
			chart: {
				type: 'bar',
				data: {
					labels: [...collection.map(d => `${months[d.date.getMonth()]} ${d.date.getDate()}`)],
					datasets: [
						{
							type: 'bar',
							label: 'Addition',
							backgroundColor: '#36a2eb80',
							borderColor: '#36a2eb',
							data: [...collection.map(d => d.value.addition)]
						},
						{
							type: 'bar',
							label: 'Deletion',
							backgroundColor: '#ff638480',
							borderColor: '#ff6384',
							data: [...collection.map(d => Math.abs(d.value.deletion))]
						},
						{
							type: 'line',
							label: 'Growth',
							backgroundColor: '#69c49a',
							borderColor: '#69c49a',
							fill: false,
							data: [...collection.map(d => d.value.deletion + d.value.addition)]
						}
					]
				},
				options: {
					responsive: false,
					legend: {
						position: 'top',
						display: true,
						labels: {
							fontSize: 10,
							padding: 4
						}
					},
					title: {
						display: true,
						fontSize: 10,
						padding: 2,
						text: [`Per day Growth (Last ${collection.length} days)`]
					}
				}
			}
		};

		const buffer = await this.buffer();
		return renderChart(body.width, body.height, body.backgroundColor, body.devicePixelRatio, body.chart, buffer);
	}

	static async buffer() {
		if (this.raw) return this.raw;
		this.raw = await loadImage('https://i.imgur.com/ilZtmTU.png');
		return this.raw;
	}
}

module.exports = Chart;

