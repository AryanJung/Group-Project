import React, { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

// ── Text-geocoder shown only when WebGL actually fails at runtime ─────────────
const GeocoderFallback = ({ onSelect, onClose, currentCoords }) => {
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState(null);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res  = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${encodeURIComponent(q)}.json` +
        `?access_token=${mapboxgl.accessToken}&limit=5&country=np`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch { setSuggestions([]); }
    finally  { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handlePick = (feature) => {
    const [lng, lat] = feature.center;
    setSelected(feature.place_name);
    setQuery(feature.place_name);
    setSuggestions([]);
    onSelect(lng, lat, feature.place_name);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0,
      width: "100vw", height: "100vh",
      backgroundColor: "rgba(0,0,0,0.85)",
      zIndex: 9999,
      display: "flex", justifyContent: "center", alignItems: "center",
    }}>
      <div style={{
        width: "90%", maxWidth: "520px",
        backgroundColor: "#fff",
        borderRadius: "15px",
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.32)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #ddd" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Select Property Location</h3>
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#dc2626", lineHeight: 1.5 }}>
              ⚠ The interactive map requires hardware acceleration.<br/>
              <strong>Chrome → Settings → System → Enable hardware acceleration → Relaunch.</strong>
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
              For now, search for the location by name below.
            </p>
          </div>
          <button onClick={onClose} style={{ fontSize: "22px", border: "none", background: "none", cursor: "pointer", lineHeight: 1, flexShrink: 0, marginLeft: "12px" }}>×</button>
        </div>

        {/* Search input */}
        <div style={{ padding: "20px 20px 0" }}>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search location (e.g. Jawalakhel, Lalitpur)"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px",
              border: "1px solid #ddd", borderRadius: "8px",
              fontSize: "14px", outline: "none",
            }}
          />

          {suggestions.length > 0 && (
            <ul style={{
              listStyle: "none", margin: "4px 0 0", padding: 0,
              border: "1px solid #e5e9f2", borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            }}>
              {suggestions.map((f) => (
                <li
                  key={f.id}
                  onClick={() => handlePick(f)}
                  style={{
                    padding: "10px 14px", cursor: "pointer",
                    fontSize: "13px", borderBottom: "1px solid #f0f0f0",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f5f7ff"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                >
                  📍 {f.place_name}
                </li>
              ))}
            </ul>
          )}

          {loading && <p style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>Searching…</p>}

          {selected && (
            <div style={{
              marginTop: "12px", padding: "10px 14px",
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: "8px", fontSize: "13px", color: "#166534",
            }}>
              ✅ Location set: <strong>{selected}</strong>
            </div>
          )}
        </div>

        <div style={{ padding: "20px", textAlign: "right" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={!selected && !currentCoords}
            style={{
              backgroundColor: (selected || currentCoords) ? "#2ecc71" : "#ccc",
              color: "white", padding: "10px 25px",
              borderRadius: "5px", border: "none",
              cursor: (selected || currentCoords) ? "pointer" : "default",
              fontWeight: "bold",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main MapPicker ────────────────────────────────────────────────────────────
const MapPicker = ({ setCoordinates, setLocationName, currentCoords }) => {
  const [isOpen,      setIsOpen]      = useState(false);
  const [webGLFailed, setWebGLFailed] = useState(false);
  const mapContainer = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);

  const handleLocationSelect = useCallback(async (lng, lat, knownName) => {
    setCoordinates({ lng, lat });

    if (knownName) {
      setLocationName(knownName);
    } else {
      try {
        const res  = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
          `?access_token=${mapboxgl.accessToken}`
        );
        const data = await res.json();
        setLocationName(data.features[0]?.place_name || "Pinned Location");
      } catch {
        setLocationName("Pinned Location");
      }
    }

    if (mapRef.current) {
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new mapboxgl.Marker({ color: "#FF4444" })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    }
  }, [setCoordinates, setLocationName]);

  // ── Initialise the interactive GL map ────────────────────────────────────
  useEffect(() => {
    // Only run when the modal is open and map not yet created
    if (!isOpen || mapRef.current || webGLFailed) return;

    const timer = setTimeout(() => {
      if (!mapContainer.current) return;

      // Basic WebGL check (not strict — we want to try even on software renderers)
      if (!mapboxgl.supported()) {
        setWebGLFailed(true);
        return;
      }

      let map;
      try {
        map = new mapboxgl.Map({
          container: mapContainer.current,
          style:     "mapbox://styles/mapbox/streets-v12",
          center:    currentCoords
            ? [currentCoords.lng, currentCoords.lat]
            : [85.324, 27.7172],
          zoom: 13,
        });
      } catch {
        setWebGLFailed(true);
        return;
      }

      // Mapbox fires WebGL errors as events, not throws — catch them here
      map.once("error", (e) => {
        const msg = (e.error?.message || "").toLowerCase();
        if (msg.includes("webgl") || msg.includes("failed to initialize")) {
          try { map.remove(); } catch {}
          mapRef.current = null;
          setWebGLFailed(true);
        }
      });

      mapRef.current = map;

      // If the form already has coords, place the marker on open
      if (currentCoords) {
        markerRef.current = new mapboxgl.Marker({ color: "#FF4444" })
          .setLngLat([currentCoords.lng, currentCoords.lat])
          .addTo(map);
      }

      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
        countries: "np",
        placeholder: "Search landmark (e.g. Patan Durbar Square)",
      });

      map.addControl(geocoder);

      map.on("click", (event) => {
        handleLocationSelect(event.lngLat.lng, event.lngLat.lat);
      });

      geocoder.on("result", (event) => {
        handleLocationSelect(
          event.result.center[0],
          event.result.center[1],
          event.result.place_name
        );
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, webGLFailed, handleLocationSelect, currentCoords]);

  // Cleanup on modal close
  useEffect(() => {
    if (!isOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [isOpen]);

  const handleClose = () => setIsOpen(false);

  return (
    <div className="map-picker-wrapper">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-open-map"
        style={{
          width: "100%", padding: "12px",
          backgroundColor: currentCoords ? "#27ae60" : "#3498db",
          color: "white", border: "none", borderRadius: "6px",
          cursor: "pointer", fontWeight: "bold", transition: "0.3s",
        }}
      >
        {currentCoords ? "Location Pinned ✓ (Change)" : "Open Map to Pin Location"}
      </button>

      {/* ── WebGL failed at runtime → show text geocoder ── */}
      {isOpen && webGLFailed && (
        <GeocoderFallback
          onSelect={(lng, lat, name) => handleLocationSelect(lng, lat, name)}
          onClose={handleClose}
          currentCoords={currentCoords}
        />
      )}

      {/* ── Interactive GL map (shown while WebGL hasn't failed yet) ── */}
      {isOpen && !webGLFailed && (
        <div style={{
          position: "fixed", top: 0, left: 0,
          width: "100vw", height: "100vh",
          backgroundColor: "rgba(0,0,0,0.85)",
          zIndex: 9999,
          display: "flex", justifyContent: "center", alignItems: "center",
        }}>
          <div style={{
            width: "90%", maxWidth: "900px", height: "80vh",
            backgroundColor: "white", borderRadius: "15px",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd" }}>
              <h3 style={{ margin: 0 }}>Select Property Location</h3>
              <button
                onClick={handleClose}
                style={{ fontSize: "24px", border: "none", background: "none", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div ref={mapContainer} style={{ flex: 1, width: "100%" }} />

            <div style={{ padding: "20px", borderTop: "1px solid #ddd", textAlign: "right" }}>
              <p style={{ float: "left", color: "#666", fontSize: "14px", margin: 0 }}>
                Click anywhere on the map to drop a pin
              </p>
              <button
                type="button"
                onClick={handleClose}
                style={{ backgroundColor: "#2ecc71", color: "white", padding: "10px 25px", borderRadius: "5px", border: "none", cursor: "pointer", fontWeight: "bold" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPicker;
