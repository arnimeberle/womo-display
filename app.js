"use strict";

const BLE = {
  name: "WoMo_arnim_Sensor",
  service: "7b4d0001-6f6d-6f77-6172-6e696d000001",
  state: "7b4d0002-6f6d-6f77-6172-6e696d000001",
  command: "7b4d0003-6f6d-6f77-6172-6e696d000001"
};
const limits={wheelbase:[200,600],track:[100,300],oledTimeout:[1,60]};
const app={device:null,server:null,stateChar:null,commandChar:null,connected:false,lastZeroRevision:null,state:{
 tab:0,sequence:0,temp:0,pressure:0,altitude:0,x:0,y:0,fl:0,fr:0,rl:0,rr:0,batteryV:0,batteryPct:0,solarW:0,yieldWh:0,
 wifi:false,wheelbase:405,track:180,levelZeroRevision:0,displayTimeout:2,oledTimeout:10,oledOn:true,humidity:-1,
 year:0,month:0,day:0,hour:0,minute:0,trend:0,trendMinutes:0,chargeState:0,mpuReverse:false
}};
const $=id=>document.getElementById(id);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const fmt=(n,d=0)=>Number.isFinite(n)?n.toFixed(d):"--";

function setBleStatus(text,type="neutral"){const el=$("bleState");el.textContent=text;el.className=`pill ${type}`}
function setError(message=""){$("errorText").textContent=message}

function parseState(text){
 const f=text.trim().split("|");
 if(f[0]!=="state"||f.length<24) throw new Error("Unvollständiges Sensorpaket");
 if(f.length<33){if(app.connected&&app.stateChar)setTimeout(()=>readState().catch(()=>{}),120);throw new Error(`BLE-Paket abgeschnitten (${f.length}/33 Felder)`)}
 const num=i=>Number(f[i]);
 const s={tab:num(1),sequence:num(2),temp:num(3),pressure:num(4),altitude:num(5),x:num(6),y:num(7),fl:num(8),fr:num(9),rl:num(10),rr:num(11),
 batteryV:num(12),batteryPct:num(13),solarW:num(14),yieldWh:num(15),wifi:num(16)===1,wheelbase:num(17),track:num(18),levelZeroRevision:num(19),
 displayTimeout:num(20),oledTimeout:num(21),oledOn:num(22)===1,humidity:num(23),year:num(24)||0,month:num(25)||0,day:num(26)||0,hour:num(27)||0,minute:num(28)||0,
 trend:num(29)||0,trendMinutes:num(30)||0,chargeState:num(31)||0,mpuReverse:num(32)===1};
 if(![s.temp,s.pressure,s.x,s.y].every(Number.isFinite))throw new Error("Ungültige Sensordaten");
 return s;
}
function onStateValue(value){
 try{
  const text=new TextDecoder().decode(value),prev=app.state.levelZeroRevision;
  app.state=parseState(text);render();
  $("lastUpdate").textContent=`Letztes Update ${new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`;
  if(app.lastZeroRevision!==null&&app.state.levelZeroRevision!==app.lastZeroRevision){$("zeroState").textContent="Nullpunkt gespeichert";setTimeout(()=>{$("zeroState").textContent=""},2500)}
  else if(prev!==app.state.levelZeroRevision)$("zeroState").textContent="Nullpunkt aktualisiert";
  app.lastZeroRevision=app.state.levelZeroRevision;setError("");
 }catch(e){setError(e.message)}
}
function onNotification(event){onStateValue(event.target.value)}

