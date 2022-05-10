#include "buffer.h"

static volatile uint8_t *buffer_ptr = 0;
static volatile unsigned long buffer_total_w = 0;
static volatile unsigned long buffer_total_r = 0;
static volatile unsigned long buffer_size = 0;
static volatile unsigned long buffer_index_w = 0;
static volatile unsigned long buffer_index_r = 0;

void buffer_init(uint8_t *ptr, uint32_t size) {
  buffer_ptr = ptr;
  buffer_size = size;
  buffer_clear();
}

bool buffer_is_written() { return (buffer_total_w > 0); }
unsigned long buffer_writable() {
  return (buffer_size - buffer_index_w) + buffer_index_r;
}

void buffer_reset_read() {
  buffer_total_r = 0;
  buffer_index_r = 0;
}

void buffer_clear() {
  buffer_total_w = 0;
  buffer_total_r = 0;
  buffer_index_w = 0;
  buffer_index_r = 0;
}

void buffer_unsafe_write(uint8_t v) {
  buffer_ptr[buffer_index_w++] = v;
  buffer_total_w++;

  if (buffer_index_w == buffer_size) buffer_index_w = 0;
}

uint8_t buffer_eof() { return (buffer_total_w == buffer_total_r); }

uint8_t buffer_unsafe_read() {
  uint8_t value = buffer_ptr[buffer_index_r++];
  buffer_total_r++;

  if (buffer_index_r == buffer_size) buffer_index_r = 0;
  return value;
}
