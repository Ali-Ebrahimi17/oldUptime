let dis4 = document.getElementById('UpdateReason')

dis4.onchange = function() {
	if (this.value === 'End Stoppage') {
		document.getElementById('closeLabel').hidden = false
		document.getElementById('close').hidden = false
		// document.getElementById('newReason').value = null
		// document.getElementById('newType').value = null
		document.getElementById('other1').value = null
	} else {
		document.getElementById('closeLabel').hidden = true
		document.getElementById('close').hidden = true
	}
	if (this.value === 'Update Stoppage') {
		document.getElementById('newReasonLabel').hidden = false
		document.getElementById('newReason').hidden = false
		document.getElementById('newReason').required = true
		document.getElementById('newTypeLabel').hidden = false
		document.getElementById('newType').hidden = false
		document.getElementById('newType').required = true
	} else {
		document.getElementById('newReasonLabel').hidden = true
		document.getElementById('newReason').hidden = true
		document.getElementById('newReason').required = false
		document.getElementById('newTypeLabel').hidden = true
		document.getElementById('newType').hidden = true
		document.getElementById('newType').required = false
	}
}

let dis5 = document.getElementById('newReason')

dis5.onchange = function() {
	if (this.value === 'Other') {
		document.getElementById('other1Label').hidden = false
		document.getElementById('other1').hidden = false
		document.getElementById('other1').required = true
	} else {
		document.getElementById('other1Label').hidden = true
		document.getElementById('other1').hidden = true
		document.getElementById('other1').required = false
		document.getElementById('other1').value = null
	}
}
