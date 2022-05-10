#ifndef _ATP_ESP32_H_
#define _ATP_ESP32_H_
#include <Arduino.h>
#include <FS.h>
#include <SD_MMC.h>
#include <WiFi.h>
#include <WiFiUdp.h>

#include "buffer.h"
#include "led_driver.h"

#define DEBUG 1

#ifdef DEBUG
#define PRINT(x) Serial.print(x)
#define PRINTLN(x) Serial.println(x)
#else
#define PRINT(x)
#define PRINTLN(x)
#endif

#define STATE_INIT 'a'
#define STATE_REQUEST_SCENARIO 'b'
#define STATE_READY 'c'
#define STATE_REQUEST_PLAY 'd'
#define STATE_PLAY 'e'

#define UDP_PACKET_SIZE 64
#define UDP_MOSI 3333
#define UDP_MISO 3334

#define OPCODE_LENGTH 2
#define OPCODE_EOL_CHAR ';'

#define OPCODE_FIND "!F"
#define OPCODE_INFO "!I"
#define OPCODE_SCENARIO_GET "!C"
#define OPCODE_SCENARIO_LOAD "!L"
#define OPCODE_START "!S"
#define OPCODE_STOP "!X"
#define OPCODE_GET_DATA "!G"
#define OPCODE_SET_DATA "!D"

#define PIN_LED 33

void connect_wifi();

void WiFiEvent(WiFiEvent_t);

void task_sd_reader(void*);

void task_udp_server(void*);
#endif /* _ATP_ESP32_H_ */