async function connect(){
 if(!navigator.bluetooth){setError("Web Bluetooth nicht verfügbar. Seite in Bluefy/WebBLE öffnen.");return}
 try{
  setError("");setBleStatus("Bluetooth wählt…","warn");
  const device=await navigator.bluetooth.requestDevice({filters:[{services:[BLE.service]}],optionalServices:[BLE.service]});
  app.device=device;device.addEventListener("gattserverdisconnected",onDisconnected);await connectGatt();
 }catch(e){setBleStatus("Bluetooth getrennt","bad");if(e.name!=="NotFoundError")setError(`Bluetooth: ${e.message}`)}
}
async function connectGatt(){
 setBleStatus("Verbinde…","warn");
 app.server=await app.device.gatt.connect();
 const service=await app.server.getPrimaryService(BLE.service);
 app.stateChar=await service.getCharacteristic(BLE.state);app.commandChar=await service.getCharacteristic(BLE.command);
 await app.stateChar.startNotifications();app.stateChar.addEventListener("characteristicvaluechanged",onNotification);
 app.connected=true;setBleStatus("Bluetooth verbunden","good");$("connectBle").textContent="Neu verbinden";
 try{await readState()}catch(_){await sendCommand("state")} enableScreenDim(false);
}
function onDisconnected(){app.connected=false;app.server=null;app.stateChar=null;app.commandChar=null;setBleStatus("Bluetooth getrennt","bad");$("levelHint").textContent="Sensor getrennt";renderWifiState()}
async function readState(){if(!app.stateChar)return;onStateValue(await app.stateChar.readValue())}
async function sendCommand(command){
 if(!app.connected||!app.commandChar){setError("Sensor ist nicht verbunden.");return false}
 try{const bytes=new TextEncoder().encode(command);if(app.commandChar.writeValueWithResponse)await app.commandChar.writeValueWithResponse(bytes);else await app.commandChar.writeValue(bytes);return true}
 catch(e){setError(`Befehl fehlgeschlagen: ${e.message}`);return false}
}
function chargeText(v){return({0:"Aus",1:"Low Power",2:"Fehler",3:"Bulk",4:"Absorption",5:"Float",6:"Lagerung",7:"Ausgleich",9:"Passthru",11:"Inverter",245:"Netzteil",246:"Start",247:"Re-Absorption",248:"Auto-Ausgleich",252:"Battery Safe",255:"Extern"})[v]||"Unbekannt"}

