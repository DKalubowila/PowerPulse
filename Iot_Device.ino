#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Firebase credentials
const char* firebaseHost = "https://smartdoorlock-46c40-default-rtdb.firebaseio.com/";
const char* firebaseSecret = "Xd6v0FfQTPHNYzahMr1kervha2eyF6pp40SEnclP";

// Pin definitions
#define DHTPIN 4
#define DHTTYPE DHT11 // or DHT22
#define relayPin 15
#define rainPin 34
#define tiltPin 35

DHT dht(DHTPIN, DHTTYPE);

bool relayState = false;

void setup() {
    Serial.begin(115200);
    pinMode(relayPin, OUTPUT);
    pinMode(tiltPin, INPUT);
    digitalWrite(relayPin, HIGH); // Relay OFF by default

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
        float temp = dht.readTemperature();
        float hum = dht.readHumidity();
        int rainValue = analogRead(rainPin);
        bool tiltStatus = digitalRead(tiltPin);
        relayState = digitalRead(relayPin) == LOW;

        Serial.println("Sending data to Firebase...");

        HTTPClient http;
        String url = String(firebaseHost) + "/SensorData.json?auth=" + firebaseSecret;
        http.begin(url);
        http.addHeader("Content-Type", "application/json");

        String payload = "{";
        payload += "\"temperature\":" + String(temp, 1) + ",";
        payload += "\"humidity\":" + String(hum, 1) + ",";
        payload += "\"rain\":" + String(rainValue) + ",";
        payload += "\"tilt\":" + String(tiltStatus) + ",";
        payload += "\"relay\":" + String(relayState ? "1" : "0");
        payload += "}";

        int code = http.PUT(payload);
        Serial.print("Response code: ");
        Serial.println(code);
        http.end();
    } else {
        Serial.println("WiFi not connected.");
    }

    delay(5000); // Send every 5 seconds
}
