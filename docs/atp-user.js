'use strict';

var DRAW_SELECTION_BOX = false;
var SELECTION_BOX_ACTIONS = false;

function message(msg) {
	let tl = document.getElementById('message-box');
	if (msg) {
		tl.innerHTML = msg;
	} else {
		tl.innerHTML = '&nbsp;';
	}
}

function paste_block() {
	if (table_copied.length == 0) {
		message('복사된 셀이 없습니다.');
		return;
	}

	let row_offset = -1;
	let col_offset = -1;
	for (let row = 0; row < LED_VIEW_SIZE; row++) {
		for (let col = 0; col < TIMELINE_SIZE * TIME_DIV; col++) {
			if (table_elements[row][col].hovered) {
				row_offset = row;
				col_offset = col;
				break;
			}
		}

		if (row_offset != -1 && col_offset != -1) {
			break;
		}
	}

	if (row_offset == -1 && col_offset == -1) {
		return;
	}
	clearSelection();
	for (let i = 0; i < table_copied.length; i++) {
		let row = table_copied[i][0] + row_offset;
		let col = table_copied[i][1] + col_offset;

		if (row >= 0 && row < LED_VIEW_SIZE && col < (TIMELINE_SIZE * TIME_DIV) && col >= 0) {
			// console.log(row, col);
			table_elements[row][col].setAttribute('led_color', table_copied[i][2]);
			table_elements[row][col].setAttribute('led_bright', table_copied[i][3]);
			table_elements[row][col].setAttribute('title', BRIGHT_MAP[parseInt(table_copied[i][3])] + ' %');
		}
	}
	syncData();
	saveLocalStorage();
	message('붙여넣었습니다.');
}

function copy_block() {
	if (table_selected.length == 0) {
		message('선택된 셀이 없습니다.');
		return;
	}

	table_copied = [];
	let min_row = LED_VIEW_SIZE;
	let min_col = TIMELINE_SIZE * TIME_DIV;
	for (let i = 0; i < table_selected.length; i++) {
		let row = parseInt(table_selected[i].getAttribute('row'));
		let col = parseInt(table_selected[i].getAttribute('col'));

		if (min_col > col) {
			min_row = row;
			min_col = col;
		} else if (min_col == col) {
			if (min_row > row) {
				min_row = row;
			}
		}
		table_copied.push([row, col, table_selected[i].getAttribute('led_color'), table_selected[i].getAttribute('led_bright')]);
	}

	for (let i = 0; i < table_copied.length; i++) {

		table_copied[i][0] -= min_row;
		table_copied[i][1] -= min_col;
	}
	message('복사되었습니다.');
}

function move_block(row_offset, col_offset) {
	// console.log('move_block', table_selected, row_offset, col_offset);
	if (table_selected.length == 0)
		return;
	let targets = [];
	for (let i = 0; i < table_selected.length; i++) {
		let row = parseInt(table_selected[i].getAttribute('row'));
		let col = parseInt(table_selected[i].getAttribute('col'));
		targets.push([row + row_offset, col + col_offset, table_selected[i].getAttribute('led_color'), table_selected[i].getAttribute('led_bright')]);

		if (!IS_CTRL_PRESSED) {
			table_selected[i].removeAttribute('led_color');
			table_selected[i].removeAttribute('led_bright');
			table_selected[i].removeAttribute('title');
		}
	}
	clearSelection();
	for (let i = 0; i < targets.length; i++) {
		let row = targets[i][0];
		let col = targets[i][1];

		if (row >= 0 && row < LED_VIEW_SIZE && col < (TIMELINE_SIZE * TIME_DIV) && col >= 0) {
			// console.log(row, col);
			table_elements[row][col].setAttribute('led_color', targets[i][2]);
			table_elements[row][col].setAttribute('led_bright', targets[i][3]);
			table_elements[row][col].setAttribute('title', BRIGHT_MAP[parseInt(targets[i][3])] + ' %');

			table_selected.push(table_elements[row][col]);
			table_elements[row][col].className = (table_elements[row][col].className.replace('selected', '') + ' selected').trim();
		}
	}
	syncData();

}

