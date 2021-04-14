'use strict'

var CURRENT_COLOR = 'r';


var CURRENT_BRIGHT = 28;
// const MAX_BRIGHT = 31;
// const BRIGHT_MAP = [0, 20, 25, 33, 38, 43, 48, 51, 55, 58, 61, 63, 66, 68, 71, 73, 76, 78, 81, 83, 85, 87, 88, 90, 93, 94, 95, 96, 97, 98, 99, 100]; Normal

const MAX_BRIGHT = 28;
const BRIGHT_MAP = [0, 20, 25, 33, 38, 43, 48, 51, 55, 58, 61, 63, 66, 68, 71, 73, 76, 78, 81, 83, 85, 87, 88, 90, 93, 94, 95, 96, 100]; // Economy

var RENDER_SIZE_SEC = 10;
var IS_MOUSE_DOWN = false;


var LED_CHANNELS = 16;
var LED_MAX_SIZE = 50;
var LED_ATPNODE_LED = 50;


var MOVE_ORIGIN;


const TIME_RESOLUTION = 8;
const TIME_TICKS = (1000 / TIME_RESOLUTION);

location.hash = location.hash.trim();
if (location.hash.length > 1) {
	try {
		var hash = location.hash.slice(1);

		var tmp = hash.split(',', 2);

		if (tmp.length == 2) {
			LED_CHANNELS = parseInt(tmp[0]);
			if (LED_CHANNELS > 16) {
				LED_CHANNELS = 16;
			}
			if (LED_CHANNELS < 0) {
				LED_CHANNELS = 1;
			}
			LED_MAX_SIZE = parseInt(tmp[1]);
			if (LED_MAX_SIZE > 50) {
				LED_MAX_SIZE = 50;
			}
			if (LED_MAX_SIZE < 0) {
				LED_MAX_SIZE = 1;
			}
		}
	} catch (e) {

	}
}

$(".custom-select")[0].value = LED_CHANNELS;
$(".custom-select")[1].value = LED_MAX_SIZE;

function change_ch(e) {
	if (confirm("기존 내용이 사라집니다. LED 채널을 변경합니까?")) {
		location.hash = e.value + ',' + LED_MAX_SIZE;
		location.reload();
	} else {
		e.value = LED_CHANNELS;
	}
}

function change_max(e) {
	if (confirm("기존 내용이 사라집니다. LED 개수를 변경합니까?")) {
		location.hash = LED_CHANNELS + ',' + e.value;
		location.reload();
	} else {
		e.value = LED_MAX_SIZE;
	}
}

var EDITOR_MODE = 0;
var EDITOR_TIME_PAGE = 0;

const EDITOR_WRITE_MODE = 0;
const EDITOR_ERASE_MODE = 1;
const EDITOR_SELECT_MODE = 2;

var IS_SELECTED = false;
var IS_MOVE = false;

var project_version = 'v1';
var project_name = 'Untitled 1';


var dom_color_pallet = document.getElementById('color_pallet');
var dom_selection = document.getElementById('select_pallet');

var editor_datas = [];
var dom_arrays = [];
var prev_datas = [];

