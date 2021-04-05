#ifndef LED_DRIVER_H_
#define LED_DRIVER_H_

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>

#define MAX_LED_COUNT 50

#define MUX_CHANNEL 16

#define MUX_EN 21 // CSI_D3
#define MUX_SIG 25 // CSI_VSYNC
#define MUX_S3 23 // CSI_HSYNC
#define MUX_S2 5 // CSI_D0
#define MUX_S1 18 // CSI_D1
#define MUX_S0 19 // CSI_D2

void led_init();

void led_clear();

void led_set_buffer();

void led_set_color(uint8_t index, uint8_t led_data);

void led_show(uint8_t channel);
#endif
