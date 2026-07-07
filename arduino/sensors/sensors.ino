/* Room Sensors Monitor (Air Quality, Temperature, Humidity)

WIRINGS:
    DHT22 data --> GPIO12 (10k pull-up resistor between data and VCC)
    MQ-2 AO    --> GPIO4  (analog gas presence reading)
    3V3 power  --> GPIO32

    Library included: DHT sensor library by Adafruit (Sketch > Include Library > Manage Libraries)
*/

#include <DHT.h>

#define DHTPIN 12
#define DHTTYPE DHT22
#define MQ2PIN 4

DHT dht(DHTPIN, DHTTYPE);

const unsigned long READ_INTERVAL = 2000; //ms, DHT22 needs roughly >=2s between reads
unsigned long lastReadTime = 0;

//warm=up period for the MQ-2 sensor, it needs a few seconds to stabilize after power-up
const unsigned long WARMUP_TIME = 20000; //20 seconds for testing
unsigned long startTime = 0;
bool warmedUp = false;

void setup() {
  Serial.begin(115200);
  delay(500);


dht.begin();
  pinMode(MQ2PIN, INPUT);

  startTime = millis();
  Serial.println("Air Quality Monitor starting...");
  Serial.println("Warming up MQ-2 sensor...");

}

void loop() {
  unsigned long now = millis();

 if (!warmedUp && (now - startTime >= WARMUP_TIME)) {
    warmedUp = true;
    Serial.println("MQ-2 warm-up complete. Readings should now be stable.");
  }

  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;
    readSensors();
  }
}

void readSensors() {
  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();
  int gasRaw = analogRead(MQ2PIN);

  //convert raw ADC to the voltage (3.3V reference, 12-bit ADC)
    float gasVoltage = gasRaw * (3.3 / 4095.0);

    Serial.println("----------------------------------");

  if (isnan(humidity) || isnan(tempC)) {
    Serial.println("Failed to read from DHT22 sensor! Check wiring/pull-up resistor.");
  } else {
    Serial.print("Temperature: ");
    Serial.print(tempC);
    Serial.println(" C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }

  Serial.print("MQ-2 Raw ADC: ");
  Serial.print(gasRaw);
  Serial.print("  |  Voltage: ");
  Serial.print(gasVoltage, 2);
  Serial.println(" V");

  if (!warmedUp) {
    Serial.println("(MQ-2 still warming up - value not yet reliable)");
  } else {

    if (gasRaw < 800) {
      Serial.println("Air quality: Good");
    } else if (gasRaw < 1800) {
      Serial.println("Air quality: Moderate");
    } else {
      Serial.println("Air quality: Poor - gas/smoke detected");
    }
  }
}