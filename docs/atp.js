'use strict'

var CURRENT_COLOR = 'r';

var CURRENT_BRIGHT = 28;
// const MAX_BRIGHT = 31;
// const BRIGHT_MAP = [0, 20, 25, 33, 38, 43, 48, 51, 55, 58, 61, 63, 66, 68, 71, 73, 76, 78, 81, 83, 85, 87, 88, 90, 93, 94, 95, 96, 97, 98, 99, 100]; Normal

const MAX_BRIGHT = 28;
const BRIGHT_MAP = [0, 20, 25, 33, 38, 43, 48, 51, 55, 58, 61, 63, 66, 68, 71, 73, 76, 78, 81, 83, 85, 87, 88, 90, 93, 94, 95, 96, 100]; // Economy

var RENDER_SIZE_SEC = 10;
var IS_MOUSE_DOWN = false;

const LED_ATPNODE_LED = 50;

var MOVE_ORIGIN;


var EDITOR_MODE = 0;
var EDITOR_TIME_PAGE = 0;

const EDITOR_WRITE_MODE = 0;
const EDITOR_ERASE_MODE = 1;
const EDITOR_SELECT_MODE = 2;


const TIME_DIV = 8;
const TIME_TICKS = 1000 / TIME_DIV;
const CELL_SIZE = 30;

var TIMELINE_OFFSET = 0;
var TIMELINE_SIZE = 5;

var LED_OFFSET = 0;
var LED_VIEW_SIZE = 50;

var LED_CHANNELS = 16;
var LED_MAX_SIZE = 50;

if (localStorage['atp_led_view_size'])
	LED_VIEW_SIZE = parseInt(localStorage['atp_led_view_size']);

if (localStorage['atp_timeline_size'])
	TIMELINE_SIZE = parseInt(localStorage['atp_timeline_size']);

if (localStorage['atp_led_max_size'])
	LED_MAX_SIZE = parseInt(localStorage['atp_led_max_size']);

if (localStorage['atp_led_channels'])
	LED_CHANNELS = parseInt(localStorage['atp_led_channels']);


if (LED_VIEW_SIZE > LED_CHANNELS * LED_MAX_SIZE) {
	LED_VIEW_SIZE = LED_CHANNELS * LED_MAX_SIZE;
}

$(".custom-select")[0].value = LED_VIEW_SIZE;
$(".custom-select")[1].value = TIMELINE_SIZE;
$(".custom-select")[2].value = LED_CHANNELS;
$(".custom-select")[3].value = LED_MAX_SIZE;

