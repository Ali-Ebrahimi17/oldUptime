module.exports.makePrediction = function(division, month) {
	console.log(division)
	console.log(month)
	return `the month is ${month}, the divsision is ${division}`
}
module.exports.index = async (req, res) => {
	const { division } = req.params
	const areas = await Area.find({ division: division }).sort({ name: '' })

	res.render('areas/all', { division, areas })
}
