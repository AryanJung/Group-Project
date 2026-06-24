import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const MapPicker = ({ setCoordinates, setLocationName, currentCoords }) => {
  const [isOpen, setIsOpen] = useState(false);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    // Only initialize the map when the modal is opened AND the container exists
    if (isOpen && !mapRef.current) {
      // Give the browser a tiny moment to render the modal container
      setTimeout(() => {
        if (!mapContainer.current) return;

        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12", 
          center: [85.3240, 27.7172], // Kathmandu
          zoom: 13,
        });

        const geocoder = new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          mapboxgl: mapboxgl,
          countries: 'np',
          placeholder: "Search landmark (e.g. Patan Durbar Square)"
        });

        mapRef.current.addControl(geocoder);

        // Click to set pin
        mapRef.current.on("click", (e) => {
          handleLocationSelect(e.lngLat.lng, e.lngLat.lat);
        });

        // Search to set pin
        geocoder.on('result', (e) => {
          handleLocationSelect(e.result.center[0], e.result.center[1]);
        });
      }, 100);
    }

    // Cleanup when modal closes
    return () => {
      if (!isOpen && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen]);

  const handleLocationSelect = async (lng, lat) => {
    // 1. Update Marker on Map
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new mapboxgl.Marker({ color: "#FF4444" })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    // 2. Save Coordinates
    setCoordinates({ lng, lat });

    // 3. Get Address Name
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`);
      const data = await res.json();
      const placeName = data.features[0]?.place_name || "Pinned Location";
      setLocationName(placeName);
    } catch (err) {
      console.error("Geocoding error:", err);
    }
  };

  return (
    <div className="map-picker-wrapper">
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className="btn-open-map"
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: currentCoords ? '#27ae60' : '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: '0.3s'
        }}
      >
        {currentCoords ? "✅ Location Pinned (Change)" : "📍 Open Map to Pin Location"}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            width: '90%', maxWidth: '900px', height: '80vh',
            backgroundColor: 'white', borderRadius: '15px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
              <h3 style={{ margin: 0 }}>Select Property Location</h3>
              <button onClick={() => setIsOpen(false)} style={{ fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer' }}>&times;</button>
            </div>

            <div ref={mapContainer} style={{ flex: 1, width: '100%' }} />

            <div style={{ padding: '20px', borderTop: '1px solid #ddd', textAlign: 'right' }}>
               <p style={{ float: 'left', color: '#666', fontSize: '14px' }}>Click anywhere on the map to drop a pin</p>
               <button 
                 type="button"
                 onClick={() => setIsOpen(false)}
                 style={{ backgroundColor: '#2ecc71', color: 'white', padding: '10px 25px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
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
