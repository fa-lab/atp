function change_ch(e) {
	if (confirm("기존 내용이 사라집니다. LED 채널을 변경합니까?")) {
		localStorage['atp_led_channels'] = e.value;
		location.reload();
	} else {
		e.value = LED_CHANNELS;
	}
}

function change_max(e) {
	if (confirm("기존 내용이 사라집니다. LED 개수를 변경합니까?")) {
		localStorage['atp_led_max_size'] = e.value;
		location.reload();
	} else {
		e.value = LED_MAX_SIZE;
	}
}

function change_timeline(e) {
	if (confirm("기존 내용이 사라집니다. 타임라인를 변경합니까?")) {
		localStorage['atp_timeline_size'] = e.value;
		location.reload();
	} else {
		e.value = TIMELINE_SIZE;
	}
}

function change_led_view(e) {
	if (confirm("기존 내용이 사라집니다. 뷰를 변경합니까?")) {
		localStorage['atp_led_view_size'] = e.value;
		location.reload();
	} else {
		e.value = LED_VIEW_SIZE;
	}
}


function delSelection() {
	for (let i = 0; i < table_selected.length; i++) {
		table_selected[i].removeAttribute('led_color');
		table_selected[i].removeAttribute('led_bright');
		table_selected[i].removeAttribute('title');
		table_selected[i].className = table_selected[i].className.replace('selected', '').trim();
	}
	table_selected = [];
	syncData();
}

function clearSelection() {
	for (let i = 0; i < table_selected.length; i++) {
		table_selected[i].className = table_selected[i].className.replace('selected', '');
	}
	table_selected = [];
}


function loadLocalStorage() {
	designer_data = {};
	for (var i = 0; i < localStorage.length; i++) {
		if (localStorage.key(i).startsWith('atp_data_')) {
			let key = localStorage.key(i);
			let data = localStorage[key];
			data = data.trim();
			if (data.charAt(data.length - 1) == ';') {
				data = data.slice(0, -1);
			}
			data = data.split(';');
			for (let i = 0; i < data.length; i++) {
				let r_data = data[i].split(',', 4);
				let seconds = parseInt(key.slice(9));
				let time_idx = parseInt(r_data[0]);
				let led_idx = parseInt(r_data[1]);
				let value = r_data[2] + ',' + r_data[3];
				putDataRaw(seconds, time_idx, led_idx, value);
			}

		}
	}
	update_table();
}

function saveLocalStorage() {
	let removeList = [];
	for (var i = 0; i < localStorage.length; i++) {
		if (localStorage.key(i).startsWith('atp_data_')) {
			removeList.push(localStorage.key(i));
		}
	}
	for (let i = 0; i < removeList.length; i++) {
		localStorage.removeItem(removeList[i]);
	}
	Object.entries(designer_data).forEach(e1 => {
		let data = '';
		const [seconds, v1] = e1;
		Object.entries(v1).forEach(e2 => {
			const [time_index, v2] = e2;
			Object.entries(v2).forEach(e3 => {
				const [led_index, v3] = e3;
				let spl = v3.split(',', 2);
				let c = spl[0];
				let b = parseInt(spl[1]);
				if (isNaN(b) || b === 'undefined') {
					b = MAX_BRIGHT;
				}
				data += (time_index + ',' + led_index + ',' + c + ',' + b + ';');
			});
		});
		localStorage['atp_data_' + seconds] = data;
	});
}
