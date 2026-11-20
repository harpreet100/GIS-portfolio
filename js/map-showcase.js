/**
 * map-showcase.js — Interactive Leaflet Web-GIS Component
 *
 * HOW TO SWAP IN YOUR OWN GEOJSON LAYER:
 * 1. Export your layer from ArcGIS Pro / QGIS as GeoJSON in WGS 84 (EPSG:4326)
 *    and place it in ./assets/data/your-layer.geojson
 * 2. Update GEOJSON_PATH below to point to your file.
 * 3. Adjust the property names in buildPopupHtml() and the layer filter rules
 *    in loadGeoJsonLayers() to match your attribute schema.
 */

(function () {
    "use strict";

    const GEOJSON_PATH = "./assets/data/sample-gis-layer.geojson";
    const DEFAULT_CENTER = [51.0505, -114.0665];
    const DEFAULT_ZOOM = 13;

    document.addEventListener("DOMContentLoaded", function () {
        const mapContainer = document.getElementById("gis-map");
        if (!mapContainer || typeof L === "undefined") {
            return;
        }

        // 1. Initialize Leaflet Map
        const map = L.map("gis-map", {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: true,
            scrollWheelZoom: false
        });

        // 2. Define Keyless Basemaps (Esri Light Canvas, Esri Dark Canvas, OpenStreetMap, Esri Satellite)
        const basemaps = {
            light: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
                attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
                maxZoom: 16
            }),
            dark: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
                attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
                maxZoom: 16
            }),
            street: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors",
                maxZoom: 19
            }),
            satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
                attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
                maxZoom: 19
            })
        };

        let activeBasemapKey = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        basemaps[activeBasemapKey].addTo(map);

        function setBasemap(key) {
            if (!basemaps[key] || key === activeBasemapKey) return;
            map.removeLayer(basemaps[activeBasemapKey]);
            basemaps[key].addTo(map);
            activeBasemapKey = key;

            document.querySelectorAll("[data-basemap]").forEach(function (btn) {
                const isActive = btn.dataset.basemap === key;
                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-pressed", String(isActive));
            });
        }

        // Sync initial active basemap button state
        document.querySelectorAll("[data-basemap]").forEach(function (btn) {
            const isActive = btn.dataset.basemap === activeBasemapKey;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-pressed", String(isActive));

            btn.addEventListener("click", function () {
                setBasemap(btn.dataset.basemap);
            });
        });

        // 3. Layer Groups for Toggle Controls
        const layerGroups = {
            buffers: L.layerGroup().addTo(map),
            corridors: L.layerGroup().addTo(map),
            stations: L.layerGroup().addTo(map)
        };

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        function buildPopupHtml(props) {
            const labelMap = {
                corridor: "Corridor",
                zone: "Zone",
                daily_boardings: "Daily Boardings",
                accessible: "Accessibility",
                gtfs_stop_id: "GTFS Stop ID",
                radius_m: "Buffer Radius (m)",
                area_ha: "Area (ha)",
                zoning_mix: "Zoning Mix",
                walk_time_min: "Walk Time",
                length_km: "Length (km)",
                signal_priority: "Signal Priority",
                status: "Status"
            };

            let rows = "";
            Object.keys(labelMap).forEach(function (key) {
                if (props[key] !== undefined && props[key] !== null) {
                    const val = typeof props[key] === "number"
                        ? props[key].toLocaleString()
                        : props[key];
                    rows += `<tr><th>${escapeHtml(labelMap[key])}</th><td>${escapeHtml(val)}</td></tr>`;
                }
            });

            const typeLabel = props.feature_type ? props.feature_type.toUpperCase() : "FEATURE";
            const title = props.name || "Spatial Feature";

            return `
                <div class="gis-popup">
                    <div class="gis-popup-type">${escapeHtml(typeLabel)}</div>
                    <h4 class="gis-popup-title">${escapeHtml(title)}</h4>
                    <table class="gis-popup-table">
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }

        // 4. Fetch & Render GeoJSON Features
        let fullBounds = null;

        fetch(GEOJSON_PATH)
            .then(function (res) {
                if (!res.ok) {
                    throw new Error("Failed to load GeoJSON layer: " + res.status);
                }
                return res.json();
            })
            .then(function (geojson) {
                const allLayer = L.geoJSON(geojson, {
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: 7,
                            fillColor: "#0F766E",
                            color: "#FFFFFF",
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.95
                        });
                    },
                    style: function (feature) {
                        const type = feature.properties && feature.properties.feature_type;
                        if (type === "corridor") {
                            return {
                                color: "#D97706",
                                weight: 4,
                                opacity: 0.9,
                                dashArray: "6 4"
                            };
                        }
                        // Default polygon buffer style
                        return {
                            color: "#0F766E",
                            weight: 1.75,
                            opacity: 0.85,
                            fillColor: "#0F766E",
                            fillOpacity: 0.16
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        const props = feature.properties || {};
                        layer.bindPopup(buildPopupHtml(props), { maxWidth: 280 });

                        const type = props.feature_type;
                        if (type === "station") {
                            layerGroups.stations.addLayer(layer);
                        } else if (type === "corridor") {
                            layerGroups.corridors.addLayer(layer);
                        } else {
                            layerGroups.buffers.addLayer(layer);
                        }
                    }
                });

                fullBounds = allLayer.getBounds();
                if (fullBounds.isValid()) {
                    map.fitBounds(fullBounds, { padding: [30, 30] });
                }
            })
            .catch(function (err) {
                console.error("[map-showcase]", err);
            });

        // 5. Layer Toggle Checkboxes
        document.querySelectorAll("[data-layer-toggle]").forEach(function (checkbox) {
            checkbox.addEventListener("change", function () {
                const key = checkbox.dataset.layerToggle;
                const group = layerGroups[key];
                if (!group) return;
                if (checkbox.checked) {
                    group.addTo(map);
                } else {
                    map.removeLayer(group);
                }
            });
        });

        // 6. Reset Extent Button
        const resetBtn = document.getElementById("map-reset-btn");
        if (resetBtn) {
            resetBtn.addEventListener("click", function () {
                if (fullBounds && fullBounds.isValid()) {
                    map.fitBounds(fullBounds, { padding: [30, 30] });
                } else {
                    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
                }
            });
        }

        // 7. Live Cursor Coordinates & Zoom Readout
        const coordEl = document.getElementById("map-cursor-coords");
        const zoomEl = document.getElementById("map-zoom-level");

        if (coordEl) {
            map.on("mousemove", function (e) {
                const lat = e.latlng.lat.toFixed(5);
                const lng = e.latlng.lng.toFixed(5);
                coordEl.textContent = `${lat}° N, ${Math.abs(lng)}° W`;
            });

            map.on("mouseout", function () {
                coordEl.textContent = "51.05050° N, 114.06650° W";
            });
        }

        if (zoomEl) {
            const updateZoom = function () {
                zoomEl.textContent = "Z" + map.getZoom();
            };
            updateZoom();
            map.on("zoomend", updateZoom);
        }
    });
})();
