const mongoose = require('mongoose')
const Review = require('./review')
const path = require('path')
const coverImageBasepath = 'uploads'
const Schema = mongoose.Schema

const ClaimSchema = new Schema(
	{
		name: { type: String },
		linked: { type: Boolean },
		linkedTo: mongoose.Schema.Types.ObjectId,
		top50Linked: { type: Boolean },
		top50LinkedTo: mongoose.Schema.Types.ObjectId,
		top50LinkedClaims: [
			{
				type: Schema.Types.ObjectId,
			},
		],
		top50OpenedDate: { type: Date },
		top50ContainedDate: { type: Date },
		top50ClosedDate: { type: Date },
		level: { type: String },
		email: { type: String },
		importWeek: Number,
		joshNotes: { type: String },
		auditPassed: { type: String },
		cmn: { type: String },
		scc: { type: String },
		supplier: { type: String },
		partSupplier: { type: String },
		nameCount: { type: String },
		buildNumber: { type: String },
		claimNumber: { type: String },
		claimDate: { type: String },
		model: { type: String },
		amount: { type: String },
		baseModel: { type: String },
		postCutIn: { type: String },
		internal: { type: String },
		tPeriod: { type: String },
		onVideo: { type: String },
		customer: { type: String },
		fourC: { type: String },
		outcome: { type: String },
		leak: { type: String },
		leakasd: { type: String },
		asd: { type: String },
		notes: { type: String },
		grade: { type: String },
		image: { type: String },
		image1: { type: String },
		image2: { type: String },
		image3: { type: String },
		image4: { type: String },
		image5: { type: String },
		image6: { type: String },
		image7: { type: String },
		image8: { type: String },
		image9: { type: String },
		image10: { type: String },
		description: { type: String },
		area: { type: String },
		cabs: { type: String },
		detection: { type: String },
		vetted: { type: String },
		vettedBy: { type: String },
		vettedAt: { type: Date },
		closedBy: { type: String },
		reallocatedBy: { type: String },
		containedBy: { type: String },
		hours: { type: String },
		buildDate: { type: String },
		abcd: { type: String },
		failDate: { type: String },
		failedPart: { type: String },
		partCount: { type: String },
		wasPickedUp: { type: String },
		canBePickedUp: { type: String },
		failedAt: { type: String },
		dCode: { type: String },
		dealer: { type: String },
		partSupplier: { type: String },
		cost: Number,
		country: { type: String },
		serviceRes: { type: String },
		serviceResBy: { type: String },
		serviceResAt: { type: Date },
		reOpenedAt: { type: Date },
		reOpenedBy: { type: String },
		actioned: { type: String },
		containCutIn: { type: String },
		reason: { type: String },
		closeCutIn: { type: String },
		line: { type: String },
		isAg: { type: String },
		inspector: { type: String },
		failuremode: { type: String },
		failuretype: { type: String },
		buildmonth: { type: String },
		importedDate: { type: Date },
		importDate: { type: String },
		pVal: { type: String },
		cSop: { type: String },
		sMatrix: { type: String },
		qAlert: { type: String },
		ySweep: { type: String },
		containNotes: { type: String },
		containUpdate: { type: String },
		containUpdateBy: { type: String },
		containUpdateAt: { type: Date },
		counterWhyNotes: { type: String },
		counterWhatNotes: { type: String },
		rootCause: { type: String },
		qSmart: { type: String },
		warranty: { type: String },
		sOff: { type: String },
		closeNotes: { type: String },
		sopNumber: { type: String },
		status: { type: String },
		audited: { type: String },
		tToolR: { type: String },
		tToolBu: { type: String },
		lPart: { type: String },
		ttSop: { type: String },
		ttCorrect: { type: String },
		concern: { type: String },
		rag: { type: String },
		asdJosh: { type: String },
		sccJosh: { type: String },
		containJosh: { type: String },
		action: { type: String },
		champion: { type: String },
		closureDate: { type: String },
		createdAt: { type: Date, default: Date.now },
		containedAt: { type: Date },
		closedAt: { type: Date },
		reallocatedAt: { type: Date },
		auditedBy: { type: String },
		auditedAt: { type: Date },
		division: { type: String },
		componentInternal: { type: String },
		cabsRag: { type: String },
		closureDateCabs: { type: String },
		asdCabs: { type: String },
		sccCabs: { type: String },
		actionCabs: { type: String },
		championCabs: { type: String },
		concernCabs: { type: String },
		containCabs: { type: String },
		active: { type: Boolean, default: true },
		points: { type: String },
		linkedClaims: [
			{
				type: Schema.Types.ObjectId,
			},
		],
		author: {
			id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
			username: {
				type: String,
			},
			firstName: {
				type: String,
			},
			lastName: {
				type: String,
			},
		},
		reviews: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Review',
			},
		],
	},
	{ timestamps: true }
)

ClaimSchema.post('findOneAndDelete', async function (doc) {
	if (doc) {
		await Review.deleteMany({
			_id: {
				$in: doc.reviews,
			},
		})
	}
})

ClaimSchema.virtual('imagePath1').get(function () {
	if (this.image1 != null) {
		return path.join('/', coverImageBasepath, this.image1)
	}
})
ClaimSchema.virtual('imagePath2').get(function () {
	if (this.image2 != null) {
		return path.join('/', coverImageBasepath, this.image2)
	}
})
ClaimSchema.virtual('imagePath3').get(function () {
	if (this.image3 != null) {
		return path.join('/', coverImageBasepath, this.image3)
	}
})
ClaimSchema.virtual('imagePath4').get(function () {
	if (this.image4 != null) {
		return path.join('/', coverImageBasepath, this.image4)
	}
})
ClaimSchema.virtual('imagePath5').get(function () {
	if (this.image5 != null) {
		return path.join('/', coverImageBasepath, this.image5)
	}
})
ClaimSchema.virtual('imagePath6').get(function () {
	if (this.image6 != null) {
		return path.join('/', coverImageBasepath, this.image6)
	}
})
ClaimSchema.virtual('imagePath7').get(function () {
	if (this.image7 != null) {
		return path.join('/', coverImageBasepath, this.image7)
	}
})
ClaimSchema.virtual('imagePath8').get(function () {
	if (this.image8 != null) {
		return path.join('/', coverImageBasepath, this.image8)
	}
})
ClaimSchema.virtual('imagePath9').get(function () {
	if (this.image9 != null) {
		return path.join('/', coverImageBasepath, this.image9)
	}
})
ClaimSchema.virtual('imagePath10').get(function () {
	if (this.image10 != null) {
		return path.join('/', coverImageBasepath, this.image10)
	}
})

module.exports = mongoose.model('Claim', ClaimSchema)