function wedgeLevel(cm){return cm<1?0:cm<=4?1:cm<=7?2:3}
function setLiftIndicator(id,cm){$(id).className=`lift-indicator level-${wedgeLevel(cm)}`}
function renderWifiState(){
 const el=$("wifiState");
 if(!el)return;
 if(!app.connected){el.textContent="--";el.style.color="var(--muted)";return}
 el.textContent=app.state.wifi?"WLAN aktiv":"WLAN inaktiv";
 el.style.color=app.state.wifi?"var(--green)":"var(--muted)";
}
function renderWeather(s){
 $("temp").textContent=fmt(s.temp,1);$("humidity").textContent=s.humidity>=0?fmt(s.humidity,0):"--";$("pressure").textContent=fmt(s.pressure,1);$("altitude").textContent=fmt(s.altitude,0);
 $("pressureTrend").textContent=`${s.trend>=0?"+":""}${fmt(s.trend,1)} hPa`;$("pressureTrendPeriod").textContent=s.trendMinutes?`in ${s.trendMinutes} min`:"kein Zeitraum";
 const symbol=$("weatherSymbol"),trend=$("trendText");symbol.className="weather-symbol ";
 if(s.trend>0.8){symbol.classList.add("weather-sun");trend.textContent="Steigend"}
 else if(s.trend<-0.8){symbol.classList.add("weather-rain");trend.textContent="Fallend"}
 else{symbol.classList.add("weather-cloud");trend.textContent="Stabil"}
 $("trendNeedle").style.transform=`rotate(${clamp(s.trend*18,-70,70)}deg)`;
 if(s.year>=2024){const dt=new Date(s.year,s.month-1,s.day,s.hour,s.minute);$("weatherDate").textContent=dt.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});$("sensorTime").textContent=`${String(s.hour).padStart(2,"0")}:${String(s.minute).padStart(2,"0")}`}
}
function render(){
 const s=app.state;
 $("levelX").textContent=`${fmt(s.x,2)}°`;$("levelY").textContent=`${fmt(s.y,2)}°`;
 [["liftFL",s.fl],["liftFR",s.fr],["liftRL",s.rl],["liftRR",s.rr]].forEach(([id,v])=>$(id).textContent=fmt(v,1));
 setLiftIndicator("indicatorFL",s.fl);setLiftIndicator("indicatorFR",s.fr);setLiftIndicator("indicatorRL",s.rl);setLiftIndicator("indicatorRR",s.rr);
 const bx=clamp(s.y*8,-45,45),by=clamp(s.x*8,-45,45);$("bubble").style.transform=`translate(${bx}px,${by}px)`;
 const maxLift=Math.max(s.fl,s.fr,s.rl,s.rr);$("levelHint").textContent=maxLift<1?"Fahrzeug steht waagerecht":`Max. Anhebung ${fmt(maxLift,1)} cm`;
 $("bubble").style.background=maxLift<1?"var(--green)":maxLift<=4?"var(--yellow)":"var(--orange)";
 renderWeather(s);

 const pct=clamp(s.batteryPct,0,100);$("batteryPct").textContent=`${fmt(pct,0)}%`;$("batteryV").textContent=fmt(s.batteryV,2);$("solarW").textContent=fmt(s.solarW,0);$("yieldWh").textContent=fmt(s.yieldWh,0);$("chargeState").textContent=chargeText(s.chargeState);
 $("batteryFill").style.height=`calc(${pct}% - 12px)`;$("batteryFill").style.background=pct<20?"var(--red)":pct<50?"var(--yellow)":"var(--green)";

 $("sequence").textContent=`Sequenz ${s.sequence}`;$("wheelbase").textContent=`${s.wheelbase} cm`;$("track").textContent=`${s.track} cm`;$("oledTimeout").textContent=`${s.oledTimeout} min`;
 $("oledPower").textContent=s.oledOn?"OLED Ein":"OLED Aus";$("mpuOrientation").textContent=s.mpuReverse?"Rückwärts":"Vorwärts";
 renderWifiState();
}
async function changeSetting(kind,delta){
 const s=app.state;
 if(kind==="wheelbase"){const v=clamp(s.wheelbase+delta,...limits.wheelbase);await sendCommand(`vehicle_geometry|${v}|${s.track}`)}
 if(kind==="track"){const v=clamp(s.track+delta,...limits.track);await sendCommand(`vehicle_geometry|${s.wheelbase}|${v}`)}
 if(kind==="oledTimeout"){const v=clamp(s.oledTimeout+delta,...limits.oledTimeout);await sendCommand(`sensor_oled_timeout|${v}`)}
 setTimeout(()=>sendCommand("state"),250);
}
function enableScreenDim(enabled){try{if(navigator.bluetooth&&typeof navigator.bluetooth.setScreenDimEnabled==="function")navigator.bluetooth.setScreenDimEnabled(enabled);else if(window.bluetooth&&typeof window.bluetooth.setScreenDimEnabled==="function")window.bluetooth.setScreenDimEnabled(enabled)}catch(_){}}
function setupUi(){
 document.querySelectorAll(".tabbar button").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tabbar button").forEach(b=>b.classList.toggle("active",b===btn));document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(`page-${btn.dataset.page}`).classList.add("active")}));
 $("connectBle").addEventListener("click",connect);
 $("zeroLevel").addEventListener("click",async()=>{$("zeroState").textContent="Speichere…";app.lastZeroRevision=app.state.levelZeroRevision;if(!await sendCommand("level_zero"))$("zeroState").textContent="Fehler"});
 document.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>changeSetting(b.dataset.step,Number(b.dataset.delta))));
 $("oledPower").addEventListener("click",async()=>{await sendCommand(`sensor_oled_power|${app.state.oledOn?0:1}`);setTimeout(()=>sendCommand("state"),250)});
 $("mpuOrientation").addEventListener("click",async()=>{await sendCommand(`mpu_orientation|${app.state.mpuReverse?0:1}`);setTimeout(()=>sendCommand("state"),250)});
 $("restartSensor").addEventListener("click",async()=>{if(confirm("Sensor wirklich neu starten?"))await sendCommand("sensor_restart")});
}
async function setupOffline(){
 const el=$("offlineState");if(!("serviceWorker" in navigator)){el.textContent="Online-Start nötig";el.className="pill warn";return}
 try{await navigator.serviceWorker.register("./sw.js");await navigator.serviceWorker.ready;el.textContent=navigator.onLine?"Offline-App bereit":"Offline aktiv";el.className="pill good"}
 catch(e){el.textContent="Offline-Cache Fehler";el.className="pill bad";setError(`Cache: ${e.message}`)}
 window.addEventListener("online",()=>{el.textContent="Offline-App bereit";el.className="pill good"});window.addEventListener("offline",()=>{el.textContent="Offline aktiv";el.className="pill good"});
}
setupUi();render();setupOffline();
