const chartAnnotations = require('chartjs-plugin-annotation');
const chartBoxViolinPlot = require('chartjs-chart-box-and-violin-plot');
const chartDataLabels = require('chartjs-plugin-datalabels');
const chartRadialGauge = require('chartjs-chart-radial-gauge');
const { CanvasRenderService } = require('chartjs-node-canvas');

// require('chartjs-plugin-piechart-outlabels');
// require('chartjs-plugin-doughnutlabel');
// require('chartjs-plugin-colorschemes');
// require('chart.js');

const DEFAULT_COLORS = {
	blue: '#4D89F9',
	green: '#00B88A',
	orange: '#ffa040',
	red: '#ff6384',
	purple: '#99cbcf',
	yellow: '#fc3',
	grey: '#c9cbcf'
};

const ROUND_CHART_TYPES = new Set([
	'pie',
	'doughnut',
	'polarArea',
	'outlabeledPie',
	'outlabeledDoughnut'
]);

const BOXPLOT_CHART_TYPES = new Set(['boxplot', 'horizontalBoxplot', 'violin', 'horizontalViolin']);
const DEFAULT_COLOR_WHEEL = Object.values(DEFAULT_COLORS);
const MAX_HEIGHT = process.env.CHART_MAX_HEIGHT || 3000;
const MAX_WIDTH = process.env.CHART_MAX_WIDTH || 3000;

const rendererCache = {};

function getRenderer(width, height) {
	if (width > MAX_WIDTH) {
		width = 3000;
	}
	if (height > MAX_HEIGHT) {
		height = 3000;
	}

	const key = [width, height];
	if (!rendererCache[key]) {
		rendererCache[key] = new CanvasRenderService(width, height);
	}
	return rendererCache[key];
}

function addBackgroundColors(chart) {
	if (chart.options && chart.options.plugins && chart.options.plugins.colorschemes) {
		return;
	}
	if (chart.data && chart.data.datasets && Array.isArray(chart.data.datasets)) {
		chart.data.datasets.forEach((dataset, dataIdx) => {
			const data = dataset;
			if (!data.backgroundColor) {
				if (ROUND_CHART_TYPES.has(chart.type)) {
					// Return a color for each value.
					data.backgroundColor = data.data.map(
						(_, colorIdx) => DEFAULT_COLOR_WHEEL[colorIdx % DEFAULT_COLOR_WHEEL.length]
					);
				} else {
					// Return a color for each data.
					data.backgroundColor = DEFAULT_COLOR_WHEEL[dataIdx % DEFAULT_COLOR_WHEEL.length];
				}
			}
		});
	}
}

