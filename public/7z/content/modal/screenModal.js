// Get the modal

let modal = document.getElementById('myModal')

// Get the button that opens the modal
let btn = document.getElementById('myBtn')

// Get the <span> element that closes the modal
let span = document.getElementsByClassName('close')[0]

// When the user clicks on the button, open the modal
btn.onclick = function() {
	modal.style.display = 'block'
}
// When the user clicks on the button, open the modal
btn1.onclick = function() {
	modal.style.display = 'block'
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
	modal.style.display = 'none'
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
	if (event.target == modal) {
		modal.style.display = 'none'
	}
}

let dis = document.getElementById('breakdownType')

dis.onchange = function() {
	if (this.value === '' || this.value === 'Known breakdown') {
		document.getElementById('reasonTextarea').disabled = false
		document.getElementById('reasonTextarea').required = true
		document.getElementById('concernType').disabled = false
		document.getElementById('concernType').required = true
	} else {
		document.getElementById('reasonTextarea').disabled = true
		document.getElementById('reasonTextarea').value = ''
		document.getElementById('concernType').disabled = true
		document.getElementById('concernType').value = ''
	}
}

let dis1 = document.getElementById('type')

dis1.onchange = function() {
	if (this.value === '' || this.value === 'OK/Not OK') {
		document.getElementById('min').disabled = true
		document.getElementById('min').required = false
		document.getElementById('min').value = ''
		document.getElementById('max').disabled = true
		document.getElementById('max').required = false
		document.getElementById('max').value = ''
		document.getElementById('unit').disabled = true
		document.getElementById('unit').required = false
		document.getElementById('unit').value = ''
	} else {
		document.getElementById('min').disabled = false
		document.getElementById('min').required = true
		document.getElementById('max').disabled = false
		document.getElementById('max').required = true
		document.getElementById('unit').disabled = false
		document.getElementById('unit').required = true
	}
}
