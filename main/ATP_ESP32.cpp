// Do not remove the include below
#include "ATP_ESP32.h"

static uint64_t chipid = ESP.getEfuseMac();
static boolean isConnected = false;

static WiFiUDP udp;
static TaskHandle_t Task1, Task2;

static volatile unsigned long offset_millis = 0;
static volatile unsigned long start_millis = 0;
static volatile unsigned long target_millis = 0;

static String atpname = "Hello Node";
static String ssid = "Jaeho's";
static String password = "cb920328ok!";
static String alt_ssid = "Jaeho's";
static String alt_password = "cb920328ok!";

static String scenarios[32];
static uint8_t size_scenario = 0;

// a : init [Scenario Not Set]
// b : scenario [Scenario set & request]
// c : scenario [Scenario Load]
// d : play request
// p : playing
static uint8_t state = STATE_INIT;

unsigned long last_btn_pressed = 0;

static String target_file;

bool use_alt_ssid = false;

void saveConfig() {
  File f_config;
  f_config = SD_MMC.open("/config.txt", FILE_WRITE);
  f_config.print("atpname=");
  f_config.println(atpname);

  f_config.print("ssid=");
  f_config.println(ssid);

  f_config.print("password=");
  f_config.println(password);

  f_config.print("alt_ssid=");
  f_config.println(alt_ssid);

  f_config.print("alt_password=");
  f_config.println(alt_password);
  f_config.close();
}

void setup() {
  pinMode(PIN_LED, OUTPUT);
  pinMode(0, INPUT);

  digitalWrite(PIN_LED, LOW);

  led_init();

  led_clear();

#ifdef DEBUG
  Serial.begin(115200);
#endif

  boolean initMMC = false;
  uint8_t cardType = 0;

  while (!initMMC) {
    initMMC = true;
    if (SD_MMC.begin("/", false, true, BOARD_MAX_SDMMC_FREQ)) {
      cardType = SD_MMC.cardType();
      if (cardType == CARD_NONE) {
        PRINTLN("No SD card attached");
        initMMC = false;
      }
    } else {
      PRINTLN("Card Mount Failed");
      initMMC = false;
    }

    if (!initMMC) {
      PRINTLN("Wait for 5s...");
      delay(5000);
    }
  }

  PRINT("SD Card Type: ");
  if (cardType == CARD_MMC) {
    PRINTLN("MMC");
  } else if (cardType == CARD_SD) {
    PRINTLN("SDSC");
  } else if (cardType == CARD_SDHC) {
    PRINTLN("SDHC");
  } else {
    PRINTLN("UNKNOWN");
  }
  File f_config;
  if (!SD_MMC.exists("/config.txt")) {
    PRINTLN("SAVE CONFIG");
    saveConfig();
  }

  f_config = SD_MMC.open("/config.txt", FILE_READ);
  if (!f_config) {
    PRINTLN("Failed to open config.txt");
    delay(3000);
    ESP.restart();
  }

  char buf[64];
  int idx = 0;

  String tmp;
  String key;
  String val;
  while (f_config.available()) {
    idx = f_config.readBytesUntil('\n', buf, sizeof(buf));
    buf[idx] = 0;

    tmp = String(buf);
    idx = tmp.indexOf('=');
    if (idx == -1) continue;
    key = tmp.substring(0, idx);
    val = tmp.substring(idx + 1);
    key.trim();
    val.trim();

    if (key.length() > 0 && val.length() > 0) {
      PRINT(key);
      PRINT(" : ");
      PRINTLN(val);

      if (key.equalsIgnoreCase("atpname")) {
        atpname = val;
      } else if (key.equalsIgnoreCase("ssid")) {
        ssid = val;
      } else if (key.equalsIgnoreCase("password")) {
        password = val;
      } else if (key.equalsIgnoreCase("alt_ssid")) {
        alt_ssid = val;
      } else if (key.equalsIgnoreCase("alt_password")) {
        alt_password = val;
      }
    }
  }
  f_config.close();

  File root = SD_MMC.open("/");
  if (!root) {
    PRINTLN("Failed to open directory");
    delay(3000);
    ESP.restart();
  }
  File file = root.openNextFile();
  while (file) {
    String mystring(file.name());
    if (mystring.endsWith(".atp") && mystring.length() < 13 &&
        mystring.length() > 4) {
      PRINT("  FILE: ");
      PRINT(mystring);
      PRINT("  SIZE: ");
      PRINTLN(file.size());
      scenarios[size_scenario++] = mystring;
    }
    file = root.openNextFile();
  }
  PRINT("SD Card Size: ");
  PRINT((int)SD_MMC.cardSize() / (1024 * 1024));
  PRINTLN("MB");

  PRINT("setup() running on core ");
  PRINT("Total heap: ");
  PRINTLN(ESP.getHeapSize());
  PRINT("Free heap: ");
  PRINTLN(ESP.getFreeHeap());
  PRINT("Total PSRAM: ");
  PRINTLN(ESP.getPsramSize());
  PRINT("Free PSRAM: ");
  PRINTLN(ESP.getFreePsram());
  PRINTLN(xPortGetCoreID());

  uint32_t buffer_size = ESP.getFreePsram();
  // uint8_t *buffer_ptr = (uint8_t *)ps_malloc(buffer_size);
  uint8_t *buffer_ptr = (uint8_t *)ps_malloc(4000000);
  if (buffer_ptr == NULL) {
    PRINTLN("Failed to allocated");
  } else {
    PRINTLN("allocated!!");
  }
  buffer_init(buffer_ptr, buffer_size);

  xTaskCreatePinnedToCore(
      task_udp_server,   /* Task function. */
      "task_udp_server", /* name of task. */
      8192,              /* Stack size of task */
      NULL,              /* parameter of the task */
      1,                 /* priority of the task */
      &Task1,            /* Task handle to keep track of created task */
      0);                /* pin task to core 0 */

  xTaskCreatePinnedToCore(
      task_sd_reader,   /* Task function. */
      "task_sd_reader", /* name of task. */
      8192,             /* Stack size of task */
      NULL,             /* parameter of the task */
      0,                /* priority of the task */
      &Task2,           /* Task handle to keep track of created task */
      0);               /* pin task to core 0 */

  connect_wifi();
  WiFi.onEvent(WiFiEvent);
}

