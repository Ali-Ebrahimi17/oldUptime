const Claim = require('../models/claim');
const Inspector = require('../models/inspector');
const Area = require('../models/area');
const FailureMode = require('../models/failuremode');
const FailureType = require('../models/failuretype');
const BuildMonth = require('../models/buildmonth');
const Detection = require('../models/detection');
const Model = require('../models/models');
const Throughput = require('../models/throughput');
const fetch = require('node-fetch');
const axios = require('axios');

const moment = require('moment');

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

let startDate = moment().subtract(0, 'months').format('YYYY/MM/01/00/00');
let endDate = moment().format('YYYY/MM/DD/kk/mm');
let startOfToday = moment().format('YYYY/MM/DD/00/00');

let tester = moment().add(1, 'days').format('YYYY/MM/DD/00/00');

console.log(tester);

function remove_duplicates(a, b) {
	for (let i = 0, len = a.length; i < len; i++) {
		for (let j = 0, len2 = b.length; j < len2; j++) {
			if (a[i].buildNo === b[j].buildNo) {
				b.splice(j, 1);
				len2 = b.length;
			}
		}
	}
}

module.exports.dpu = async (req, res) => {
	const { division } = req.params;
	let stage19r = [];
	let stage20r = [];
	let stage21r = [];
	let stage25 = [];
	let signedOutAll = [];
	let div = 19;
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	axios
		.all([
			axios.get(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/19/${startDate}/${endDate}`),
			axios.get(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/19/${startDate}/${endDate}`),
			axios.get(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/19/${startDate}/${endDate}`),
			axios.get(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/25/${startOfToday}/${endDate}`),
			axios.get(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/25/${startDate}/${endDate}`),
		])
		.then(
			axios.spread((res1, res2, res3, res4, re5) => {
				console.log(res1.data);
			}),
		);

	Promise.all([
		fetch(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/19/${startDate}/${endDate}`),
		fetch(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/20/${startDate}/${endDate}`),
		fetch(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/21/${startDate}/${endDate}`),
		fetch(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/25/${startOfToday}/${endDate}`),
		fetch(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${div}/25/${startDate}/${endDate}`),
		,
	]).then(async ([ res1, res2, res3, res4, res5
	]) => {
		let stage19r = await res1.json();
		let stage20r = await res2.json();
		let stage21r = await res3.json();
		let stage25 = await res4.json();
		let signedOutAll = await res5.json();

		// sort stage 19
		const pastStage19 = [
			...stage20r,
			...stage21r,
			...signedOutAll,
		];

		await remove_duplicates(pastStage19, stage19r);

		let dataArr19 = stage19r.map((item) => {
			return [
				item.buildNo,
				item,
			];
		}); // creates array of array
		let maparr19 = new Map(dataArr19); // create key value pair from array of array

		let stage19 = [
			...maparr19.values(),
		]; //converting back to array from mapobject

		// sort stage 20
		const pastStage20 = [
			...stage21r,
			...signedOutAll,
		];
		// remove_duplicates(signedOutAll, stage20r);
		remove_duplicates(pastStage20, stage20r);

		let dataArr20 = stage20r.map((item) => {
			return [
				item.buildNo,
				item,
			];
		}); // creates array of array
		let maparr20 = new Map(dataArr20); // create key value pair from array of array

		let stage20 = [
			...maparr20.values(),
		]; //converting back to array from mapobject

		// sort stage 21
		remove_duplicates(signedOutAll, stage21r);
		let dataArr21 = stage21r.map((item) => {
			return [
				item.buildNo,
				item,
			];
		}); // creates array of array
		let maparr21 = new Map(dataArr21); // create key value pair from array of array

		let stage21 = [
			...maparr21.values(),
		]; //converting back to array from mapobject

		res.render('throughput/wip', { division, stage19, stage20, stage21, stage25 });
	});
};

module.exports.index = async (req, res) => {
	const { division } = req.params;
	let searchOptions = { division: division };

	if (req.query.buildNumber != null && req.query.buildNumber != '') {
		searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi');
	}
	if (req.query.building != null && req.query.building != '') {
		searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi');
	}
	const inspectors = await Inspector.find({ division: division });
	const areas = await Area.find({ division: division }).sort({ name: '' });
	const models = await Model.find({ division: division }).sort({ name: '' });
	const throughput = await Throughput.find(searchOptions).sort({ createdAt: 'desc' }).limit(500);
	res.render('throughput/all', { throughput, inspectors, models, division, areas });
};
module.exports.indexReds = async (req, res) => {
	const { division } = req.params;
	let searchOptions = { division: division, red: 'Yes' };

	if (req.query.buildNumber != null && req.query.buildNumber != '') {
		searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi');
	}
	if (req.query.building != null && req.query.building != '') {
		searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi');
	}
	const inspectors = await Inspector.find({ division: division }).sort({ name: '' });
	const areas = await Area.find({ division: division }).sort({ name: '' });
	const models = await Model.find({ division: division }).sort({ name: '' });
	const throughput = await Throughput.find(searchOptions).sort({ createdAt: 'desc' }).limit(500);
	const number = throughput.length;
	res.render('throughput/reds', { throughput, inspectors, models, division, areas, number });
};

