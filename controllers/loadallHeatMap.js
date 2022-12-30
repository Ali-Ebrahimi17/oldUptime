const Claim = require('../models/claim')
const Sip = require('../models/sip')
const QSmart = require('../models/qSmart')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.heatMapClaims = async (req, res) => {
	const { division, area, type } = req.params

	const periods = ['DOA', 'T000', 'T001', 'T002', 'T003']

	let types = []
	let modes = []

	if (type === 'Leaks') {
		types = ['O Ring', 'Loose Hose/Adaptor', 'Leaking', 'Ram seal leak']
		modes = ['Hydraulic']
	}
	if (type === 'Electrics') {
		types = [
			'Clip up Electrical',
			'Failed Battery',
			'Gouged/Scored/Cut',
			'Harness Connectivity',
			'Harness Routing',
			'Loose',
			'Low Pressure',
			'Misaligned/Assy/Loose',
			'Not Built To Spec',
			'Not Fitted Correctly',
			'Open Circuit',
			'Over Charged',
			'Over Tightened',
			'Part Failure',
			'Routing',
			'Short Circuit',
			'Short Circuit/Burn Out',
			'Software',
			'Software Update',
			'Unconnected',
			'Unconnected/Open Circuit',
			'Water in Connector',
			'Wiring damage',
		]
		modes = ['Electrics']
	}

	const claims = await Claim.aggregate([
		{
			$match: {
				area: area,
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],

				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
		{ $sort: { tPeriod: 1 } },
	])

	const numb = claims.length

	res.render('claims/vettedHeatmap', { division, claims, numb, type, area })
}

module.exports.heatMap = async (req, res) => {
	const { division, type } = req.params

	const periods = ['DOA', 'T000', 'T001', 'T002', 'T003']

	let types = []
	let modes = []

	if (type === 'Leaks') {
		types = ['O Ring', 'Loose Hose/Adaptor', 'Leaking', 'Ram seal leak']
		modes = ['Hydraulic']
	}
	if (type === 'Electrics') {
		types = [
			'Clip up Electrical',
			'Failed Battery',
			'Gouged/Scored/Cut',
			'Harness Connectivity',
			'Harness Routing',
			'Loose',
			'Low Pressure',
			'Misaligned/Assy/Loose',
			'Not Built To Spec',
			'Not Fitted Correctly',
			'Open Circuit',
			'Over Charged',
			'Over Tightened',
			'Part Failure',
			'Routing',
			'Short Circuit',
			'Short Circuit/Burn Out',
			'Software',
			'Software Update',
			'Unconnected',
			'Unconnected/Open Circuit',
			'Water in Connector',
			'Wiring damage',
		]
		modes = ['Electrics']
	}
	const zone7Rec = await Claim.aggregate([
		{
			$match: {
				area: 'Zone 7 Rec',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const RollingRoad = await Claim.aggregate([
		{
			$match: {
				area: 'Rolling Road',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const Zone7 = await Claim.aggregate([
		{
			$match: {
				area: 'Zone 7',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const kitting = await Claim.aggregate([
		{
			$match: {
				area: 'Kitting',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const booms = await Claim.aggregate([
		{
			$match: {
				area: 'Booms',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const engineSubs = await Claim.aggregate([
		{
			$match: {
				area: 'Engine Subs',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const axleSubs = await Claim.aggregate([
		{
			$match: {
				area: 'Axle Subs',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const cabs = await Claim.aggregate([
		{
			$match: {
				area: 'Cabs Systems',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const cycleTest = await Claim.aggregate([
		{
			$match: {
				area: 'Cycle Test',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const pdi = await Claim.aggregate([
		{
			$match: {
				area: 'PDI',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const track3Zone2 = await Claim.aggregate([
		{
			$match: {
				area: 'Track 3 Zone 2',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const track3Zone1 = await Claim.aggregate([
		{
			$match: {
				area: 'Track 3 Zone 1',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const overHeads = await Claim.aggregate([
		{
			$match: {
				area: 'Overheads',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const paintPlant = await Claim.aggregate([
		{
			$match: {
				area: 'Paint Plant',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const transmissions = await Claim.aggregate([
		{
			$match: {
				area: 'Transmissions',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const attachments = await Claim.aggregate([
		{
			$match: {
				area: 'Attachments',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const track1Zone6 = await Claim.aggregate([
		{
			$match: {
				area: 'Track 1 - Zone 6',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const track1Zone5 = await Claim.aggregate([
		{
			$match: {
				area: 'Track 1 - Zone 5',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const track1Zone4 = await Claim.aggregate([
		{
			$match: {
				area: 'Track 1 - Zone 4',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const track1Zone3 = await Claim.aggregate([
		{
			$match: {
				area: 'Track 1 - Zone 3',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const track1Zone2 = await Claim.aggregate([
		{
			$match: {
				area: 'Track 1 - Zone 2',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const t4Exhaust = await Claim.aggregate([
		{
			$match: {
				area: 'T4 Exhaust Sub',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const hbu = await Claim.aggregate([
		{
			$match: {
				area: 'HBU',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const cfc = await Claim.aggregate([
		{
			$match: {
				area: 'CFC',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const radSubs = await Claim.aggregate([
		{
			$match: {
				area: 'Rad Subs',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const compactBooms = await Claim.aggregate([
		{
			$match: {
				area: 'Compact Booms',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const axle516 = await Claim.aggregate([
		{
			$match: {
				area: '516 Axle',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const qhSubs = await Claim.aggregate([
		{
			$match: {
				area: 'Quickhitch Subs',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const legSubs = await Claim.aggregate([
		{
			$match: {
				area: 'Leg Subs',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const cleanRoom = await Claim.aggregate([
		{
			$match: {
				area: 'Clean Room',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const ramSubs = await Claim.aggregate([
		{
			$match: {
				area: 'Ram Subs',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const fabrication = await Claim.aggregate([
		{
			$match: {
				area: 'Fabrication',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const supplierQuality = await Claim.aggregate([
		{
			$match: {
				area: 'Supplier Quality',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])
	const powerSystems = await Claim.aggregate([
		{
			$match: {
				area: 'Powersystems',
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
	])

	res.render('dash/loadallHeatMap', {
		division,
		type,
		zone7Rec,
		RollingRoad,
		Zone7,
		kitting,
		booms,
		engineSubs,
		axleSubs,
		cabs,
		cycleTest,
		pdi,
		track3Zone2,
		track3Zone1,
		overHeads,
		paintPlant,
		transmissions,
		attachments,
		track1Zone6,
		track1Zone5,
		track1Zone4,
		track1Zone3,
		track1Zone2,
		t4Exhaust,
		hbu,
		cfc,
		radSubs,
		compactBooms,
		axle516,
		qhSubs,
		legSubs,
		cleanRoom,
		ramSubs,
		fabrication,
		supplierQuality,
		powerSystems,
	})
}

const theZones = [
	'Boom Sub Assembly LDL',
	'SIP 1',
	'SIP 2 NEW',
	'SIP 3 NEW',
	'SIP 4 NEW',
	'SIP 5 NEW',
	'SIP 6 NEW',
	'Track 3 SIP 1 - P42',
	'T3 SIP 1',
	'Track 3 SIP 1',
	'Track 3 SIP 2 - P42',
	'T3 SIP 2',
	'Track 3 SIP 2',
	'UV 1 Ldl',
	'SIP SPEC Ldl',
	'Z7 Electrical Test',
]

module.exports.internalHeatmap = async (req, res) => {
	const { division, type } = req.params

	if (req.body.startDate && req.body.endDate) {
		newStartTimeFormat = moment(req.body.startDate).format(
			`YYYY-MM-DDT${req.body.startTime}:00.000Z`
		)

		newEndTimeFormat = moment(req.body.endDate).format(
			`YYYY-MM-DDT${req.body.endTime}:00.000Z`
		)
	} else {
		newStartTimeFormat = moment().format(`YYYY-MM-DDT00:00:00.000Z`)

		newEndTimeFormat = moment().format(`YYYY-MM-DDT23:59:00.000Z`)
	}

	const startTime = new Date(newStartTimeFormat)
	const endTime = new Date(newEndTimeFormat)

	let axles = [
		'Transmissions (Gearbox)',
		'Transmissions (Axles)',
		'Transmissions (Consolidated)',
	]

	const zone7Rec = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Machining Manufacturing',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})

	const RollingRoad = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Rolling Road',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})

	const Zone7 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Zone 7 Ldl',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const kitting = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Kitting',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const booms = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Boom Sub Assembly',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})

	const engineSubs = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Engine Sub Assembly',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const axleSubs = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Axle Sub Assembly',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const cabs = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Cab Systems',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const inners = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Inner Boom Manufacturing',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const pdi = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'PDI',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const track3Zone2 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Track 3 Zone 2',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const track3Zone1 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Track 3 Zone 1',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const overHeads = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Zone 1 Ldl',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const paintPlant = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Shot & Paint',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const transmissions = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: { $in: axles },
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const outers = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Outer Boom Manufacturing',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const track1Zone6 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Zone 6 Ldl',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const track1Zone5 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Zone 5 Ldl',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const track1Zone4 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Zone 4 Ldl',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const track1Zone3 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Zone 3 Ldl',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const track1Zone2 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Zone 2 Ldl',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const t4Exhaust = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'T4F Sub Assembly',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const hbu = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Hydraulic Business Unit',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const manufacturing = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Chassis Manufacturing',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const radSubs = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Cooling Pack Sub Assembly',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const compactBooms = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Compact Booms',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const axle516 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: '516 Axle',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const qhSubs = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'QH Subs',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const legSubs = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Leg Sub Assembly',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const cleanRoom = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Clean Room',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const ramSubs = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Ram Sub Assembly',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const fabrication = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Fabrication Manufacturing',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const supplierQuality = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Supplier Quality',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const powerSystems = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'Power Systems',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})
	const uv1 = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [
			{ ['Created Date']: { $gt: startTime } },
			{ ['Created Date']: { $lt: endTime } },
		],
		['Fault Area']: 'UV1',
		['Fault Code']: { $ne: 'Shortage' },
		Zone: { $in: theZones },
	})

	res.render('dash/internalHeatmap', {
		division,
		startTime,
		endTime,
		inners,
		outers,
		uv1,
		manufacturing,
		zone7Rec,
		RollingRoad,
		Zone7,
		kitting,
		booms,
		engineSubs,
		axleSubs,
		cabs,
		pdi,
		track3Zone2,
		track3Zone1,
		overHeads,
		paintPlant,
		transmissions,
		track1Zone6,
		track1Zone5,
		track1Zone4,
		track1Zone3,
		track1Zone2,
		t4Exhaust,
		hbu,
		radSubs,
		compactBooms,
		axle516,
		qhSubs,
		legSubs,
		cleanRoom,
		ramSubs,
		fabrication,
		supplierQuality,
		powerSystems,
	})
}

module.exports.internalHeatMapFaults = async (req, res) => {
	const { division, area } = req.params

	if (req.body.startDate && req.body.endDate) {
		newStartTimeFormat = moment(req.body.startDate).format(
			`YYYY-MM-DDT${req.body.startTime}:00.000Z`
		)

		newEndTimeFormat = moment(req.body.endDate).format(
			`YYYY-MM-DDT${req.body.endTime}:00.000Z`
		)
	} else {
		newStartTimeFormat = moment().format(`YYYY-MM-DDT00:00:00.000Z`)

		newEndTimeFormat = moment().format(`YYYY-MM-DDT23:59:00.000Z`)
	}

	const startTime = new Date(newStartTimeFormat)
	const endTime = new Date(newEndTimeFormat)
	let areas = []

	if (area === 'Transmissions') {
		areas = [
			'Transmissions (Gearbox)',
			'Transmissions (Axles)',
			'Transmissions (Consolidated)',
		]
	} else {
		areas = [area]
	}

	const faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				$and: [
					{ ['Created Date']: { $gt: startTime } },
					{ ['Created Date']: { $lt: endTime } },
				],
				['Fault Area']: { $in: areas },
				['Fault Code']: { $ne: 'Shortage' },
				Zone: { $in: theZones },
			},
		},
		{ $sort: { ['Created Date']: -1 } },
	])

	const numb = faults.length

	res.render('dash/internalHeatmapFaults', {
		division,
		faults,
		numb,
		area,
	})
}

module.exports.heatMapCabsClaims = async (req, res) => {
	division = 'LDL'

	res.render('dash/loadallHeatMapCabsClaims', {})
}
