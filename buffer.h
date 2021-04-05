#ifndef BUFFER_H_
#define BUFFER_H_

#include <Arduino.h>

unsigned long buffer_writable();

void buffer_init(uint8_t *ptr, uint32_t size);

void buffer_clear();

void buffer_unsafe_write(uint8_t v);

void buffer_reset_read();

bool buffer_is_written();

uint8_t buffer_eof();

uint8_t buffer_unsafe_read();

#endif /* BUFFER_H_ */
