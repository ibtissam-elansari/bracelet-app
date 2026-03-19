import { Colors, Radius } from '@/constants/theme';
import { useSensor } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

function buildHTML(lat: number, lon: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body,#map { width:100%; height:100%; background:#070B12; }
    .pulse { position:absolute; width:20px; height:20px; border:1.5px solid rgba(0,212,255,0.5); border-radius:50%; animation:p 2s ease-out infinite; }
    @keyframes p { 0%{transform:scale(1);opacity:.9} 100%{transform:scale(3);opacity:0} }
    #recenter {
      position:absolute; bottom:16px; right:12px; z-index:999;
      width:38px; height:38px; border-radius:9px;
      background:rgba(11,18,32,0.95); border:1px solid rgba(0,212,255,0.3);
      display:flex; align-items:center; justify-content:center;
      font-size:16px; cursor:pointer;
      box-shadow:0 0 12px rgba(0,212,255,0.15);
    }
  </style>
</head>
<body>
<div id="map"></div>
<div id="recenter">&#9673;</div>
<script>
  var lat=${lat}, lon=${lon};
  var panning=false, pTimer=null;

  var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([lat,lon],16);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);

  map.on('dragstart',function(){
    panning=true; clearTimeout(pTimer);
    pTimer=setTimeout(function(){panning=false;},9000);
  });

  // GPS trail polyline
  var trail=L.polyline([],{color:'rgba(0,212,255,0.45)',weight:2.5,dashArray:'5 6'}).addTo(map);
  var trailPts=[];

  // Marker
  var mHtml='<div style="position:relative;width:20px;height:20px">'
    +'<div class="pulse"></div>'
    +'<div style="width:20px;height:20px;background:rgba(0,212,255,0.2);border:2.5px solid #00D4FF;border-radius:50%;box-shadow:0 0 16px rgba(0,212,255,0.8);display:flex;align-items:center;justify-content:center">'
    +'<div style="width:8px;height:8px;background:#00D4FF;border-radius:50%"></div>'
    +'</div></div>';
  var icon=L.divIcon({html:mHtml,className:'',iconSize:[20,20],iconAnchor:[10,10]});
  var marker=L.marker([lat,lon],{icon:icon}).addTo(map);

  L.circle([lat,lon],{radius:20,color:'rgba(0,212,255,0.4)',fillColor:'rgba(0,212,255,0.05)',fillOpacity:1,weight:1}).addTo(map);

  document.getElementById('recenter').addEventListener('click',function(){
    panning=false;
    map.setView([lat,lon],16,{animate:true,duration:0.7});
  });

  function update(e){
    try{
      var d=JSON.parse(e.data);
      // Emergency marker
      if(d.type==='alert'){
        var ac=d.alertType==='fall'?'#FF3D57':'#FF3D57';
        var ah='<div style="width:16px;height:16px;background:'+ac+';border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px '+ac+'"></div>';
        L.marker([d.lat,d.lon],{icon:L.divIcon({html:ah,className:'',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map);
        return;
      }
      lat=d.lat; lon=d.lon;
      marker.setLatLng([lat,lon]);
      // Add to trail
      trailPts.push([lat,lon]);
      if(trailPts.length>30) trailPts.shift();
      trail.setLatLngs(trailPts);
      if(!panning) map.panTo([lat,lon],{animate:true,duration:0.6});
    }catch(err){}
  }
  document.addEventListener('message',update);
  window.addEventListener('message',update);
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const { current, connected, gpsTrail } = useSensor();
  const webRef     = useRef<WebView>(null);
  const htmlRef    = useRef(buildHTML(34.0333, -5.0)).current;
  const lastSentMs = useRef(0);

  // Send GPS updates debounced to 2s
  useEffect(() => {
    if (!current || !webRef.current) return;
    const now = Date.now();
    if (now - lastSentMs.current < 2000) return;
    lastSentMs.current = now;
    webRef.current.postMessage(JSON.stringify({ lat: current.lat, lon: current.lon }));
  }, [current?.lat, current?.lon]);

  // Send alert pin when fall/SOS
  useEffect(() => {
    if (!current || !webRef.current) return;
    if (current.fall) {
      webRef.current.postMessage(JSON.stringify({ type: 'alert', alertType: 'fall', lat: current.lat, lon: current.lon }));
    } else if (current.sos) {
      webRef.current.postMessage(JSON.stringify({ type: 'alert', alertType: 'sos', lat: current.lat, lon: current.lon }));
    }
  }, [current?.fall, current?.sos]);

  const lat = current?.lat ?? 34.0333;
  const lon = current?.lon ?? -5.0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>GPS TRACKING</Text>
          <Text style={s.sub}>{gpsTrail.length} trail points</Text>
        </View>
        <View style={[s.pill, { borderColor: connected ? `${Colors.success}45` : Colors.border }]}>
          <View style={[s.dot, { backgroundColor: connected ? Colors.success : Colors.textMuted }]} />
          <Text style={[s.pillText, { color: connected ? Colors.success : Colors.textMuted }]}>
            {connected ? 'MQTT LIVE' : 'SIMULATOR'}
          </Text>
        </View>
      </View>

      {/* Map */}
      <View style={s.mapWrap}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: htmlRef }}
          style={s.map}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          onMessage={() => {}}
        />

        {/* Coordinate overlay */}
        <View style={s.overlay}>
          <Text style={s.overlayLabel}>LAT</Text>
          <Text style={s.overlayVal}>{lat.toFixed(5)}</Text>
          <View style={s.overlayDivider} />
          <Text style={s.overlayLabel}>LON</Text>
          <Text style={s.overlayVal}>{lon.toFixed(5)}</Text>
        </View>

        {/* Fall/SOS indicator */}
        {current?.fall && (
          <View style={s.alertBanner}>
            <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.danger} />
            <Text style={s.alertBannerText}>FALL DETECTED AT THIS LOCATION</Text>
          </View>
        )}
        {current?.sos && !current?.fall && (
          <View style={s.alertBanner}>
            <MaterialCommunityIcons name="alarm-light" size={14} color={Colors.danger} />
            <Text style={s.alertBannerText}>SOS ACTIVATED AT THIS LOCATION</Text>
          </View>
        )}
      </View>

      {/* Bottom strip */}
      <View style={s.strip}>
        {[
          { label: 'UPDATED',   val: current ? new Date(current.timestamp).toLocaleTimeString() : '—' },
          { label: 'MOVEMENT',  val: current?.move ? 'ACTIVE' : 'STILL',  color: current?.move ? Colors.success : Colors.textSecondary },
          { label: 'FALL',      val: current?.fall ? 'DETECTED' : 'SAFE', color: current?.fall ? Colors.danger : Colors.success },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <View style={s.stripDot} />}
            <View style={s.stripItem}>
              <Text style={s.stripLabel}>{item.label}</Text>
              <Text style={[s.stripVal, item.color ? { color: item.color } : null]}>{item.val}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:  { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  sub:    { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  pill:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 11, paddingVertical: 6 },
  dot:    { width: 7, height: 7, borderRadius: 3.5 },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  mapWrap:{ flex: 1, position: 'relative' },
  map:    { flex: 1, backgroundColor: Colors.bg },
  overlay:{
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(11,18,32,0.93)',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    padding: 11, alignItems: 'center',
  },
  overlayLabel: { fontSize: 8, color: Colors.textLabel, fontWeight: '700', letterSpacing: 1.2 },
  overlayVal:   { fontSize: 12, color: Colors.accent, fontWeight: '600', fontFamily: 'Courier New', marginTop: 2 },
  overlayDivider:{ height: 1, width: '100%', backgroundColor: Colors.border, marginVertical: 7 },
  alertBanner: {
    position: 'absolute', bottom: 12, left: 12, right: 60,
    backgroundColor: `${Colors.danger}22`,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: `${Colors.danger}55`,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  alertBannerText: { fontSize: 11, color: Colors.danger, fontWeight: '700', letterSpacing: 0.8 },
  strip:     { flexDirection: 'row', backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'space-around' },
  stripItem: { alignItems: 'center', gap: 3 },
  stripLabel:{ fontSize: 9, color: Colors.textLabel, fontWeight: '700', letterSpacing: 1 },
  stripVal:  { fontSize: 13, color: Colors.textPrimary, fontWeight: '700' },
  stripDot:  { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.border },
});