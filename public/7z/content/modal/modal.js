// // Get the modal
// let modal = document.getElementById('myModal')

// // Get the button that opens the modal
// let btn = document.getElementById('myBtn')

// // Get the <span> element that closes the modal
// let span = document.getElementsByClassName('close')[0]

// // When the user clicks on the button, open the modal
// btn.onclick = function() {
// 	modal.style.display = 'block'
// }

// // When the user clicks on <span> (x), close the modal
// span.onclick = function() {
// 	modal.style.display = 'none'
// }

// // When the user clicks anywhere outside of the modal, close it
// window.onclick = function(event) {
// 	if (event.target == modal) {
// 		modal.style.display = 'none'
// 	}
// }

let dis = document.getElementById('Type')

dis.onchange = function() {
	if (this.value === 'Breakdown') {
		document.getElementById('breakdownLabel').hidden = false
		document.getElementById('breakdown').hidden = false
		document.getElementById('breakdown').required = true
		document.getElementById('plannedLabel').hidden = true
		document.getElementById('planned').hidden = true
		document.getElementById('planned').value = null
		document.getElementById('unPlannedLabel').hidden = true
		document.getElementById('unPlanned').hidden = true
		document.getElementById('unPlanned').value = null
		document.getElementById('otherLabel').hidden = true
		document.getElementById('other').hidden = true
		document.getElementById('other').value = null
	} else {
		document.getElementById('breakdown').required = false
	}
	if (this.value === 'Planned Stoppage') {
		document.getElementById('breakdownLabel').hidden = true
		document.getElementById('breakdown').hidden = true
		document.getElementById('breakdown').value = null
		document.getElementById('plannedLabel').hidden = false
		document.getElementById('planned').hidden = false
		document.getElementById('planned').required = true
		document.getElementById('unPlannedLabel').hidden = true
		document.getElementById('unPlanned').hidden = true
		document.getElementById('unPlanned').value = null
		document.getElementById('otherLabel').hidden = true
		document.getElementById('other').hidden = true
		document.getElementById('other').value = null
	} else {
		document.getElementById('planned').required = false
	}
	if (this.value === 'Unplanned Stoppage') {
		document.getElementById('breakdownLabel').hidden = true
		document.getElementById('breakdown').hidden = true
		document.getElementById('breakdown').value = null
		document.getElementById('plannedLabel').hidden = true
		document.getElementById('planned').hidden = true
		document.getElementById('planned').value = null
		document.getElementById('unPlannedLabel').hidden = false
		document.getElementById('unPlanned').hidden = false
		document.getElementById('unPlanned').required = true
		document.getElementById('otherLabel').hidden = true
		document.getElementById('other').hidden = true
		document.getElementById('other').value = null
	} else {
		document.getElementById('unPlanned').required = false
	}
}

let dis1 = document.getElementById('planned')

dis1.onchange = function() {
	if (this.value === 'Other') {
		document.getElementById('otherLabel').hidden = false
		document.getElementById('other').hidden = false
		document.getElementById('other').required = true
	} else {
		document.getElementById('otherLabel').hidden = true
		document.getElementById('other').hidden = true
		document.getElementById('other').required = false
	}
}
let dis2 = document.getElementById('unPlanned')

dis2.onchange = function() {
	if (this.value === 'Other') {
		document.getElementById('otherLabel').hidden = false
		document.getElementById('other').hidden = false
		document.getElementById('other').required = true
	} else {
		document.getElementById('otherLabel').hidden = true
		document.getElementById('other').hidden = true
		document.getElementById('other').required = false
	}
}
let dis3 = document.getElementById('breakdown')

dis3.onchange = function() {
	if (this.value === 'Other') {
		document.getElementById('otherLabel').hidden = false
		document.getElementById('other').hidden = false
		document.getElementById('other').required = true
	} else {
		document.getElementById('otherLabel').hidden = true
		document.getElementById('other').hidden = true
		document.getElementById('other').required = false
	}
}
