# Upload v4

Im Root von `arnimeberle/womo-display` ersetzen:

- index.html
- styles.css
- app.js
- sw.js

Änderungen:
- Level-Stufen: 1–3 horizontale 3D-Linien übereinander
- cm-Wert direkt unter dem Stufenindikator
- Fahrzeugräder hell statt schwarz und doppelt so breit
- `Level nullen` nach System verschoben
- PV-Ladestatus (Float/Bulk/...) ca. 50 % größer und weiß
- Sensor-WLAN zeigt bei bestehender BLE-Verbindung nur `WLAN aktiv` / `WLAN inaktiv`, nicht pauschal `Verbunden`
- Service-Worker-Cache auf `womo-ipad-v4` erhöht

Nach Upload einmal online neu laden.