module.exports.renderNewSOForm = async (req, res) => {
	const { division } = req.params;
	const areas = await Area.find({ division: division }).sort({ name: '' });
	const detections = await Detection.find({ division: division }).sort({ name: '' });
	const models = await Model.find({ division: division }).sort({ name: '' });
	const inspectors = await Inspector.find({ division: division }).sort({ name: '' });
	res.render('throughput/newsignout', { division, areas, detections, models, inspectors });
};

module.exports.createSOThroughput = async (req, res, next) => {
	const throughput = new Throughput(req.body.throughput);
	const division = req.body.throughput.division;
	throughput.startFaults = req.body.throughput.faults;
	throughput.faults = '';
	throughput.red = 'No';
	throughput.rft = 'Yes';
	throughput.signedOut = 'Yes';
	throughput.signedOutAt = Date.now();

	await throughput.save();

	res.redirect(`/throughput/all/${division}`);
};

module.exports.createRedThroughput = async (req, res, next) => {
	const throughput = new Throughput(req.body.throughput);
	const division = req.body.throughput.division;
	throughput.startFaults = req.body.throughput.faults;
	throughput.red = 'Yes';
	throughput.rft = 'No';
	throughput.signedOut = 'No';

	await throughput.save();

	res.redirect(`/throughput/all/${division}`);
};

module.exports.renderNewRedForm = async (req, res) => {
	const { division } = req.params;
	const areas = await Area.find({ division: division }).sort({ name: '' });
	const detections = await Detection.find({ division: division }).sort({ name: '' });
	const models = await Model.find({ division: division }).sort({ name: '' });
	const inspectors = await Inspector.find({ division: division }).sort({ name: '' });
	res.render('throughput/newred', { division, areas, detections, models, inspectors });
};

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params;
	const throughput = await Throughput.findById(id);
	if (!throughput) {
		req.flash('error', 'Cannot find that throughput');
		res.redirect('/');
	}

	const division = throughput.division;
	const areas = await Area.find({ division: division }).sort({ name: '' });
	const detections = await Detection.find({ division: division }).sort({ name: '' });
	const models = await Model.find({ division: division }).sort({ name: '' });
	const inspectors = await Inspector.find({ division: division }).sort({ name: '' });
	res.render('throughput/edit', { division, areas, detections, models, inspectors, throughput });
};

module.exports.updateThroughput = async (req, res) => {
	const { id } = req.params;
	const throughput = await Throughput.findByIdAndUpdate(id, {
		...req.body.throughput,
	});

	const division = throughput.division;

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/throughput/reds/${division}`);
};
module.exports.signOutMachine = async (req, res) => {
	const { id } = req.params;
	const throughput = await Throughput.findByIdAndUpdate(id, {
		...req.body.throughput,
		signedOutAt : Date.now(),
		signedOut   : 'Yes',
		faults      : '',
		red         : 'No',
	});

	const division = throughput.division;

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/throughput/reds/${division}`);
};

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/uptime';
const Json2csvParser = require('json2csv').Parser;
const fs = require('fs');
// download claims
module.exports.download = async (req, res) => {
	const { division } = req.params;
	MongoClient.connect(
		url,
		{
			useNewUrlParser    : true,
			useUnifiedTopology : true,
		},
		function(err, db) {
			if (err) throw err;

			let dbo = db.db('uptime');

			dbo.collection('throughputs').find({ division: division }).toArray(function(err, result) {
				if (err) throw err.message;

				// const csvFields = [
				// 	'_id',
				// 	'name',
				// 	'claimNumber',
				// 	'dealer',
				// ];
				const json2csvParser = new Json2csvParser({});
				const csv = json2csvParser.parse(result);

				fs.writeFile('throughput.csv', csv, function(err) {
					if (err) throw err.message;
					// console.log('file saved');
					res.download('./throughput.csv', () => {
						// fs.unlinkSync('./customer.csv');
					});
				});

				db.close();
			});
		},
	);
};


<% layout('layouts/boilerplateTCard')%>

<div class="main-tCard-container">
    <h2 class="main-title"><%= division.toUpperCase() %> <%= location.toUpperCase()%> ADMIN </h2>
    <div class="row" style="width: 100%; margin: 0 350px;">

        <div class="col-lg check-row">
            <h3>All <%= frequency %> Checks <a class="float-right" style="margin-right: 8px;" href="/tCard/new/<%= division %>/<%= area %>/<%= location %>/<%= shiftP %>/<%= frequency %>"><i class="fas fa-plus"></i></a></h3>
            <hr>
            <div class="cards-container">
                <ul>
                    <% for (let card of cards) { %>
                            <li style="font-size: 1.3rem; font-weight: bold;">
                               <a href="/tCard/adminedit/<%= division %>/<%= area %>/<%= location %>/<%= shiftP %>/<%= frequency %>/<%= card._id %>"><%= card.name %></a>
                            </li>
                    <% } %>
                </ul>
            </div>
        </div>
        <div class="col-lg check-row">
            <h3>Historical <%= frequency %> Checks</h3>
            <hr>
            <div class="cards-container">
                <ul>
                    <% for (let card of cards) { %>
                            <li style="font-size: 1.3rem; font-weight: bold;">
                                <%= card.name %>
                            </li>
                    <% } %>
                </ul>
            </div>
        </div>

        



    </div>
</div>



