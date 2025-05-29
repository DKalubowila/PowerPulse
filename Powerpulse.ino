#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Test";
const char* password = "12345678";

// Firebase credentials
const char* firebaseHost = "https://powerpulse-34061-default-rtdb.firebaseio.com/";
const char* firebaseSecret = "w5W3GcblJ1bU172jtuzFkOd2LwEUAjvhNz2fs3qx";

// Pins
#define waterSensorPin 32
#define dhtPin 14
#define touch1Pin 27
#define touch2Pin 26
#define relay1Pin 23  // Controls Transformer/Status
#define relay2Pin 22  // Controls sensorData/Status

// DHT
#define DHTTYPE DHT11
DHT dht(dhtPin, DHTTYPE);

// Previous values
int prevWater = -1;
int prevHum = -1;
int prevTemp = -1;

void setup() {
  Serial.begin(115200);

  pinMode(waterSensorPin, INPUT);
  pinMode(touch1Pin, INPUT);
  pinMode(touch2Pin, INPUT);
  pinMode(relay1Pin, OUTPUT);
  pinMode(relay2Pin, OUTPUT);

  dht.begin();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {

    // 🟦 Read and update rain sensor
    int waterValue = digitalRead(waterSensorPin);
    if (waterValue != prevWater) {
      sendFirebaseValue("Transformer/Rain", waterValue);
      sendFirebaseValue("sensorData/Rain", waterValue);
      prevWater = waterValue;
    }

    // 🌡 Read and update DHT
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (!isnan(humidity)) {
      int hum = (int)humidity;
      if (hum != prevHum) {
        sendFirebaseValue("Transformer/Hum", hum);
        sendFirebaseValue("sensorData/Hum", hum);
        prevHum = hum;
      }
    }

    if (!isnan(temperature)) {
      int temp = (int)temperature;
      if (temp != prevTemp) {
        sendFirebaseValue("Transformer/Temp", temp);
        sendFirebaseValue("sensorData/Temp", temp);
        prevTemp = temp;
      }
    }

    // 👆 Touch sensors
    if (digitalRead(touch1Pin) == HIGH) {
      sendFirebaseValue("Transformer/Status", 0);
      delay(500);
    }

    if (digitalRead(touch2Pin) == HIGH) {
      sendFirebaseValue("sensorData/Status", 0);
      delay(500);
    }

    // 🔁 Read Firebase status values and control relays
    int transformerStatus = getFirebaseValue("Transformer/Status");
    int sensorStatus = getFirebaseValue("sensorData/Status");

    digitalWrite(relay1Pin, transformerStatus == 1 ? HIGH : LOW);
    digitalWrite(relay2Pin, sensorStatus == 1 ? HIGH : LOW);

    delay(2000);
  } else {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.reconnect();
  }
}

// 🔼 Send value to Firebase
void sendFirebaseValue(const String& path, int value) {
  HTTPClient http;
  String url = String(firebaseHost) + "/" + path + ".json?auth=" + firebaseSecret;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(String(value));
  Serial.printf("Sent %s = %d, HTTP code: %d\n", path.c_str(), value, httpCode);
  http.end();
}

// 🔽 Read integer value from Firebase
int getFirebaseValue(const String& path) {
  HTTPClient http;
  String url = String(firebaseHost) + "/" + path + ".json?auth=" + firebaseSecret;
  http.begin(url);
  int httpCode = http.GET();
  int value = 0;
  if (httpCode == 200) {
    String payload = http.getString();
    value = payload.toInt(); // assumes JSON is a simple int
  }
  http.end();
  return value;
}
