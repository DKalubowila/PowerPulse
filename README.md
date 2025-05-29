# ⚡ PowerPulse
An IoT-based Smart Power Failure Detection and Alert System

## 📄 Project Overview

**PowerPulse** is a real-time power failure monitoring system built using IoT hardware and a mobile application. It detects power outages at both transformer and household levels using sensors and sends instant alerts to the relevant users—either domestic customers or CEB administrators—through Firebase.

The system also monitors environmental conditions (rain, humidity, temperature, pole tilt), allows users to report faults with images, and is designed to be low-cost, scalable, and easy to deploy.

## 🔑 Key Features

- 🔌 Detects power cuts using current sensors
- 🌧️ Environmental awareness: rain, temperature, humidity, tilt
- 🛰️ Location tracking via GPS or named device ID
- 📲 Mobile app with role-based access (Admin & User)
- 📤 User fault reporting with image upload
- 📡 Real-time data sync with Firebase
- 🔧 WiFi AP-mode setup (plug-and-play functionality)

## 🛠️ Technologies Used

- **ESP32**, **ACS712**, **Relay Module**, **DHT11**, **Rain Sensor**, **Tilt Sensor**, **Ultrasonic Sensor**, **GPS Module**
- **Firebase Realtime Database** (backend + notification system)
- **React Native + Expo** (cross-platform mobile app)
- **Motiff AI** (for UI generation)
- **Arduino IDE / PlatformIO** (for firmware development)

## 🚀 Getting Started

### 🔌 ESP32 (Arduino Code)

1. Connect the hardware components as per the pin definitions in `arduino-code.ino`.
2. Flash the code using Arduino IDE.
3. On first boot, the device starts in **AP Mode**.  
   Connect to `Lock_Config` WiFi and go to `192.168.4.1` to set your WiFi credentials.
4. On success, the device connects to Firebase and begins uploading data.

### 📱 Mobile App (React Native + Expo)

1. Clone the repo and go to the mobile app folder:
   ```bash
   cd mobile-app
   npm install
2. Update your Firebase config in firebase.js.

3. Start the app using Expo: npx expo start
4. Open in Expo Go or an emulator (iOS/Android).

## Author
Name: D. D. Kalubowila
Student ID: 24873 / 10898513
University: NSBM Green University / Plymouth University
Faculty: Faculty of Computing
Module: PUSL3190 – Computing Project
Supervisor: Ms. Lakni Peiris