window.onkeyup = function(e) {
	var keyCode = e.keyCode;

	if (keyCode == 46) { // Del
		recordAction();
		delSelection();
		saveLocalStorage();
	} else if (keyCode == 17) { // Ctrl
		// console.log('Ctrl Released');
		IS_CTRL_PRESSED = false;
	} else if (keyCode == 27) { // Escape
		clearSelection();
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
		case 64: // 'a'
			break;
		case 67: // 'c'
			if (IS_CTRL_PRESSED) {
				recordAction();
				copy_block();
			}
			break;
		case 86: // 'v'
			if (IS_CTRL_PRESSED) {
				recordAction();
				paste_block();
			}
			break;
		case 90: // 'z'
			if (IS_CTRL_PRESSED) {
				console.log('revert');
				// revertAction();
			}
			break;
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
};
window.onkeydown = function(evt) {
	let max_offset = LED_CHANNELS * LED_MAX_SIZE - LED_VIEW_SIZE
	switch (evt.keyCode) {
		case 33: // PageUp
			if (LED_OFFSET == 0) {
				return;
			} else {
				LED_OFFSET -= 5;
				if (LED_OFFSET < 0) {
					LED_OFFSET = 0;
				}
				update_table();
				evt.preventDefault();
			}
			break;
		case 34: // PageDown
			if (LED_OFFSET == max_offset) {
				return;
			} else {
				LED_OFFSET += 5;
				if (LED_OFFSET >= max_offset) {
					LED_OFFSET = max_offset - 1;
				}
				update_table();
				evt.preventDefault();
			}
			break;
		case 17: // Ctrl
			IS_CTRL_PRESSED = true;
			evt.preventDefault();
			break;
		case 38: // ArrowUp
			if (LED_OFFSET == 0) {
				return;
			} else {
				LED_OFFSET -= 1;
				update_table();
				evt.preventDefault();
			}
			break;
		case 40: // ArrowDown
			if (LED_OFFSET == max_offset) {
				return;
			} else {
				LED_OFFSET += 1;
				update_table();
				evt.preventDefault();
			}
			break;
		case 37: // ArrowLeft
			if (TIMELINE_OFFSET == 0) {
				return;
			} else {
				TIMELINE_OFFSET -= 1;
				update_table();
				evt.preventDefault();
			}
			break;
		case 39: // ArrowRight
			TIMELINE_OFFSET += 1;
			update_table();
			evt.preventDefault();
			break;
	}
};

document.getElementById('designer').onmousedown = function(e) {
	if (EDITOR_MODE == EDITOR_SELECT_MODE) {
		dom_selection.row = parseInt(e.target.getAttribute("row"));
		dom_selection.col = parseInt(e.target.getAttribute("col"));
		if (e.target.className.includes('selected')) {
			SELECTION_BOX_ACTIONS = true;
		} else {
			SELECTION_BOX_ACTIONS = false;
			DRAW_SELECTION_BOX = true;
			clearSelection();
			dom_selection.style.display = 'block';
			dom_selection.startX = e.clientX + window.scrollX;
			dom_selection.startY = e.clientY + window.scrollY;
		}
	} else {
		recordAction();
	}
	IS_MOUSE_DOWN = true;
};

document.getElementById('designer').onmouseup = function(e) {
	if (EDITOR_MODE == EDITOR_SELECT_MODE) {
		DRAW_SELECTION_BOX = false;

		dom_selection.style.width = 0 + 'px';
		dom_selection.style.height = 0 + 'px';
		dom_selection.style.display = 'none';

		let t_row = parseInt(e.target.getAttribute("row"));
		let t_col = parseInt(e.target.getAttribute("col"));

		let box_left = Math.min(dom_selection.col, t_col);
		let box_top = Math.min(dom_selection.row, t_row);

		let box_right = Math.max(dom_selection.col, t_col);
		let box_bottom = Math.max(dom_selection.row, t_row);

		if (SELECTION_BOX_ACTIONS) {
			if (e.button == 0) { // Left
				move_block(t_row - dom_selection.row, t_col - dom_selection.col);
			} else if (e.button == 2) { // Right
				console.log('Right Click');

				for (let i = 0; i < table_selected.length; i++) {
					table_selected[i].setAttribute('led_color', CURRENT_COLOR);
					table_selected[i].setAttribute('led_bright', CURRENT_BRIGHT);
					table_selected[i].setAttribute('title', BRIGHT_MAP[CURRENT_BRIGHT] + ' %');

				}
				syncData();
			}
		} else {
			for (let row = box_top; row < box_bottom; row++) {
				for (let col = box_left; col < box_right; col++) {
					if (table_elements[row][col].hasAttribute('led_color')) {
						table_elements[row][col].className = (table_elements[row][col].className.replace('selected', '') + ' selected').trim();
						table_selected.push(table_elements[row][col]);
					}
				}
			}
		}
	}
	saveLocalStorage();
	IS_MOUSE_DOWN = false;
};

document.getElementById('designer').onmousemove = function(e) {
	let left = e.clientX + 18 + window.scrollX;
	let top = e.clientY + 18 + window.scrollY;

	dom_color_pallet.style.left = left + 'px';
	dom_color_pallet.style.top = top + 'px';

	if (EDITOR_MODE == EDITOR_SELECT_MODE && DRAW_SELECTION_BOX) {
		dom_selection.endX = e.clientX + window.scrollX;
		dom_selection.endY = e.clientY + window.scrollY;

		let left = Math.min(dom_selection.startX, dom_selection.endX);
		let top = Math.min(dom_selection.startY, dom_selection.endY);

		let w = Math.max(dom_selection.startX, dom_selection.endX) - left;
		let h = Math.max(dom_selection.startY, dom_selection.endY) - top;

		dom_selection.style.left = left + 'px';
		dom_selection.style.top = top + 'px';

		dom_selection.style.width = w + 'px';
		dom_selection.style.height = h + 'px';

	}
};
