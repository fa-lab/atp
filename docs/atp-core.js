'use strict'

const project_version = 'v2';
var project_name = 'Untitled 1';

var dom_color_pallet = document.getElementById('color_pallet');
var dom_selection = document.getElementById('select_pallet');

var prev_datas = [];

function onFileChoose(input) {
	if (input.files && input.files[0]) {
		localStorage['atp_file_name'] = input.files[0].name;

		var oFReader = new FileReader();
		oFReader.readAsText(input.files[0]);
		oFReader.onload = function(oFREvent) {
			load_project(oFReader.result);
		};
	}
}

function onModeChanged() {
	if (EDITOR_MODE == EDITOR_WRITE_MODE) {
		$("#designer").removeClass('erase_mode');
		$("#designer").removeClass('select_mode');
		$(".selected").removeClass("selected");

	} else if (EDITOR_MODE == EDITOR_ERASE_MODE) {
		$("#designer").removeClass('select_mode');
		$("#designer").addClass('erase_mode');
	} else if (EDITOR_MODE == EDITOR_SELECT_MODE) {
		$("#designer").removeClass('erase_mode');
		$("#designer").addClass('select_mode');
		$(".selected").removeClass("selected");
	}
}

var data_buffer = [];
for (var i = 0; i < LED_ATPNODE_LED; i++) {
	data_buffer.push(0);
}

var bin_data = [];
function getAsData(dt, data) {
	if (data) {
		for (var led_ch in data) {
			for (var i = 0; i < LED_ATPNODE_LED; i++) {
				data_buffer[i] = 0;
			}
			for (var led_index in data[led_ch]) {
				let color = data[led_ch][led_index][0];
				let bright = parseInt(data[led_ch][led_index][1]);

				let val = 0;
				switch (color) {
					case 'r':
						val = 128;
						break;
					case 'g':
						val = 64;
						break;
					case 'b':
						val = 32;
						break;
					case 'rg':
						val = 192;
						break;
					case 'rb':
						val = 160;
						break;
					case 'gb':
						val = 96;
						break;
					case 'rgb':
						val = 224;
						break;
				}
				data_buffer[led_index] = val + bright;
			}

			var str = '!' + dt + ',' + Math.pow(2, led_ch) + ';';
			var enc = new TextEncoder();

			var uarr_str = enc.encode(str);
			var uarr_data = new Uint8Array(data_buffer);

			var mergedArray = new Uint8Array(uarr_str.length + uarr_data.length);
			mergedArray.set(uarr_str);
			mergedArray.set(uarr_data, uarr_str.length);

			bin_data.push(mergedArray);
			// console.log('\t' + str);
			dt = 0;
		}
	} else {
		var str = '!' + dt + ',65535;';
		var enc = new TextEncoder();

		for (var i = 0; i < LED_ATPNODE_LED; i++) {
			data_buffer[i] = 0;
		}

		var uarr_str = enc.encode(str);
		var uarr_data = new Uint8Array(data_buffer);

		var mergedArray = new Uint8Array(uarr_str.length + uarr_data.length);
		mergedArray.set(uarr_str);
		mergedArray.set(uarr_data, uarr_str.length);

		bin_data.push(mergedArray);
		// console.log('\t' + str);
	}
}

function downloadBlob(blob, name = 'data.atp') {
	// Convert your blob into a Blob URL (a special url that points to an object in the browser's memory)
	const blobUrl = URL.createObjectURL(blob);

	// Create a link element
	const link = document.createElement("a");

	// Set link's href to point to the Blob URL
	link.href = blobUrl;
	link.download = name;

	// Append link to the body
	document.body.appendChild(link);

	// Dispatch click event on the link
	// This is necessary as link.click() does not work on the latest firefox
	link.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			view: window
		})
	);

	// Remove link from body
	document.body.removeChild(link);
}

function new_project() {
	var r = confirm("기존 내역이 모두 삭제됩니다.");
	if (r == true) {
		localStorage.clear(); location.reload();
	}
}

if (localStorage['atp_led_view_size'])
	LED_VIEW_SIZE = parseInt(localStorage['atp_led_view_size']);

if (localStorage['atp_timeline_size'])
	TIMELINE_SIZE = parseInt(localStorage['atp_timeline_size']);