function onFileChoose(input) {
	if (input.files && input.files[0]) {
		var oFReader = new FileReader();
		oFReader.readAsText(input.files[0]);
		oFReader.onload = function(oFREvent) {

			load_project(oFReader.result);
		};
	}
}
function onChangePage(offset) {
	if (!editor_datas[EDITOR_TIME_PAGE]) {
		editor_datas[EDITOR_TIME_PAGE] = {};
	}
	save_to_vars();

	EDITOR_TIME_PAGE += offset;
	reload_data();

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
		IS_SELECTED = false;
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

function load_project(jsonTxT) {
	let fj_result = JSON.parse(jsonTxT);

	project_version = fj_result.project_version;
	project_name = fj_result.project_name;
	editor_datas = fj_result.project_data;
	reload_data();

}

function reload_data() {
	update_head();
	clear_all();
	let newData = editor_datas[EDITOR_TIME_PAGE];
	for (var time_idx in newData) {
		for (var led_ch in newData[time_idx]) {
			led_ch = parseInt(led_ch);

			for (var led_index in newData[time_idx][led_ch]) {
				led_index = parseInt(led_index);
				let led_color = newData[time_idx][led_ch][led_index][0];
				let led_bright = parseInt(newData[time_idx][led_ch][led_index][1]);

				let target = dom_arrays[led_ch * LED_MAX_SIZE + led_index][time_idx];

				target.setAttribute('led_color', led_color);
				target.setAttribute('led_bright', led_bright);
				target.setAttribute('title', BRIGHT_MAP[led_bright] + ' %');
			}

		}
	}
}

function save_project() {
	save_to_vars();
	let result = {
		project_version: project_version,
		project_name: project_name,
		project_data: editor_datas
	};

	result = JSON.stringify(result);

	var blob = new Blob([result], { type: "application/json" });
	var d = new Date();
	d = new Date(d.getTime());
	var date_format_str = d.getFullYear().toString() + ((d.getMonth() + 1).toString().length == 2 ? (d.getMonth() + 1).toString() : "0" + (d.getMonth() + 1).toString()) + (d.getDate().toString().length == 2 ? d.getDate().toString() : "0" + d.getDate().toString()) + "_" + (d.getHours().toString().length == 2 ? d.getHours().toString() : "0" + d.getHours().toString()) + "T" + ((d.getMinutes()).toString().length == 2 ? (d.getMinutes()).toString() : "0" + (d.getMinutes()).toString());

	downloadBlob(blob, 'atp_' + date_format_str + '.json');
}
function choose_file() {
	document.getElementById('theFile').click();
}

function save_to_vars() {
	editor_datas[EDITOR_TIME_PAGE] = {};
	let selected = get_composed_all();
	for (let i = 0; i < selected.length; i++) {
		let led_ch = parseInt(selected[i].getAttribute('led_ch'));
		let led_index = parseInt(selected[i].getAttribute('led_index'));
		let time_index = parseInt(selected[i].getAttribute('time_index'));
		let led_color = selected[i].getAttribute('led_color');
		let led_bright = selected[i].getAttribute('led_bright');

		if (!editor_datas[EDITOR_TIME_PAGE][time_index]) {
			editor_datas[EDITOR_TIME_PAGE][time_index] = {};
		}
		if (!editor_datas[EDITOR_TIME_PAGE][time_index][led_ch]) {
			editor_datas[EDITOR_TIME_PAGE][time_index][led_ch] = {};
		}
		editor_datas[EDITOR_TIME_PAGE][time_index][led_ch][led_index] = [led_color, led_bright];
	}

}
function export_data() {
	save_to_vars();

	var last_t = 0;
	var dt = 0;
	var target_t;
	bin_data = [];
	for (var page = 0; page < editor_datas.length; page++) {
		var start_t = RENDER_SIZE_SEC * page * 1000;

		var t_datas = editor_datas[page];
		var last_t_idx = -1;
		for (var t_idx = 0; t_idx < RENDER_SIZE_SEC * TIME_RESOLUTION; t_idx++) {
			if (t_datas[t_idx]) {
				if ((t_idx - last_t_idx) > 1) {
					target_t = start_t + TIME_TICKS * (last_t_idx + 1);

					dt = target_t - last_t;
					// console.log('APPEND', target_t, dt, 'CLEAR');
					getAsData(dt);
					last_t = target_t;
				}
				target_t = start_t + TIME_TICKS * t_idx;
				dt = target_t - last_t;
				// console.log('APPEND', target_t, dt, t_datas[t_idx]);
				getAsData(dt, t_datas[t_idx]);
				last_t_idx = t_idx;
				last_t = target_t;
			}

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

// $(".ATPBox[led_color]:not(#color_pallet)")

$("#designer").on('mousedown', function(e) {
	if (EDITOR_MODE == EDITOR_SELECT_MODE) {
		if ($(e.target).hasClass('selected')) {
			console.log('Actions HERE!');
			console.log(e.target);
			MOVE_ORIGIN = e.target;
			dom_selection.startX = e.clientX;
			dom_selection.startY = e.clientY + window.scrollY;
			IS_MOVE = true;
		} else {
			$(".selected").removeClass("selected");
			IS_SELECTED = false;
			dom_selection.style.display = 'block';
			dom_selection.startX = e.clientX;
			dom_selection.startY = e.clientY + window.scrollY;
		}
	}
	IS_MOUSE_DOWN = true;
});

$("#designer").on('mouseup', function(e) {
	if (EDITOR_MODE == EDITOR_SELECT_MODE) {
		IS_SELECTED = true;
		if (IS_MOVE) {
			console.log(e.button);
			if (e.button == 0) { // Left
				let dx_idx = e.target.getAttribute('time_index') - MOVE_ORIGIN.getAttribute('time_index');
				let dy_idx = (parseInt(e.target.getAttribute('led_ch')) * LED_MAX_SIZE + parseInt(e.target.getAttribute('led_index'))) - (parseInt(MOVE_ORIGIN.getAttribute('led_ch')) * LED_MAX_SIZE + parseInt(MOVE_ORIGIN.getAttribute('led_index')));
				move_block(dx_idx, dy_idx, IS_CTRL_PRESSED);
				IS_MOVE = false;
			} else if (e.button == 2) { // Right
				console.log('Right Click');
				let selected = $(".ATPBox.selected:not(#color_pallet)");
				console.log(selected);
				selected.attr('led_color', CURRENT_COLOR);
				selected.attr('led_bright', CURRENT_BRIGHT);
				selected.attr('title', BRIGHT_MAP[CURRENT_BRIGHT] + ' %');
			}
		}
		dom_selection.style.width = 0 + 'px';
		dom_selection.style.height = 0 + 'px';
		dom_selection.style.display = 'none';
		let rows = $(".ATPRow");
		$(".selected").removeClass("selected");
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].offsetTop > dom_selection.bottom)
				break;

			if (rows[i].offsetTop > dom_selection.top) {

				let boxes = $(rows[i]).find(".ATPBox[led_color]");

				for (let j = 0; j < boxes.length; j++) {

					if (boxes[j].offsetLeft > dom_selection.right)
						break;

					if (boxes[j].offsetLeft > dom_selection.left) {
						$(boxes[j]).addClass('selected');
					}
				}
			}
		}
	}
	IS_MOUSE_DOWN = false;
});

$("#designer").on('mousemove', function(e) {
	let left = e.clientX + 18;
	let top = e.clientY + 18 + window.scrollY;

	dom_color_pallet.style.left = left + 'px';
	dom_color_pallet.style.top = top + 'px';

	if (EDITOR_MODE == EDITOR_SELECT_MODE && !IS_SELECTED) {
		dom_selection.endX = e.clientX;
		dom_selection.endY = e.clientY + window.scrollY;

		let left = Math.min(dom_selection.startX, dom_selection.endX);
		let top = Math.min(dom_selection.startY, dom_selection.endY);

		let w = Math.max(dom_selection.startX, dom_selection.endX) - left;
		let h = Math.max(dom_selection.startY, dom_selection.endY) - top;

		dom_selection.left = left;
		dom_selection.right = left + w;
		dom_selection.top = top;
		dom_selection.bottom = top + h;

		dom_selection.style.left = left + 'px';
		dom_selection.style.top = top + 'px';

		dom_selection.style.width = w + 'px';
		dom_selection.style.height = h + 'px';

	}
});

var IS_CTRL_PRESSED = false;
window.onkeydown = function(e) {
	var keyCode = e.keyCode;
	if (keyCode == 17) {
		IS_CTRL_PRESSED = true;

	}
}

window.onkeyup = function(e) {
	var keyCode = e.keyCode;

	if (keyCode == 39) { // Arrow Right
		onChangePage(1);

		return;
	} else if (keyCode == 37) { // Arrow Left
		if (EDITOR_TIME_PAGE > 0) {
			onChangePage(-1);
		}
	} else if (keyCode == 46) { // Del
		if (IS_SELECTED) {
			IS_SELECTED = false;
			let selected = $(".selected");
			selected.removeAttr('led_color');
			selected.removeAttr('led_bright');
			selected.removeAttr('title');
			selected.removeClass("selected");
		}
	} else if (keyCode == 17) { // Ctrl
		IS_CTRL_PRESSED = false;
	} else if (keyCode == 27) { // Escape
		let selected = $(".selected");
		selected.removeClass("selected");
	}
	console.log(keyCode);

	switch (keyCode) {
		case 49:
			change_color('r');
			break;
		case 50:
			change_color('g');
			break;
		case 51:
			change_color('b');
			break;
		case 52:
			change_color('rg');
			break;
		case 53:
			change_color('gb');
			break;
		case 54:
			change_color('rb');
			break;
		case 55:
			change_color('rgb');
			break;
		case 107: // Plus
		case 187: // Plus
			change_bright(CURRENT_BRIGHT + 1);
			break;
		case 109: // Minus
		case 189:
			change_bright(CURRENT_BRIGHT - 1);
			break;
		case 83: // 's'
			if (EDITOR_MODE != EDITOR_SELECT_MODE) {
				EDITOR_MODE = EDITOR_SELECT_MODE;
				onModeChanged();
			}
			break;
		case 87: // 'w'
			if (EDITOR_MODE != EDITOR_WRITE_MODE) {
				EDITOR_MODE = EDITOR_WRITE_MODE;
				onModeChanged();
			}
			break;
		case 69: // 'e'
			if (EDITOR_MODE != EDITOR_ERASE_MODE) {
				EDITOR_MODE = EDITOR_ERASE_MODE;
				onModeChanged();
			}
			break;
		case 90: // 'z'
			if (IS_CTRL_PRESSED) {
				console.log('Revert!');
			}
		case 96:
			change_bright(1);
			break;
		case 97:
			change_bright(4);
			break;
		case 98:
			change_bright(7);
			break;
		case 99:
			change_bright(10);
			break;
		case 100:
			change_bright(13);
			break;
		case 101:
			change_bright(16);
			break;
		case 102:
			change_bright(19);
			break;
		case 103:
			change_bright(22);
			break;
		case 104:
			change_bright(25);
			break;
		case 105:
			change_bright(28);
			break;
	}
	e.preventDefault();
}
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


function move_block(offset_time, offset_led, is_copy) {
	var selected = $(".selected");

	var u_list = [];

	for (let i = 0; i < selected.length; i++) {
		let led_ch = parseInt(selected[i].getAttribute('led_ch'));
		let led_index = parseInt(selected[i].getAttribute('led_index'));
		let time_index = parseInt(selected[i].getAttribute('time_index'));
		let led_color = selected[i].getAttribute('led_color');
		let led_bright = selected[i].getAttribute('led_bright');


		u_list.push([led_ch * LED_MAX_SIZE + led_index, time_index, led_color, led_bright]);

	}

	console.log(is_copy);
	if (!is_copy) {
		selected.removeAttr('led_color');
		selected.removeAttr('led_bright');
		selected.removeAttr('title');
	}

	for (let t = 0; t < u_list.length; t++) {
		let v = u_list[t];

		v[0] = v[0] + offset_led;
		v[1] = v[1] + offset_time;

		if (v[0] < 0 || v[0] >= (LED_CHANNELS * LED_MAX_SIZE))
			continue;
		if (v[1] < 0 || v[1] >= (RENDER_SIZE_SEC * TIME_RESOLUTION))
			continue;

		let target = dom_arrays[v[0]][v[1]];

		target.setAttribute('led_color', v[2]);
		target.setAttribute('led_bright', v[3]);
		target.setAttribute('title', BRIGHT_MAP[v[3]] + ' %');
	}
	selected = $(".selected");
	selected.removeClass("selected");

}

function update_head() {
	// var minutes = Math.floor(time / 60);
	var dom = $(".ATPHeadBox");
	for (var col = 0; col < RENDER_SIZE_SEC; col++) {

		var sec = EDITOR_TIME_PAGE * RENDER_SIZE_SEC + col;
		var min = Math.floor(sec / 60);

		if (min > 0) {
			sec = sec - min * 60;
		}

		dom[col + 1].innerHTML = '<p>' + min + ' 분 ' + sec + ' 초</p>';
	}
}

function init_head(dom_row) {
	var w = $("#designer").innerWidth();
	var c = Math.floor(w / 30);

	var lebel_box = $('<div></div>', { class: "ATPHeadBox first" });
	lebel_box.html('&nbsp;');
	dom_row.append(lebel_box);

	for (var col = 0; col < RENDER_SIZE_SEC; col++) {
		var sec = EDITOR_TIME_PAGE * RENDER_SIZE_SEC + col;
		var min = Math.floor(sec / 60);

		if (min > 0) {
			sec = sec - min * 60;
		}
		var dom = $('<div></div>', { class: "ATPHeadBox" });
		dom.html('<p>' + min + ' 분 ' + sec + ' 초</p>');
		dom_row.append(dom);
	}

}
function init_timeline(dom_row, row_ch, row_led_idx) {
	var w = $("#designer").innerWidth();
	var c = Math.floor(w / 30);

	if (row_ch % 2 == 0) {
		var lebel_box = $('<div></div>', { class: "ATPLabelBox ATPGrayBG" });
	} else {
		var lebel_box = $('<div></div>', { class: "ATPLabelBox" });
	}
	lebel_box.html('<p>' + row_ch + ' [' + row_led_idx + ']</p>');
	dom_row.append(lebel_box);



	var dom_tl_arrays = [];


	for (var col = 0; col < RENDER_SIZE_SEC * TIME_RESOLUTION; col++) {
		if (row_led_idx == LED_MAX_SIZE - 1) {
			var box = $('<div></div>', { class: "ATPBox last" });
		} else {
			var box = $('<div></div>', { class: "ATPBox" });
		}

		dom_tl_arrays.push(box[0]);
		box.attr('led_ch', row_ch);
		box.attr('led_index', row_led_idx);
		box.attr('time_index', col);

		if (col % TIME_RESOLUTION == (TIME_RESOLUTION - 1)) {
			box.addClass('separate');
		}

		box.html('&nbsp;');
		box.on('mousemove', function(e) {
			if (!IS_MOUSE_DOWN)
				return;
			var data = $(this).attr('led_color');

			if (EDITOR_MODE == EDITOR_WRITE_MODE) {
				$(this).attr('led_color', CURRENT_COLOR);
				$(this).attr('led_bright', CURRENT_BRIGHT);
				$(this).attr('title', BRIGHT_MAP[CURRENT_BRIGHT] + ' %');

			} else if (EDITOR_MODE == EDITOR_ERASE_MODE) {
				if (data) {
					$(this).removeAttr('led_color');
					$(this).removeAttr('led_bright');
					$(this).removeAttr('title');
				}
			}


		});
		box.on('click', function() {
			var data = $(this).attr('led_color');
			if (EDITOR_MODE == EDITOR_WRITE_MODE) {
				$(this).attr('led_color', CURRENT_COLOR);
				$(this).attr('led_bright', CURRENT_BRIGHT);
				$(this).attr('title', BRIGHT_MAP[CURRENT_BRIGHT] + ' %');
			} else if (EDITOR_MODE == EDITOR_ERASE_MODE) {
				if (data) {
					$(this).removeAttr('led_color');
					$(this).removeAttr('led_bright');
					$(this).removeAttr('title');
				}
			}
		});
		dom_row.append(box);
	}

	dom_arrays.push(dom_tl_arrays);

}
$(document).ready(function() {
	var dom_row = $('<div></div>', { class: "ATPRow" });
	init_head(dom_row);
	$("#designer").append(dom_row);


	for (var row_ch = 0; row_ch < LED_CHANNELS; row_ch++) {
		for (var row_led_idx = 0; row_led_idx < LED_MAX_SIZE; row_led_idx++) {
			dom_row = $('<div></div>', { class: "ATPRow" });
			init_timeline(dom_row, row_ch, row_led_idx);
			$("#designer").append(dom_row);
		}
	}
});
