'use strict'

var LED_CHANNELS = 16;
var LED_MAX_SIZE = 50;
var LED_ATPNODE_LED = 50;



const TIME_RESOLUTION = 8;
const TIME_TICKS = (1000 / TIME_RESOLUTION);
var RENDER_SIZE_SEC = 10;

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


var editor_datas = [];
var dom_arrays = [];

function onFileChoose(input) {
	if (input.files && input.files[0]) {
		var oFReader = new FileReader();
		oFReader.readAsText(input.files[0]);
		oFReader.onload = function(oFREvent) {

			load_project(oFReader.result);
		};
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
				data_buffer[led_index] = color + ',' + bright;
			}

			bin_data.push([parseInt(led_ch), dt, data_buffer.slice()]);
			// console.log('\t' + str);
			dt = 0;
		}
	} else {
		bin_data.push([-1, dt]);
	}
}

function choose_file() {
	document.getElementById('theFile').click();
}
function reload_project() {
	let fj_result = JSON.parse(localStorage['atp_data']);

	editor_datas = fj_result;
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
				getAsData(dt, t_datas[t_idx]);
				last_t_idx = t_idx;
				last_t = target_t;
			}

		}
	}
	target_t = target_t + TIME_TICKS;
	getAsData(TIME_TICKS);

	start_t = 0;
	for (var i = 0; i < bin_data.length; i++) {

		let idx = bin_data[i][0];
		let dt = bin_data[i][1];
		let d = bin_data[i][2];
		start_t += dt;

		setTimeout(createfunc(idx, d), start_t);
	}
}
function createfunc(idx, d) {
	if (idx != -1 && d) {
		return function() {
			// dom_arrays : [ led_length x led_ch]
			for (var i = 0; i < dom_arrays.length; i++) {
				if (d[i] == 0) {
					dom_arrays[i][idx].removeAttribute('led_color');
					dom_arrays[i][idx].removeAttribute('led_bright');
				} else {
					let c = d[i].split(',', 2)[0];
					let b = d[i].split(',', 2)[1];
					dom_arrays[i][idx].setAttribute('led_color', c);
					dom_arrays[i][idx].setAttribute('led_bright', b);
				}
			}
		};
	} else {
		return function() {
			$('.ATPSimBox').removeAttr('led_color');
			$('.ATPSimBox').removeAttr('led_bright');
		};
	}

}


$(document).ready(function() {
	var dom_row;
	dom_arrays = [];
	for (var row_led_idx = 0; row_led_idx < LED_MAX_SIZE; row_led_idx++) {
		dom_row = $('<div></div>', { class: "ATPRow" });
		var dom_tl_arrays = [];
		for (var row_ch = 0; row_ch < LED_CHANNELS; row_ch++) {

			var box = $('<div></div>', { class: "ATPBox ATPSimBox" });

			dom_tl_arrays.push(box[0]);
			box.attr('led_ch', row_ch);
			box.attr('led_index', row_led_idx);


			box.html('&nbsp;');
			dom_row.append(box);

		}
		dom_arrays.push(dom_tl_arrays);
		$("#designer").append(dom_row);
	}
	reload_project();

});
