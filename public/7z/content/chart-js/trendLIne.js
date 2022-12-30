/**
 * Minified by jsDelivr using Terser v5.10.0.
 * Original file: /npm/chartjs-plugin-trendline@1.0.2/src/chartjs-plugin-trendline.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
/*!
 * chartjs-plugin-trendline.js
 * Version: 1.0.2
 *
 * Copyright 2022 Marcus Alsterfjord
 * Released under the MIT license
 * https://github.com/Makanz/chartjs-plugin-trendline/blob/master/README.md
 *
 * Mod by: vesal: accept also xy-data so works with scatter
 */
var pluginTrendlineLinear = {
	id: 'chartjs-plugin-trendline',
	afterDatasetsDraw: function (t) {
		var i, e
		for (var s in t.scales)
			if (('x' == s[0] ? (e = t.scales[s]) : (i = t.scales[s]), e && i)) break
		var a = t.ctx
		t.data.datasets.forEach(function (i, s) {
			if (i.trendlineLinear && t.isDatasetVisible(s) && 0 != i.data.length) {
				var n = t.getDatasetMeta(s)
				addFitter(n, a, i, e, t.scales[n.yAxisID])
			}
		}),
			a.setLineDash([])
	},
}
function addFitter(t, i, e, s, a) {
	var n = e.trendlineLinear.style || e.borderColor,
		r = e.trendlineLinear.width || e.borderWidth,
		h = e.trendlineLinear.lineStyle || 'solid'
	;(n = void 0 !== n ? n : 'rgba(169,169,169, .6)'), (r = void 0 !== r ? r : 3)
	var u = new LineFitter(),
		o = e.data.length - 1,
		l = t.data[0].x,
		m = t.data[o].x,
		d = !1
	e.data && 'object' == typeof e.data[0] && (d = !0),
		e.data.forEach(function (t, i) {
			if (null != t)
				if ('time' === s.options.type) {
					var e = null != t.x ? t.x : t.t
					u.add(new Date(e).getTime(), t.y)
				} else d ? u.add(t.x, t.y) : u.add(i, t)
		})
	var x,
		c,
		f = s.getPixelForValue(u.minx),
		X = a.getPixelForValue(u.f(u.minx))
	if (e.trendlineLinear.projection && u.scale() < 0) {
		var g = u.fo()
		g < u.minx && (g = u.maxx),
			(x = s.getPixelForValue(g)),
			(c = a.getPixelForValue(u.f(g)))
	} else (x = s.getPixelForValue(u.maxx)), (c = a.getPixelForValue(u.f(u.maxx)))
	d || ((f = l), (x = m))
	var p = t.controller.chart.chartArea.bottom,
		v = t.controller.chart.width
	if (X > p) {
		var w = X - p,
			y = X - c
		;(X = p), (f += v * (w / y))
	} else if (c > p) {
		;(w = c - p), (y = c - X)
		;(c = p), (x = v - (x - (v - v * (w / y))))
	}
	;(i.lineWidth = r),
		'dotted' === h && i.setLineDash([2, 3]),
		i.beginPath(),
		i.moveTo(f, X),
		i.lineTo(x, c),
		(i.strokeStyle = n),
		i.stroke()
}
function LineFitter() {
	;(this.count = 0),
		(this.sumX = 0),
		(this.sumX2 = 0),
		(this.sumXY = 0),
		(this.sumY = 0),
		(this.minx = 1e100),
		(this.maxx = -1e100),
		(this.maxy = -1e100)
}
;(LineFitter.prototype = {
	add: function (t, i) {
		;(t = parseFloat(t)),
			(i = parseFloat(i)),
			this.count++,
			(this.sumX += t),
			(this.sumX2 += t * t),
			(this.sumXY += t * i),
			(this.sumY += i),
			t < this.minx && (this.minx = t),
			t > this.maxx && (this.maxx = t),
			i > this.maxy && (this.maxy = i)
	},
	f: function (t) {
		t = parseFloat(t)
		var i = this.count * this.sumX2 - this.sumX * this.sumX
		return (
			(this.sumX2 * this.sumY - this.sumX * this.sumXY) / i +
			t * ((this.count * this.sumXY - this.sumX * this.sumY) / i)
		)
	},
	fo: function () {
		var t = this.count * this.sumX2 - this.sumX * this.sumX
		return (
			-((this.sumX2 * this.sumY - this.sumX * this.sumXY) / t) /
			((this.count * this.sumXY - this.sumX * this.sumY) / t)
		)
	},
	scale: function () {
		var t = this.count * this.sumX2 - this.sumX * this.sumX
		return (this.count * this.sumXY - this.sumX * this.sumY) / t
	},
}),
	'undefined' != typeof window &&
		window.Chart &&
		(window.Chart.hasOwnProperty('register')
			? window.Chart.register(pluginTrendlineLinear)
			: window.Chart.plugins.register(pluginTrendlineLinear))
try {
	module.exports = exports = pluginTrendlineLinear
} catch (t) {}
//# sourceMappingURL=/sm/2e7dba28b31648ab00a97aa6406362bae64b9a7aca54e036bd56f1b62d4f8c44.map