void task_sd_reader(void *pvParameters) {
  for (;;) {
    if (state == STATE_REQUEST_SCENARIO) {
      File file;
      if (SD_MMC.exists(target_file)) {
        PRINTLN("FILE Found");
        file = SD_MMC.open(target_file, FILE_READ);
        if (file) {
          state = STATE_READY;
          buffer_clear();
          while (file.available() &&
                 (state == STATE_READY || state == STATE_REQUEST_PLAY ||
                  state == STATE_PLAY)) {
            if (buffer_writable() == 0) {
              vTaskDelay(500);
              continue;
            }
            buffer_unsafe_write(file.read());
          }
          file.close();
        }
      } else {
        PRINTLN("FILE Not Found");
      }

      if (state == STATE_REQUEST_SCENARIO) {
        state = STATE_INIT;
      }
    }

    vTaskDelay(100);
  }
}
void task_udp_server(void *pvParameters) {
  int packetSize;
  char packetBuffer[UDP_PACKET_SIZE + 1];
  for (;;) {
    if (isConnected) {
      packetSize = udp.parsePacket();

      if (packetSize) {
        IPAddress remoteIp = udp.remoteIP();
        int len = udp.read(packetBuffer, UDP_PACKET_SIZE);
        if (len >= (OPCODE_LENGTH + 1) &&
            packetBuffer[len - 1] == OPCODE_EOL_CHAR) {
          packetBuffer[len] = 0;
        } else {
          // Invalid Payload;
          continue;
        }
        String udp_payload = String(packetBuffer);

        String opcode = udp_payload.substring(0, OPCODE_LENGTH);
        String payload;
        bool is_contain_payload = false;
        if (len > (OPCODE_LENGTH + 1)) {
          is_contain_payload = true;
          payload = udp_payload.substring(OPCODE_LENGTH, len - 1);
        }

        PRINT("opcode [");
        PRINT(opcode);
        PRINTLN("]");
        if (is_contain_payload) {
          PRINT("payload [");
          PRINT(payload);
          PRINTLN("]");
        }

        if (opcode.equals(OPCODE_FIND)) {
          udp.beginPacket(remoteIp, UDP_MISO);
          udp.print(OPCODE_FIND);
          udp.print(OPCODE_EOL_CHAR);
          udp.endPacket();
        } else if (opcode.equals(OPCODE_INFO)) {
          udp.beginPacket(remoteIp, UDP_MISO);
          udp.print(OPCODE_INFO);
          udp.write(state);
          udp.print(OPCODE_EOL_CHAR);
          udp.endPacket();
        } else if (opcode.equals(OPCODE_SCENARIO_GET)) {
          if (is_contain_payload) {
            int page = payload.toInt();
            udp.beginPacket(remoteIp, UDP_MISO);
            udp.print(OPCODE_SCENARIO_GET);
            for (int i = 0; i < 8; i++) {
              if (page + i >= size_scenario) break;
              if (i != 0) udp.print(',');
              udp.print(scenarios[page + i]);
            }
            udp.print(OPCODE_EOL_CHAR);
            udp.endPacket();
          }
        } else if (opcode.equals(OPCODE_SCENARIO_LOAD)) {
          if (is_contain_payload) {
            int selected_index = -1;
            for (int i = 0; i < size_scenario; i++) {
              if (scenarios[i].equals(payload)) {
                selected_index = i;
                break;
              }
            }
            udp.beginPacket(remoteIp, UDP_MISO);
            udp.print(OPCODE_SCENARIO_LOAD);
            if (state != STATE_INIT) {
              udp.print("Not Init state");
            } else {
              if (selected_index == -1) {
                udp.print("Scenario Not Found");
              } else {
                target_file = String("/" + scenarios[selected_index]);
                state = STATE_REQUEST_SCENARIO;
              }
            }
            udp.print(OPCODE_EOL_CHAR);
            udp.endPacket();
          }
        } else if (opcode.equals(OPCODE_START)) {
          if (state == STATE_READY) {
            offset_millis = 0;
            if (is_contain_payload) {
              long offset = payload.toInt();
              if (offset > 0) offset_millis = offset;
            }
            state = STATE_REQUEST_PLAY;
            udp.beginPacket(remoteIp, UDP_MISO);
            udp.print(OPCODE_START);
            udp.print(OPCODE_EOL_CHAR);
            udp.endPacket();
          } else {
            udp.beginPacket(remoteIp, UDP_MISO);
            udp.print(OPCODE_START);
            udp.print("Not Ready");
            udp.print(OPCODE_EOL_CHAR);
            udp.endPacket();
          }
        } else if (opcode.equals(OPCODE_STOP)) {
          if (state == STATE_REQUEST_PLAY || state == STATE_PLAY) {
            state = STATE_INIT;
          }
          udp.beginPacket(remoteIp, UDP_MISO);
          udp.print(OPCODE_STOP);
          udp.print(OPCODE_EOL_CHAR);
          udp.endPacket();
        } else if (opcode.equals(OPCODE_GET_DATA)) {
          if (is_contain_payload) {
            udp.beginPacket(remoteIp, UDP_MISO);
            udp.print(OPCODE_GET_DATA);
            if (payload.equalsIgnoreCase("atpname")) {
              udp.print("atpname=");
              udp.print(atpname);
            } else if (payload.equalsIgnoreCase("ssid")) {
              udp.print("ssid=");
              udp.print(ssid);
            } else if (payload.equalsIgnoreCase("password")) {
              udp.print("password=");
              udp.print(password);
            } else if (payload.equalsIgnoreCase("alt_ssid")) {
              udp.print("alt_ssid=");
              udp.print(alt_ssid);
            } else if (payload.equalsIgnoreCase("alt_password")) {
              udp.print("alt_password=");
              udp.print(alt_password);
            }
            udp.print(OPCODE_EOL_CHAR);
            udp.endPacket();
          }
        } else if (opcode.equals(OPCODE_SET_DATA)) {
          if (is_contain_payload) {
            int selected_index = payload.indexOf('=');
            if (selected_index != -1) {
              String key = payload.substring(0, selected_index);
              String val = payload.substring(selected_index + 1);
              bool needSave = false;
              key.trim();
              val.trim();
              if (key.equalsIgnoreCase("atpname")) {
                atpname = val;
                needSave = true;
              } else if (key.equalsIgnoreCase("ssid")) {
                ssid = val;
                needSave = true;
              } else if (key.equalsIgnoreCase("password")) {
                password = val;
                needSave = true;
              } else if (key.equalsIgnoreCase("alt_ssid")) {
                alt_ssid = val;
                needSave = true;
              } else if (key.equalsIgnoreCase("alt_password")) {
                alt_password = val;
                needSave = true;
              }
              if (needSave) saveConfig();
            }
            udp.beginPacket(remoteIp, UDP_MISO);
            udp.print(OPCODE_SET_DATA);
            udp.print(OPCODE_EOL_CHAR);
            udp.endPacket();
          }
        }
      }
    }
    vTaskDelay(10);
  }
}

