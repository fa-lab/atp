#include "led_driver.h"

static Adafruit_NeoPixel strip(MAX_LED_COUNT, MUX_SIG, NEO_GRB + NEO_KHZ800);

static const uint8_t NEO_ALPHA[32] = { 0, 40, 50, 66, 77, 87, 96, 103, 110, 116,
		122, 127, 133, 137, 142, 147, 151, 155, 161, 167, 171, 174, 179, 181,
		186, 189, 191, 193, 195, 197, 199, 200 };

static uint8_t bRed[MAX_LED_COUNT];
static uint8_t bGreen[MAX_LED_COUNT];
static uint8_t bBlue[MAX_LED_COUNT];

#define SQRT_2_BY_2 0.70710678
#define SQRT_3_BY_3 0.57735027

static void _setMuxState(bool state) {
	if (state) {
		digitalWrite(MUX_EN, LOW);
	} else {
		digitalWrite(MUX_EN, HIGH);
	}
}

static void _setMuxChannel(uint8_t channel) {
	if ((channel & 0b00000001) == 0) {
		digitalWrite(MUX_S0, LOW);
	} else {
		digitalWrite(MUX_S0, HIGH);
	}
	if ((channel & 0b00000010) == 0) {
		digitalWrite(MUX_S1, LOW);
	} else {
		digitalWrite(MUX_S1, HIGH);
	}
	if ((channel & 0b00000100) == 0) {
		digitalWrite(MUX_S2, LOW);
	} else {
		digitalWrite(MUX_S2, HIGH);
	}
	if ((channel & 0b00001000) == 0) {
		digitalWrite(MUX_S3, LOW);
	} else {
		digitalWrite(MUX_S3, HIGH);
	}
	delayMicroseconds(1);
}

void led_init() {
	pinMode(MUX_EN, OUTPUT);
	pinMode(MUX_SIG, OUTPUT);
	pinMode(MUX_S3, OUTPUT);
	pinMode(MUX_S2, OUTPUT);
	pinMode(MUX_S1, OUTPUT);
	pinMode(MUX_S0, OUTPUT);

	_setMuxState(true);
	strip.begin();
}

static void _led_set_color(uint8_t index, uint8_t led_color,
		uint8_t led_level) {
	index = index % MAX_LED_COUNT;
	led_level = led_level % 32;
	led_color = led_color % 8;
	uint8_t counter = 0;

	if ((led_color & 0b100) == 0) {
		// R
		bRed[index] = 0;
	} else {
		counter++;
		bRed[index] = NEO_ALPHA[led_level];

	}

	if ((led_color & 0b010) == 0) {
		// G
		bGreen[index] = 0;
	} else {
		counter++;
		bGreen[index] = NEO_ALPHA[led_level];

	}

	if ((led_color & 0b001) == 0) {
		// B
		bBlue[index] = 0;
	} else {
		counter++;
		bBlue[index] = NEO_ALPHA[led_level];
	}

	if (counter == 2) {
		bRed[index] = bRed[index] * SQRT_2_BY_2;
		bGreen[index] = bGreen[index] * SQRT_2_BY_2;
		bBlue[index] = bBlue[index] * SQRT_2_BY_2;
	} else if (counter == 3) {
		bRed[index] = bRed[index] * SQRT_3_BY_3;
		bGreen[index] = bGreen[index] * SQRT_3_BY_3;
		bBlue[index] = bBlue[index] * SQRT_3_BY_3;
	}
}
void led_set_color(uint8_t index, uint8_t led_data) {
	uint8_t level = (led_data & 0b00011111);
	uint8_t color = ((led_data >> 5) & 0b00000111);
	_led_set_color(index, color, level);
}

void led_clear() {
	for (uint8_t i = 0; i < MAX_LED_COUNT; i++) {
		bRed[i] = 0;
		bGreen[i] = 0;
		bBlue[i] = 0;
	}
}
void led_set_buffer() {
	for (uint8_t i = 0; i < MAX_LED_COUNT; i++) {
		strip.setPixelColor(i, bRed[i], bGreen[i], bBlue[i]);
	}

}
void led_show(uint8_t channel) {
	_setMuxChannel(channel);
	strip.show();
}