function renderChart(width, height, backgroundColor, devicePixelRatio, chart) {
	chart.options = chart.options || {};

	if (chart.type === 'donut') {
		// Fix spelling...
		chart.type = 'doughnut';
	}

	if (chart.type === 'sparkline') {
		if (chart.data.datasets.length > 1) {
			return Promise.reject(
				new Error('"sparkline" only supports 1 line. Use "line" chart type for multiple lines.')
			);
		}
		if (chart.data.datasets.length < 1) {
			return Promise.reject(new Error('"sparkline" requres 1 dataset'));
		}
		chart.type = 'line';
		const dataseries = chart.data.datasets[0].data;
		if (!chart.data.labels) {
			chart.data.labels = Array(dataseries.length);
		}
		chart.options.legend = chart.options.legend || { display: false };
		if (!chart.options.elements) {
			chart.options.elements = {};
		}
		chart.options.elements.line = chart.options.elements.line || {
			borderColor: '#000',
			borderWidth: 1
		};
		chart.options.elements.point = chart.options.elements.point || {
			radius: 0
		};
		if (!chart.options.scales) {
			chart.options.scales = {};
		}

		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;
		for (let i = 0; i < dataseries.length; i += 1) {
			const dp = dataseries[i];
			min = Math.min(min, dp);
			max = Math.max(max, dp);
		}

		chart.options.scales.xAxes = chart.options.scales.xAxes || [{ display: false }];
		chart.options.scales.yAxes = chart.options.scales.yAxes || [
			{
				display: false,
				ticks: {
					// Offset the min and max slightly so that pixels aren't shaved off
					// under certain circumstances.
					min: (min - min) * 0.05,
					max: (max + max) * 0.05
				}
			}
		];
	}

	// Choose retina resolution by default. This will cause images to be 2x size
	// in absolute terms.
	chart.options.devicePixelRatio = devicePixelRatio || 2.0;

	// Implement other default options
	if (
		chart.type === 'bar' ||
		chart.type === 'horizontalBar' ||
		chart.type === 'line' ||
		chart.type === 'scatter' ||
		chart.type === 'bubble'
	) {
		if (!chart.options.scales) {
			// TODO(ian): Merge default options with provided options
			chart.options.scales = {
				yAxes: [
					{
						ticks: {
							beginAtZero: true
						}
					}
				]
			};
		}
		addBackgroundColors(chart);
	} else if (chart.type === 'radar') {
		addBackgroundColors(chart);
	} else if (ROUND_CHART_TYPES.has(chart.type)) {
		addBackgroundColors(chart);
	} else if (chart.type === 'scatter') {
		addBackgroundColors(chart);
	} else if (chart.type === 'bubble') {
		addBackgroundColors(chart);
	}

	if (chart.type === 'line') {
		chart.data.datasets.forEach(dataset => {
			const data = dataset;
			// Make line charts straight lines by default.
			data.lineTension = data.lineTension || 0;
		});
	}

	chart.options.plugins = chart.options.plugins || {};
	let usingDataLabelsDefaults = false;
	if (!chart.options.plugins.datalabels) {
		usingDataLabelsDefaults = true;
		chart.options.plugins.datalabels = {};
		if (chart.type === 'pie' || chart.type === 'doughnut') {
			chart.options.plugins.datalabels = {
				display: true
			};
		} else {
			chart.options.plugins.datalabels = {
				display: false
			};
		}
	}

	if (ROUND_CHART_TYPES.has(chart.type) || chart.type === 'radialGauge') {
		global.Chart = require('chart.js');
		// These requires have side effects.
		require('chartjs-plugin-piechart-outlabels');
		if (chart.type === 'doughnut') {
			require('chartjs-plugin-doughnutlabel');
		}
		let userSpecifiedOutlabels = false;
		chart.data.datasets.forEach(dataset => {
			if (dataset.outlabels || chart.options.plugins.outlabels) {
				userSpecifiedOutlabels = true;
			} else {
				// Disable outlabels by default.
				dataset.outlabels = { display: false };
			}
		});

		if (userSpecifiedOutlabels && usingDataLabelsDefaults) {
			// If outlabels are enabled, disable datalabels by default.
			chart.options.plugins.datalabels = {
				display: false
			};
		}
	}
	if (chart.options && chart.options.plugins && chart.options.plugins.colorschemes) {
		global.Chart = require('chart.js');
		require('chartjs-plugin-colorschemes');
	}

	if (!chart.plugins) {
		chart.plugins = [chartDataLabels, chartAnnotations];
		if (chart.type === 'radialGauge') {
			chart.plugins.push(chartRadialGauge);
		}
		if (BOXPLOT_CHART_TYPES.has(chart.type)) {
			chart.plugins.push(chartBoxViolinPlot);
		}
	}

	// Background color plugin
	chart.plugins.push({
		id: 'background',
		beforeDraw: chartInstance => {
			if (backgroundColor) {
				const { ctx } = chartInstance.chart;
				ctx.fillStyle = backgroundColor;
				ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
				ctx.font = '8px sans-serif';
				ctx.fillStyle = '#666';
				ctx.fillText('© ClashPerk', 440, 18);
			}
		}
	});

	// Pad below legend plugin
	if (chart.options.plugins.padBelowLegend) {
		chart.plugins.push({
			id: 'padBelowLegend',
			beforeInit: (chartInstance, val) => {
				global.Chart.Legend.prototype.afterFit = () => {
					this.height += Number(val) || 0;
				};
			}
		});
	}

	const canvasRenderService = getRenderer(width, height);

	try {
		return canvasRenderService.renderToBuffer(chart);
	} catch (err) {
		// canvasRenderService doesn't seem to be throwing errors correctly for
		// certain chart errors.
		return Promise.reject(err.message || err);
	}
}

module.exports = { renderChart };
