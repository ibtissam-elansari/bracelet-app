import { Colors, Radius } from '@/constants/theme';
import { useSensor } from '@/context/SensorContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// ─── Leaflet HTML (built once on mount with initial coords) ──────────────────
// The map NEVER reloads — coords are pushed via postMessage so the user
// can freely pan/zoom without the view resetting every second.
function buildLeafletHTML(lat: number, lon: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#080C14; }
    .pulse-ring {
      position:absolute; width:22px; height:22px;
      border:1.5px solid rgba(0,229,255,0.45); border-radius:50%;
      animation: pulse 2s ease-out infinite;
    }
    @keyframes pulse {
      0%  { transform:scale(1);   opacity:0.85; }
      100%{ transform:scale(3.2); opacity:0; }
    }
    /* Recenter button */
    #recenterBtn {
      position:absolute; bottom:18px; right:14px; z-index:1000;
      width:40px; height:40px; border-radius:8px;
      background:rgba(13,20,33,0.92);
      border:1px solid rgba(0,229,255,0.35);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; box-shadow:0 0 12px rgba(0,229,255,0.2);
      font-size:18px;
    }
    #recenterBtn:active { background:rgba(0,229,255,0.15); }
  </style>
</head>
<body>
<div id="map"></div>
<div id="recenterBtn" title="Re-center">🎯</div>
<script>
  var lat = ${lat}, lon = ${lon};
  var userPanning = false;
  var panTimeout = null;

  var map = L.map('map', { zoomControl:false, attributionControl:false })
             .setView([lat, lon], 16);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom:19
  }).addTo(map);

  // Detect when user starts manually panning — suppress auto-follow for 8s
  map.on('dragstart', function() {
    userPanning = true;
    clearTimeout(panTimeout);
    panTimeout = setTimeout(function(){ userPanning = false; }, 8000);
  });

  var markerHtml =
    '<div style="position:relative;width:22px;height:22px">'
    + '<div class="pulse-ring"></div>'
    + '<div style="width:22px;height:22px;background:rgba(0,229,255,0.25);'
    + 'border:2.5px solid #00E5FF;border-radius:50%;'
    + 'box-shadow:0 0 18px rgba(0,229,255,0.75);'
    + 'display:flex;align-items:center;justify-content:center">'
    + '<div style="width:9px;height:9px;background:#00E5FF;border-radius:50%;'
    + 'box-shadow:0 0 8px #00E5FF"></div>'
    + '</div></div>';

  var icon = L.divIcon({ html:markerHtml, className:'', iconSize:[22,22], iconAnchor:[11,11] });
  var marker = L.marker([lat, lon], { icon:icon }).addTo(map);

  var accuracyCircle = L.circle([lat, lon], {
    radius:25,
    color:'rgba(0,229,255,0.5)',
    fillColor:'rgba(0,229,255,0.06)',
    fillOpacity:1, weight:1
  }).addTo(map);

  // Recenter button
  document.getElementById('recenterBtn').addEventListener('click', function() {
    userPanning = false;
    map.setView([lat, lon], 16, { animate:true, duration:0.6 });
  });

  // Receive position updates — only pan if user isn't actively exploring
  function handleMsg(e) {
    try {
      var d = JSON.parse(e.data);
      lat = d.lat; lon = d.lon;
      marker.setLatLng([lat, lon]);
      accuracyCircle.setLatLng([lat, lon]);
      if (!userPanning) {
        map.panTo([lat, lon], { animate:true, duration:0.5 });
      }
    } catch(err) {}
  }
  document.addEventListener('message', handleMsg);
  window.addEventListener('message', handleMsg);
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const { current, connected } = useSensor();
  const webRef     = useRef<WebView>(null);
  // Build HTML once with the initial position — never re-render the WebView
  const initialHtml = useRef(buildLeafletHTML(34.033, -5.0)).current;

  // Debounce: send position at most every 2 s to avoid jitter
  const lastSentRef = useRef(0);
  useEffect(() => {
    if (!current || !webRef.current) return;
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return;
    lastSentRef.current = now;
    webRef.current.postMessage(JSON.stringify({ lat: current.lat, lon: current.lon }));
  }, [current?.lat, current?.lon]);

  const lat = current?.lat ?? 34.033;
  const lon = current?.lon ?? -5.0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>GPS TRACKING</Text>
        <View style={[styles.badge, { borderColor: connected ? `${Colors.success}50` : Colors.border }]}>
          <View style={[styles.dot, { backgroundColor: connected ? Colors.success : Colors.textMuted }]} />
          <Text style={[styles.badgeText, { color: connected ? Colors.success : Colors.textMuted }]}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* ── Map ── */}
      <View style={styles.mapWrap}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: initialHtml }}   // stable reference — never re-mounts
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          onMessage={() => {}}
        />

        {/* Coordinate overlay */}
        <View style={styles.coordOverlay}>
          <Text style={styles.coordLabel}>LAT</Text>
          <Text style={styles.coordVal}>{lat.toFixed(5)}</Text>
          <View style={styles.coordDivider} />
          <Text style={styles.coordLabel}>LON</Text>
          <Text style={styles.coordVal}>{lon.toFixed(5)}</Text>
        </View>
      </View>

      {/* ── Bottom info strip ── */}
      <View style={styles.infoStrip}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>LAST UPDATE</Text>
          <Text style={styles.infoVal}>
            {current ? new Date(current.timestamp).toLocaleTimeString() : '—'}
          </Text>
        </View>
        <View style={styles.infoDot} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>MOVEMENT</Text>
          <Text style={[styles.infoVal, { color: current?.move ? Colors.success : Colors.textSecondary }]}>
            {current?.move ? 'ACTIVE' : 'STATIONARY'}
          </Text>
        </View>
        <View style={styles.infoDot} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>FALL</Text>
          <Text style={[styles.infoVal, { color: current?.fall ? Colors.danger : Colors.success }]}>
            {current?.fall ? 'DETECTED' : 'SAFE'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  mapWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: Colors.bg },
  coordOverlay: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(13,20,33,0.92)',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    padding: 12, alignItems: 'center',
  },
  coordLabel: { fontSize: 9, color: Colors.textLabel, fontWeight: '700', letterSpacing: 1.2 },
  coordVal: { fontSize: 13, color: Colors.accent, fontWeight: '600', fontFamily: 'Courier New', marginTop: 2 },
  coordDivider: { height: 1, width: '100%', backgroundColor: Colors.border, marginVertical: 8 },
  infoStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingVertical: 16, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'space-around',
  },
  infoItem: { alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: 10, color: Colors.textLabel, fontWeight: '600', letterSpacing: 1 },
  infoVal: { fontSize: 14, color: Colors.textPrimary, fontWeight: '700' },
  infoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.border },
});