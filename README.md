# WoMo iPad Web-BLE Display

Web-Oberflaeche fuer den bestehenden WoMo Sensor-Node. Der ESP32-Sensorcode bleibt unveraendert; das iPad dient nur als grosses Display und verbindet sich per Bluetooth Low Energy direkt mit dem Sensor.

## Aktueller Stand

- Repository: <https://github.com/arnimeberle/womo-display>
- Live-App: <https://arnimeberle.github.io/womo-display/>
- Hosting: GitHub Pages, Branch `main`, Ordner `/ (root)`, HTTPS erzwungen
- Zielgeraet: iPad 6. Generation mit iPadOS 17.x
- Sensor: ESP32 BLE-Node `WoMo_arnim_Sensor`
- Status: Verbindung ueber Web-Bluetooth-Browser funktioniert; BLE-Verbindung wurde erfolgreich hergestellt.

## Warum GitHub Pages

Lokales Hosting ueber Caddy unter `https://womo.internal` funktioniert in Safari, war aber fuer Web-Bluetooth-Browser nicht zuverlaessig:

- Safari konnte die lokale Caddy-Seite erreichen.
- Bluefy konnte oeffentliche Seiten wie Google/Vodafone laden, aber lokale URL/IP nicht.
- WebBLE erreichte den lokalen Server, scheiterte aber am SSL-Vertrauen der lokalen Caddy-CA.
- Deshalb wird die App ueber GitHub Pages mit oeffentlich vertrauenswuerdigem HTTPS geladen.

Die BLE-Verbindung bleibt trotzdem lokal:

```text
GitHub Pages HTTPS
    -> laedt HTML/CSS/JS auf das iPad

iPad Web-Bluetooth-Browser
    -> verbindet danach direkt per BLE mit dem ESP32
```

## iPad-Nutzung

1. Web-Bluetooth-Browser oeffnen, aktuell getestet mit Bluefy/WebBLE.
2. Diese URL laden:

   ```text
   https://arnimeberle.github.io/womo-display/
   ```

3. In der App unten `System` waehlen.
4. `Bluetooth verbinden` druecken.
5. `WoMo_arnim_Sensor` auswaehlen.

Wenn oben `Bluetooth verbunden` steht, kommen die Sensordaten direkt ueber BLE vom ESP32.

## Offline-Cache

Die App hat einen Service Worker (`sw.js`) und kann grundsaetzlich als PWA offline cachen. Ob das funktioniert, entscheidet aber der verwendete iPad-Browser:

- Wenn `navigator.serviceWorker` vorhanden ist, zeigt die App `Offline-App bereit` oder `Offline aktiv`.
- Wenn `navigator.serviceWorker` fehlt, zeigt die App `Online-Start noetig`.

Wichtig:

- `Online-Start noetig` bedeutet nicht, dass BLE defekt ist.
- Es bedeutet nur, dass dieser Browser die App-Dateien nicht fuer einen spaeteren Offline-Neustart cachen kann.
- Solange die Seite geoeffnet bleibt, kann BLE weiter funktionieren.
- Fuer einen Neustart der App ist dann wieder Internet zum Laden von GitHub Pages noetig.

Aktuelle Cache-Version:

```js
const CACHE = 'womo-ipad-v2';
```

Bei Dateiupdates in `sw.js` die Cache-Version erhoehen, zum Beispiel auf `womo-ipad-v3`, und die Seite danach einmal online neu laden.

## BLE-Konfiguration

Die Web-App verwendet feste UUIDs aus dem bestehenden Sensor-Protokoll:

```js
const BLE = {
  name: 'WoMo_arnim_Sensor',
  service: '7b4d0001-6f6d-6f77-6172-6e696d000001',
  state: '7b4d0002-6f6d-6f77-6172-6e696d000001',
  command: '7b4d0003-6f6d-6f77-6172-6e696d000001'
};
```

Der Browser filtert beim Verbinden nach dem Service:

```js
navigator.bluetooth.requestDevice({
  filters: [{ services: [BLE.service] }],
  optionalServices: [BLE.service]
});
```

## Textprotokoll

Der Sensor sendet Zustandsdaten als Textpaket:

```text
state|...
```

Die Web-App erwartet derzeit 33 Felder. Unvollstaendige Pakete werden erkannt und kurz spaeter erneut gelesen.

Unterstuetzte Befehle an den Sensor:

```text
state
level_zero
vehicle_geometry|<radstand>|<spurweite>
sensor_oled_timeout|<minuten>
sensor_oled_power|0/1
mpu_orientation|0/1
sensor_restart
```

## Dateien

```text
/
├── index.html
├── app.js
├── styles.css
├── sw.js
├── manifest.webmanifest
├── README.md
└── .nojekyll
```

`.nojekyll` sorgt dafuer, dass GitHub Pages die statischen Dateien unveraendert ausliefert.

## Lokale Caddy-Konfiguration

Die lokale Caddy-Konfiguration bleibt als Fallback/Diagnose vorhanden, ist aber nicht mehr der empfohlene Weg fuer den iPad-Web-Bluetooth-Browser.

Relevanter lokaler Stand:

```caddy
{
    admin localhost:2019
    default_sni 192.168.178.73
}

womo.internal, 192.168.178.73 {
    tls internal
    log {
        output stdout
        format console
    }
    root * /var/www/womo/womo_ipad_web
    file_server
}
```

Bekannte Besonderheiten:

- `http://womo.internal:443` ist falsch und hat Caddy in eine Restart-Schleife gebracht.
- Korrekt ist ein HTTPS-Site-Block ohne `http://` im Label.
- Die lokale Caddy-CA kann in Safari funktionieren, muss aber nicht von Bluefy/WebBLE akzeptiert werden.

## GitHub-Workflow

Aktueller Veroeffentlichungsweg:

1. Dateien lokal in `work/womo-github` vorbereiten.
2. Aenderungen nach `main` im Repository `arnimeberle/womo-display` hochladen.
3. GitHub Pages baut automatisch aus `main` und `/ (root)`.
4. Ergebnis unter <https://arnimeberle.github.io/womo-display/> pruefen.

Hinweis: Der GitHub-Connector konnte das Repository lesen, aber das Schreiben per Contents API wurde mit `Resource not accessible by integration` abgelehnt. Die bisherigen Uploads erfolgten deshalb ueber die GitHub-Weboberflaeche.

## Nicht umgesetzt

- Native iPad-App
- Apple Developer Account / App Store
- Automatische BLE-Geraeteauswahl ohne Benutzerinteraktion
- Garantierter Offline-Neustart in Browsern ohne Service-Worker-Unterstuetzung
