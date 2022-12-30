let dis = document.getElementById('type');

dis.onchange = function() {
	if (this.value === '' || this.value === 'OK/Not OK') {
		document.getElementById('min').disabled = true;
		document.getElementById('min').required = false;
		document.getElementById('min').value = '';
		document.getElementById('max').disabled = true;
		document.getElementById('max').required = false;
		document.getElementById('max').value = '';
		document.getElementById('unit').disabled = true;
		document.getElementById('unit').required = false;
		document.getElementById('unit').value = '';

	} else {
		document.getElementById('min').disabled = false;
		document.getElementById('min').required = true;
		document.getElementById('max').disabled = false;
		document.getElementById('max').required = true;
		document.getElementById('unit').disabled = false;
		document.getElementById('unit').required = true;
	}
};