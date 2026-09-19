# WoMo iPad Web-BLE Display

Offline-faehige Web-Oberflaeche fuer den bestehenden WoMo Sensor-Node. Der ESP32-Sensorcode wird nicht veraendert.

## Nutzung

Die App muss ueber eine oeffentlich vertrauenswuerdige HTTPS-Adresse geladen werden, z. B. GitHub Pages. Danach im iPad-Web-Bluetooth-Browser oeffnen und unter `System` den Sensor `WoMo_arnim_Sensor` verbinden.

## BLE

- Service: `7b4d0001-6f6d-6f77-6172-6e696d000001`
- State READ/NOTIFY: `7b4d0002-6f6d-6f77-6172-6e696d000001`
- Command WRITE: `7b4d0003-6f6d-6f77-6172-6e696d000001`

## Offline

Die App registriert einen Service Worker und cached `index.html`, `styles.css`, `app.js`, `sw.js` und `manifest.webmanifest`.