if (localStorage['atp_led_max_size'])
	LED_MAX_SIZE = parseInt(localStorage['atp_led_max_size']);

if (localStorage['atp_led_channels'])
	LED_CHANNELS = parseInt(localStorage['atp_led_channels']);


function load_project(jsonTxT) {
	let fj_result = JSON.parse(jsonTxT);
	let editor_datas = fj_result.project_data;
	designer_data = {};

	if (fj_result.led_view_size)
		localStorage['atp_led_view_size'] = parseInt(fj_result.led_view_size);

	if (fj_result.timeline_size)
		localStorage['atp_timeline_size'] = parseInt(fj_result.timeline_size);

	if (fj_result.led_max_size)
		localStorage['atp_led_max_size'] = parseInt(fj_result.led_max_size);

	if (fj_result.led_channels)
		localStorage['atp_led_channels'] = parseInt(fj_result.led_channels);

	if (fj_result.project_version === 'v1') {
		// v1
		// console.log('version', 'v1');
		for (let page = 0; page < editor_datas.length; page++) {
			let editor_data = editor_datas[page];
			let start_t = page * 10;
			Object.entries(editor_data).forEach(e1 => {
				const [time_index, v1] = e1; // time_index
				Object.entries(v1).forEach(e2 => {
					const [ch_index, v2] = e2; // ch_index
					Object.entries(v2).forEach(e3 => {
						const [led_index, led_value] = e3; // led_index, led_value [color, bright]

						let seconds = start_t + Math.floor(parseInt(time_index) / 8);
						let time_idx = parseInt(time_index) % 8;
						let led_idx = parseInt(ch_index) * LED_MAX_SIZE + parseInt(led_index);
						let value = led_value[0] + ',' + led_value[1];
						putDataRaw(seconds, time_idx, led_idx, value);
					});
				});

			});
		}
		// console.log('load done', 'v1');
	} else if (fj_result.project_version === 'v2') {
		// v2
		// console.log('version', 'v2');
		Object.entries(editor_datas).forEach(ele => {
			const [key, val] = ele;
			if (key.startsWith('atp_data_')) {
				let data = val.trim();
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
		});
	}
	saveLocalStorage();
	location.reload();
	//update_table();
}

function save_project() {
	let editor_datas = {};
	Object.entries(designer_data).forEach(e1 => {
		let data = '';
		const [seconds, v1] = e1;
		Object.entries(v1).forEach(e2 => {
			const [time_index, v2] = e2;
			Object.entries(v2).forEach(e3 => {
				const [led_index, v3] = e3;
				data += (time_index + ',' + led_index + ',' + v3 + ';');
			});
		});
		editor_datas['atp_data_' + seconds] = data;
	});

	let result = {
		project_version: project_version,
		project_name: project_name,
		project_data: editor_datas,
		led_view_size: LED_VIEW_SIZE,
		timeline_size: TIMELINE_SIZE,
		led_max_size: LED_MAX_SIZE,
		led_channels: LED_CHANNELS
	};

	result = JSON.stringify(result);

	var blob = new Blob([result], { type: "application/json" });
	var d = new Date();
	d = new Date(d.getTime());
	var date_format_str = d.getFullYear().toString() + ((d.getMonth() + 1).toString().length == 2 ? (d.getMonth() + 1).toString() : "0" + (d.getMonth() + 1).toString()) + (d.getDate().toString().length == 2 ? d.getDate().toString() : "0" + d.getDate().toString()) + "_" + (d.getHours().toString().length == 2 ? d.getHours().toString() : "0" + d.getHours().toString()) + "T" + ((d.getMinutes()).toString().length == 2 ? (d.getMinutes()).toString() : "0" + (d.getMinutes()).toString());
	downloadBlob(blob, 'atp_' + date_format_str + '_v2.json');
}
function choose_file() {
	document.getElementById('theFile').click();
}

function export_data() {

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
	let last_t = 0;
	let dt = 0;
	let target_t;

	var t_datas = {};
	for (const seconds in designer_data) {
		for (const time_index in designer_data[seconds]) {
			for (const led_index in designer_data[seconds][time_index]) {

				let sec = parseInt(seconds);
				let ti = parseInt(time_index);
				let li = parseInt(led_index);


				if (!t_datas[sec * 8 + ti]) {
					t_datas[sec * 8 + ti] = {};
				}

				if (!t_datas[sec * 8 + ti][Math.floor(li / LED_MAX_SIZE)]) {
					t_datas[sec * 8 + ti][Math.floor(li / LED_MAX_SIZE)] = {};
				}

				if (!t_datas[sec * 8 + ti][Math.floor(li / LED_MAX_SIZE)][li % LED_MAX_SIZE]) {
					t_datas[sec * 8 + ti][Math.floor(li / LED_MAX_SIZE)][li % LED_MAX_SIZE] = [];
				}

				let val = designer_data[sec][ti][li];
				val = val.split(',', 2);


				t_datas[sec * 8 + ti][Math.floor(li / LED_MAX_SIZE)][li % LED_MAX_SIZE][0] = val[0];
				t_datas[sec * 8 + ti][Math.floor(li / LED_MAX_SIZE)][li % LED_MAX_SIZE][1] = parseInt(val[1]);
			}
		}
	}
	let kys = Object.keys(t_datas);
	// console.log(kys[kys.length - 1]);

	// time_index
	// led_ch
	// led_idx
	// []

	bin_data = [];
	var start_t = 0;

	var last_t_idx = -1;
	for (var t_idx = 0; t_idx < parseInt(kys[kys.length - 1]) + 1; t_idx++) {
		if (t_datas[t_idx]) {
			if ((t_idx - last_t_idx) > 1) {
				target_t = start_t + TIME_TICKS * (last_t_idx + 1);

				dt = target_t - last_t;
				//console.log('APPEND', target_t, dt, 'CLEAR');
				getAsData(dt);
				last_t = target_t;
			}
			target_t = start_t + TIME_TICKS * t_idx;
			dt = target_t - last_t;
			//console.log('APPEND', target_t, dt, t_datas[t_idx]);
			getAsData(dt, t_datas[t_idx]);
			last_t_idx = t_idx;
			last_t = target_t;
		}

	}

	target_t = target_t + TIME_TICKS;
	getAsData(TIME_TICKS);
	var blob = new Blob(bin_data, { type: "application/octet-stream" });
	downloadBlob(blob);
}

function get_composed_all() {
	let selected = $(".ATPBox[led_color]:not(#color_pallet)");
	return selected;
}

function clear_all() {
	let selected = $(".ATPBox[led_color]:not(#color_pallet)");
	selected.removeAttr('led_color');
	selected.removeAttr('led_bright');
	selected.removeAttr('title');
	selected.removeClass("selected");
}
var IS_CTRL_PRESSED = false;


function change_color(color) {
	CURRENT_COLOR = color;
	dom_color_pallet.setAttribute('led_color', CURRENT_COLOR);
}

function change_bright(bright) {
	if (bright > MAX_BRIGHT)
		bright = MAX_BRIGHT;
	if (bright < 1)
		bright = 1;

	CURRENT_BRIGHT = bright;

	dom_color_pallet.setAttribute('led_bright', CURRENT_BRIGHT);
	document.getElementById("color_pallet").getElementsByTagName('p')[0].innerHTML = BRIGHT_MAP[CURRENT_BRIGHT] + ' %';
}



var designer_data = {};

// var data = [];

var table_elements = [];
var table_timelines = [];
var table_labels = [];
var table_selected = [];

var table_copied = [];



function getData(row, col) {
	let seconds = TIMELINE_OFFSET + Math.floor(col / TIME_DIV);
	let time_idx = col % TIME_DIV;
	let led_idx = LED_OFFSET + row;
	if (designer_data[seconds] && designer_data[seconds][time_idx] && designer_data[seconds][time_idx][led_idx]) {
		return designer_data[seconds][time_idx][led_idx];
	} else {
		return null;
	}
}


function syncData() {
	for (let row = 0; row < LED_VIEW_SIZE; row++) {
		for (let col = 0; col < TIMELINE_SIZE * TIME_DIV; col++) {

			let seconds = TIMELINE_OFFSET + Math.floor(col / TIME_DIV);
			let time_idx = col % TIME_DIV;
			let led_idx = LED_OFFSET + row;


			if (!designer_data[seconds]) {
				designer_data[seconds] = {};
			}
			if (!designer_data[seconds][time_idx]) {
				designer_data[seconds][time_idx] = {};
			}
			if (!designer_data[seconds][time_idx][led_idx]) {
				designer_data[seconds][time_idx][led_idx] = {};
			}

			if (table_elements[row][col].hasAttribute('led_color')) {
				//console.log('add synced');
				designer_data[seconds][time_idx][led_idx] = table_elements[row][col].getAttribute('led_color') + ',' + table_elements[row][col].getAttribute('led_bright');
			} else {
				delete designer_data[seconds][time_idx][led_idx];

				if (Object.keys(designer_data[seconds][time_idx]).length === 0) {
					delete designer_data[seconds][time_idx];
				}

				if (Object.keys(designer_data[seconds]).length === 0) {
					delete designer_data[seconds];
				}
			}

		}
	}
}
function putDataRaw(seconds, time_idx, led_idx, value) {
	if (led_idx >= LED_MAX_SIZE * LED_CHANNELS) {
		return;
	}
	if (!designer_data[seconds]) {
		designer_data[seconds] = {};
	}
	if (!designer_data[seconds][time_idx]) {
		designer_data[seconds][time_idx] = {};
	}
	if (!designer_data[seconds][time_idx][led_idx]) {
		designer_data[seconds][time_idx][led_idx] = {};
	}
	designer_data[seconds][time_idx][led_idx] = value;
}

function putData(row, col, value) {
	let seconds = TIMELINE_OFFSET + Math.floor(col / TIME_DIV);
	let time_idx = col % TIME_DIV;
	let led_idx = LED_OFFSET + row;

	putDataRaw(seconds, time_idx, led_idx, value);
}

function delData(row, col) {
	let seconds = TIMELINE_OFFSET + Math.floor(col / TIME_DIV);
	let time_idx = col % TIME_DIV;
	let led_idx = LED_OFFSET + row;
	if (!designer_data[seconds]) {
		designer_data[seconds] = {};
	}
	if (!designer_data[seconds][time_idx]) {
		designer_data[seconds][time_idx] = {};
	}
	if (!designer_data[seconds][time_idx][led_idx]) {
		designer_data[seconds][time_idx][led_idx] = {};
	}

	delete designer_data[seconds][time_idx][led_idx];

	if (Object.keys(designer_data[seconds][time_idx]).length === 0) {
		delete designer_data[seconds][time_idx];
	}

	if (Object.keys(designer_data[seconds]).length === 0) {
		delete designer_data[seconds];
	}
}

function update_table() {
	clearSelection();
	// Label update
	for (let i = 0; i < table_labels.length; i++) {
		let cur_idx = i + LED_OFFSET;

		let led_ch = Math.floor(cur_idx / LED_MAX_SIZE);
		let led_idx = cur_idx - led_ch * LED_MAX_SIZE;


		if (led_ch % 2 == 1) {
			table_labels[i].className = 'br meta bg-alt';
		} else {
			table_labels[i].className = 'br meta';

		}
		table_labels[i].innerHTML = '(' + led_ch + ') ' + led_idx;
	}

	// Timeline update
	for (let i = 0; i < table_timelines.length; i++) {

		let sec = i + TIMELINE_OFFSET;
		let min = Math.floor(sec / 60);
		sec = sec - min * 60;

		if (sec % 2 == 1) {
			table_timelines[i].className = 'bb meta bg-alt';
		} else {
			table_timelines[i].className = 'bb meta';
		}

		table_timelines[i].innerHTML = min + '분 ' + sec + '초';
	}

	for (let row = 0; row < LED_VIEW_SIZE; row++) {
		for (let col = 0; col < TIMELINE_SIZE * TIME_DIV; col++) {
			let cell = table_elements[row][col];
			let v = getData(row, col);
			if (v == null) {
				cell.removeAttribute('led_color');
				cell.removeAttribute('led_bright');
				cell.removeAttribute('title');
			} else {
				v = v.split(',', 2);
				cell.setAttribute('led_color', v[0]);
				cell.setAttribute('led_bright', v[1]);
				cell.setAttribute('title', BRIGHT_MAP[parseInt(v[1])] + ' %');
			}
		}

	}
}

function init_table() {
	table_elements = [];
	table_labels = [];
	let table = document.getElementById("designer");
	table.style.width = (TIMELINE_SIZE * TIME_DIV * (CELL_SIZE + 1 + 1)) + 'px';
	table.innerHTML = '';

	let t_row_h = table.insertRow(-1);
	t_row_h.style.height = CELL_SIZE + 'px';

	let t_cell_h = t_row_h.insertCell(-1);
	t_cell_h.colSpan = '2';
	t_cell_h.innerHTML = 'qwer';
	for (let i = 0; i < TIMELINE_SIZE; i++) {
		t_cell_h = t_row_h.insertCell(-1);
		t_cell_h.colSpan = '8';
		t_cell_h.innerHTML = '&nbsp;';
		table_timelines[table_timelines.length] = t_cell_h;
	}

	for (let row = 0; row < LED_VIEW_SIZE; row++) {
		let t_row = table.insertRow(-1);
		t_row.style.height = CELL_SIZE + 'px';
		for (let col = 0; col < TIMELINE_SIZE * TIME_DIV; col++) {
			if (!table_elements[row]) {
				table_elements[row] = [];
			}

			let t_cell = t_row.insertCell(-1);
			if (col % TIME_DIV == (TIME_DIV - 1))
				t_cell.className = 'br';

			t_cell.setAttribute('row', row);
			t_cell.setAttribute('col', col);

			t_cell.colSpan = '1';
			t_cell.style.height = CELL_SIZE + 'px';
			t_cell.hovered = false;
			t_cell.onmouseout = function(e) {
				t_cell.hovered = false;
			}
			t_cell.onmouseover = function(e) {
				t_cell.hovered = true;
				if (!IS_MOUSE_DOWN) {
					return;
				}
				if (EDITOR_MODE == EDITOR_WRITE_MODE) {
					this.setAttribute('led_color', CURRENT_COLOR);
					this.setAttribute('led_bright', CURRENT_BRIGHT);
					this.setAttribute('title', BRIGHT_MAP[CURRENT_BRIGHT] + ' %');

					putData(parseInt(this.getAttribute("row")), parseInt(this.getAttribute("col")), CURRENT_COLOR + ',' + CURRENT_BRIGHT);
				} else if (EDITOR_MODE == EDITOR_ERASE_MODE) {
					if (this.hasAttribute('led_color')) {
						this.removeAttribute('led_color');
						this.removeAttribute('led_bright');
						this.removeAttribute('title');
						delData(parseInt(this.getAttribute("row")), parseInt(this.getAttribute("col")));
					}
				}
			};
			t_cell.onclick = function() {
				let row = parseInt(this.getAttribute("row"));
				let col = parseInt(this.getAttribute("col"));
				if (EDITOR_MODE == EDITOR_WRITE_MODE) {
					this.setAttribute('led_color', CURRENT_COLOR);
					this.setAttribute('led_bright', CURRENT_BRIGHT);
					this.setAttribute('title', BRIGHT_MAP[CURRENT_BRIGHT] + ' %');

					putData(row, col, CURRENT_COLOR + ',' + CURRENT_BRIGHT);
				} else if (EDITOR_MODE == EDITOR_ERASE_MODE) {
					if (this.hasAttribute('led_color')) {
						this.removeAttribute('led_color');
						this.removeAttribute('led_bright');
						this.removeAttribute('title');
						// console.log('del', row, col);
						delData(row, col);
					}
				}
			};
			table_elements[row][col] = t_cell;
		}

		let t_label = t_row.insertCell(0);
		t_label.className = 'br';
		t_label.colSpan = '2';
		t_label.style.height = CELL_SIZE + 'px';
		t_label.innerHTML = '&nbsp;';
		table_labels[table_labels.length] = t_label;
	}
	update_table();
}


$(document).ready(function() {
	init_table();
	loadLocalStorage();
	if (localStorage['atp_file_name']) {
		message('[' + localStorage['atp_file_name'] + '] 를 불러왔습니다.');
	} else {
		message('디자이너가 준비되었습니다.');
	}
});
