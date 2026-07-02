# Malita Bois - Adaptive Living Virtual Intelligence Network (ALVIN)

> **Note:** This project was developed for **SparkFest 2026**.

## Project Brief
**ALVIN (Adaptive Living Virtual Intelligence Network)** is an innovative, human-centered 3D Digital Twin designed to address the critical need for real-time environmental awareness in public and private infrastructure. 

Instead of passive visualization, ALVIN acts as an active decision-support system. By integrating IoT environmental sensing, GIS mapping, weather intelligence, and predictive analytics, ALVIN continuously evaluates indoor and outdoor conditions to recommend the safest, coolest, driest, and most comfortable places to stay. During emergencies (e.g., fires, floods, earthquakes), the system dynamically adapts to provide real-time, safe evacuation routes and assembly areas.

## Core Features
* **Interactive 3D Digital Twin:** Navigate floors, click rooms, view live environmental conditions, and visualize comfort zones.
* **Smart Place Recommendation:** Computes an *Environmental Comfort Score* (based on temperature, humidity, airflow, and weather) to suggest the best places to study, wait, rest, or meet.
* **Live Heat & Rain Map:** GIS visualization of outdoor heat indexes, rain intensity, cooling zones, and covered walkways.
* **Dynamic Environmental Navigation:** Suggests shaded paths on sunny days, covered walkways during rain, and safest routes during disasters.
* **Emergency Digital Twin:** Adapts in real-time to highlight inaccessible rooms, blocked entrances, nearest exits, and estimated evacuation times.

---

## Google Technologies Used
* **Firebase:** Utilized for real-time data storage, retrieval, and seamless IoT-to-Cloud communication via REST API. 

---

## Tech Stack & Architecture

### Hardware Sensors & Main Parts
| Component | Specification |
| :--- | :--- |
| **Humidity Sensor** | DHT22 / DHT11 |
| **Temperature Sensor** | DHT22, LM35 |
| **Air Velocity Sensor** | MQT-2 |
| **Connectivity** | ESP32 |

### Software & Cloud Infrastructure
| Component | Technology |
| :--- | :--- |
| **Communication (IoT to Cloud)** | HTTP POST to Firebase REST API |
| **Frontend** | React.js, Leaflet.js |
| **Backend API** | Python |
| **Database** | Firebase |
| **Hosting** | Vercel |
| **Pathfinding Engine** | NetworkX |
| **Weather Integrations** | OpenWeatherMap |

---

## Team Name and Members
**Team Name:** Malita Bois

* **John Ray Cacananta**
* **Alvin Dellomas**
* **Gabriel John Solomon**
* **Vince Anjo Villar**
