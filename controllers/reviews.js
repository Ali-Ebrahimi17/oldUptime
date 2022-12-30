const Claim = require('../models/claim')
const Review = require('../models/review')

module.exports.createReview = async (req, res) => {
	const claim = await Claim.findById(req.params.id)
	const review = new Review(req.body.review)
	review.author = req.user._id
	createdAt = Date.now()
	claim.reviews.push(review)
	await review.save()
	await claim.save()
	req.flash('success', 'Update added')
	res.redirect(`/claims/4cshow/${claim._id}`)
}

module.exports.deleteReview = async (req, res) => {
	const { id, reviewId } = req.params
	const claim = await Claim.findById(req.params.id)
	await Claim.findByIdAndUpdate(id, { $pull: { reviews: reviewId } })
	await Review.findByIdAndDelete(reviewId)
	req.flash('success', 'Successfully deleted update')
	res.redirect(`/claims/4cshow/${claim._id}`)
}