void loop() {
  uint8_t c;
  unsigned long target_dt;
  uint16_t target_strip = 0;
  if (state == STATE_REQUEST_PLAY) {
    start_millis = millis();
    state = STATE_PLAY;
    target_millis = start_millis;
    buffer_reset_read();

    char bc[48];
    uint8_t bc_idx = 0;
    uint8_t led_idx = 0;
    bool data_payload = false;

    if (buffer_is_written()) {
      while (!buffer_eof() && state == STATE_PLAY) {
        c = buffer_unsafe_read();

        if (data_payload) {
          led_set_color(led_idx++, c);

          if (led_idx == MAX_LED_COUNT) {
            led_idx = 0;
            data_payload = false;
            led_set_buffer();

            target_millis += target_dt;
            while (millis() < target_millis) {
              vTaskDelay(5);
            }

            if ((target_strip & 0b0000000000000001) != 0) {
              led_show(0);
            }
            if ((target_strip & 0b0000000000000010) != 0) {
              led_show(1);
            }
            if ((target_strip & 0b0000000000000100) != 0) {
              led_show(2);
            }
            if ((target_strip & 0b0000000000001000) != 0) {
              led_show(3);
            }
            if ((target_strip & 0b0000000000010000) != 0) {
              led_show(4);
            }
            if ((target_strip & 0b0000000000100000) != 0) {
              led_show(5);
            }
            if ((target_strip & 0b0000000001000000) != 0) {
              led_show(6);
            }
            if ((target_strip & 0b0000000010000000) != 0) {
              led_show(7);
            }
            if ((target_strip & 0b0000000100000000) != 0) {
              led_show(8);
            }
            if ((target_strip & 0b0000001000000000) != 0) {
              led_show(9);
            }
            if ((target_strip & 0b0000010000000000) != 0) {
              led_show(10);
            }
            if ((target_strip & 0b0000100000000000) != 0) {
              led_show(11);
            }
            if ((target_strip & 0b0001000000000000) != 0) {
              led_show(12);
            }
            if ((target_strip & 0b0010000000000000) != 0) {
              led_show(13);
            }
            if ((target_strip & 0b0100000000000000) != 0) {
              led_show(14);
            }
            if ((target_strip & 0b1000000000000000) != 0) {
              led_show(15);
            }
          }
        }

        if (c == '!') {
          bc_idx = 0;
        } else if (c == ';') {
          bc[bc_idx] = 0;
          String req = String(bc);
          int selected_index = req.indexOf(',');

          PRINT("REQ :");
          PRINT(selected_index);
          PRINTLN(req);

          if (selected_index > -1 && selected_index < (bc_idx - 1)) {
            target_dt = req.substring(0, selected_index).toInt();
            target_strip = req.substring(selected_index + 1).toInt();
            data_payload = true;
          }
        } else {
          bc[bc_idx++] = c;
          if (bc_idx == 48) bc_idx = 0;
        }
      }
    }

    state = STATE_INIT;
  } else {
    if (digitalRead(0) == LOW) {
      if (last_btn_pressed == 0) {
        last_btn_pressed = millis();
      } else {
        if (millis() > (last_btn_pressed + 1500)) {
          last_btn_pressed = 999999999;

          use_alt_ssid = !use_alt_ssid;

          if (use_alt_ssid) {
            digitalWrite(PIN_LED, HIGH);
          } else {
            digitalWrite(PIN_LED, LOW);
          }
          connect_wifi();
        }
      }

    } else {
      last_btn_pressed = 0;
    }
  }
  vTaskDelay(10);
}

void connect_wifi() {
  PRINTLN("Connecting to WiFi network: " + String(ssid));
  WiFi.disconnect(true);
  udp.stop();

  if (use_alt_ssid) {
    WiFi.begin(alt_ssid.c_str(), alt_password.c_str());
  } else {
    WiFi.begin(ssid.c_str(), password.c_str());
  }
  PRINTLN("Waiting for WIFI connection...");
}

void WiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case SYSTEM_EVENT_STA_GOT_IP:
      // When connected set
      PRINT("WiFi connected! IP address: ");
      PRINTLN(WiFi.localIP());
      udp.begin(WiFi.localIP(), UDP_MOSI);
      isConnected = true;
      break;
    case SYSTEM_EVENT_STA_DISCONNECTED:
      PRINTLN("WiFi lost connection");
      isConnected = false;
      break;
    default:
      break;
  }
}
