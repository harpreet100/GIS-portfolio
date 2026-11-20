/**
 * map-showcase.js — MapLibre GL JS (WebGL 3D) + Turf.js Spatial Workbench
 *
 * Modes:
 *  A. Spatial Buffer Sandbox:
 *     - Fetches live Calgary CTrain / LRT station GeoJSON from City of Calgary Open Data
 *       (5-second timeout; falls back cleanly to ./assets/data/sample-gis-layer.geojson).
 *     - Interactive Turf.js buffer, pointsWithinPolygon, area, density, and nearestPoint.
 *  B. 3D Project Fly-Through:
 *     - Flies 3D camera across 4 portfolio study sites with target markers & case study links.
 *
 * Style Persistence:
 *  - attachCustomLayers() is invoked on both initial `load` and `style.load` so custom
 *    GeoJSON sources and layers survive OpenFreeMap style switches.
 */

(function () {
    "use strict";

    const LIVE_CALGARY_API = "https://data.calgary.ca/resource/2axz-xm4q.geojson";
    const FALLBACK_GEOJSON = "./assets/data/sample-gis-layer.geojson";

    const VECTOR_STYLES = {
        liberty: "https://tiles.openfreemap.org/styles/liberty",
        positron: "https://tiles.openfreemap.org/styles/positron",
        dark: "https://tiles.openfreemap.org/styles/dark"
    };

    const INITIAL_CENTER = [-114.0719, 51.0447];
    const INITIAL_ZOOM = 12.2;
    const INITIAL_PITCH = 45;
    const INITIAL_BEARING = -15;

    const WAYPOINTS = {
        rvc: {
            center: [-114.02, 51.25],
            zoom: 10.5,
            pitch: 45,
            bearing: 0,
            eyebrow: "Municipal GIS Practicum",
            title: "Rocky View County",
            summary: "Planning circulation map sets, custom-radius property queries, ArcGIS Enterprise/Field Maps, and Python/FME automation.",
            url: "./projects/practicum.html"
        },
        transit: {
            center: [-114.0719, 51.0447],
            zoom: 13.5,
            pitch: 58,
            bearing: -25,
            eyebrow: "GTFS ETL & LiDAR Accessibility",
            title: "Calgary Transit & Winter Risk",
            summary: "Static/real-time GTFS spatial modeling, 800m walk-sheds, and winter snow-clearing risk assessment.",
            url: "./projects/transit.html"
        },
        prairie: {
            center: [-113.95, 51.14],
            zoom: 14.5,
            pitch: 55,
            bearing: 20,
            eyebrow: "ArcGIS Field Maps Asset Inventory",
            title: "Wind Prairie Park (Calgary)",
            summary: "Mobile field data collection schema design, spatial QA/QC, and hosted feature layer synchronization.",
            url: "./projects.html"
        },
        toronto: {
            center: [-79.596, 43.731],
            zoom: 12.5,
            pitch: 50,
            bearing: 15,
            eyebrow: "2024 Auto Theft Gi* Hotspot",
            title: "Toronto — West Humber-Clairville",
            summary: "99% confidence Getis-Ord Gi* hotspot (p < 0.01) and 21.22 thefts/km² density within 1 km of TTC commuter lots.",
            url: "./projects/toronto-auto-theft.html"
        }
    };

    document.addEventListener("DOMContentLoaded", function () {
        const container = document.getElementById("gis-map");
        if (!container || typeof maplibregl === "undefined" || typeof turf === "undefined") {
            return;
        }

        // State
        let activeMode = "sandbox"; // "sandbox" | "flythrough"
        let activeStyleKey = "liberty";
        let isTilted = true;
        let analysisCenter = INITIAL_CENTER.slice();
        let bufferRadiusKm = 1.5;
        let stationsCollection = { type: "FeatureCollection", features: [] };
        let activeWaypointKey = "rvc";

        // Computed GeoJSON state (persisted across style switches)
        let bufferGeoJSON = emptyFC();
        let nearestLineGeoJSON = emptyFC();
        let styledStationsGeoJSON = emptyFC();
        let centerPointGeoJSON = makeCenterFC(analysisCenter);
        let flythroughTargetGeoJSON = emptyFC();

        function emptyFC() {
            return { type: "FeatureCollection", features: [] };
        }

        function makeCenterFC(coords) {
            return {
                type: "FeatureCollection",
                features: [{
                    type: "Feature",
                    properties: { role: "center" },
                    geometry: { type: "Point", coordinates: coords }
                }]
            };
        }

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        function getStationName(props) {
            if (!props) return "CTrain Station";
            return (
                props.station_name ||
                props.name ||
                props.stop_name ||
                props.station ||
                "CTrain Station"
            );
        }

        function getStationLine(props) {
            if (!props) return "Calgary Transit LRT";
            return props.route || props.corridor || props.leg || props.status || "Calgary Transit LRT";
        }

        // 1. Initialize MapLibre GL JS Map
        const map = new maplibregl.Map({
            container: "gis-map",
            style: VECTOR_STYLES[activeStyleKey],
            center: INITIAL_CENTER,
            zoom: INITIAL_ZOOM,
            pitch: INITIAL_PITCH,
            bearing: INITIAL_BEARING,
            antialias: true
        });

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");

        // 2. Attach Custom Sources & Layers (called on `load` and `style.load`)
        function attachCustomLayers() {
            if (!map.getSource("buffer-source")) {
                map.addSource("buffer-source", { type: "geojson", data: bufferGeoJSON });
                map.addLayer({
                    id: "buffer-fill",
                    type: "fill",
                    source: "buffer-source",
                    paint: {
                        "fill-color": "#0F766E",
                        "fill-opacity": 0.18
                    }
                });
                map.addLayer({
                    id: "buffer-outline",
                    type: "line",
                    source: "buffer-source",
                    paint: {
                        "line-color": "#0F766E",
                        "line-width": 2.2
                    }
                });
            }

            if (!map.getSource("nearest-line-source")) {
                map.addSource("nearest-line-source", { type: "geojson", data: nearestLineGeoJSON });
                map.addLayer({
                    id: "nearest-line-layer",
                    type: "line",
                    source: "nearest-line-source",
                    paint: {
                        "line-color": "#D97706",
                        "line-width": 2.5,
                        "line-dasharray": [3, 2]
                    }
                });
            }

            if (!map.getSource("stations-source")) {
                map.addSource("stations-source", { type: "geojson", data: styledStationsGeoJSON });
                map.addLayer({
                    id: "stations-circle",
                    type: "circle",
                    source: "stations-source",
                    paint: {
                        "circle-radius": [
                            "case",
                            ["==", ["get", "inBuffer"], true],
                            7.5,
                            5.5
                        ],
                        "circle-color": [
                            "case",
                            ["==", ["get", "inBuffer"], true],
                            "#D97706",
                            "#64748B"
                        ],
                        "circle-stroke-color": "#FFFFFF",
                        "circle-stroke-width": 1.75
                    }
                });
            }

            if (!map.getSource("center-source")) {
                map.addSource("center-source", { type: "geojson", data: centerPointGeoJSON });
                map.addLayer({
                    id: "center-halo",
                    type: "circle",
                    source: "center-source",
                    paint: {
                        "circle-radius": 11,
                        "circle-color": "#0F766E",
                        "circle-opacity": 0.25
                    }
                });
                map.addLayer({
                    id: "center-core",
                    type: "circle",
                    source: "center-source",
                    paint: {
                        "circle-radius": 6,
                        "circle-color": "#0F766E",
                        "circle-stroke-color": "#FFFFFF",
                        "circle-stroke-width": 2
                    }
                });
            }

            if (!map.getSource("flythrough-source")) {
                map.addSource("flythrough-source", { type: "geojson", data: flythroughTargetGeoJSON });
                map.addLayer({
                    id: "flythrough-ring",
                    type: "circle",
                    source: "flythrough-source",
                    paint: {
                        "circle-radius": 16,
                        "circle-color": "#D97706",
                        "circle-opacity": 0.22,
                        "circle-stroke-color": "#D97706",
                        "circle-stroke-width": 2
                    }
                });
                map.addLayer({
                    id: "flythrough-core",
                    type: "circle",
                    source: "flythrough-source",
                    paint: {
                        "circle-radius": 6,
                        "circle-color": "#D97706",
                        "circle-stroke-color": "#FFFFFF",
                        "circle-stroke-width": 2
                    }
                });
            }

            syncLayerVisibility();
        }

        function syncLayerVisibility() {
            const sandboxVis = activeMode === "sandbox" ? "visible" : "none";
            const flyVis = activeMode === "flythrough" ? "visible" : "none";

            ["buffer-fill", "buffer-outline", "nearest-line-layer", "stations-circle", "center-halo", "center-core"].forEach(function (id) {
                if (map.getLayer(id)) {
                    map.setLayoutProperty(id, "visibility", sandboxVis);
                }
            });

            ["flythrough-ring", "flythrough-core"].forEach(function (id) {
                if (map.getLayer(id)) {
                    map.setLayoutProperty(id, "visibility", flyVis);
                }
            });
        }

        function pushGeoJSONToSources() {
            const srcBuf = map.getSource("buffer-source");
            if (srcBuf) srcBuf.setData(bufferGeoJSON);

            const srcLine = map.getSource("nearest-line-source");
            if (srcLine) srcLine.setData(nearestLineGeoJSON);

            const srcStations = map.getSource("stations-source");
            if (srcStations) srcStations.setData(styledStationsGeoJSON);

            const srcCenter = map.getSource("center-source");
            if (srcCenter) srcCenter.setData(centerPointGeoJSON);

            const srcFly = map.getSource("flythrough-source");
            if (srcFly) srcFly.setData(flythroughTargetGeoJSON);
        }

        // 3. Turf.js Spatial Buffer & Nearest Station Calculation
        function runSpatialAnalysis() {
            const centerPt = turf.point(analysisCenter);
            centerPointGeoJSON = makeCenterFC(analysisCenter);

            const bufferPoly = turf.buffer(centerPt, bufferRadiusKm, { units: "kilometers" });
            bufferGeoJSON = { type: "FeatureCollection", features: [bufferPoly] };

            const areaSqKm = turf.area(bufferPoly) / 1e6;
            let capturedCount = 0;

            if (stationsCollection.features.length > 0) {
                const within = turf.pointsWithinPolygon(stationsCollection, bufferPoly);
                const capturedNames = new Set(
                    within.features.map(function (f) {
                        return f.geometry.coordinates.join(",");
                    })
                );

                styledStationsGeoJSON = {
                    type: "FeatureCollection",
                    features: stationsCollection.features.map(function (f) {
                        const key = f.geometry.coordinates.join(",");
                        const isInside = capturedNames.has(key);
                        return {
                            type: "Feature",
                            geometry: f.geometry,
                            properties: Object.assign({}, f.properties, { inBuffer: isInside })
                        };
                    })
                };

                capturedCount = within.features.length;

                const nearest = turf.nearestPoint(centerPt, stationsCollection);
                const distKm = turf.distance(centerPt, nearest, { units: "kilometers" });

                nearestLineGeoJSON = {
                    type: "FeatureCollection",
                    features: [{
                        type: "Feature",
                        properties: {},
                        geometry: {
                            type: "LineString",
                            coordinates: [analysisCenter, nearest.geometry.coordinates]
                        }
                    }]
                };

                document.getElementById("hud-nearest-dist").textContent = distKm.toFixed(2) + " km";
                document.getElementById("hud-nearest-name").textContent = getStationName(nearest.properties);
            } else {
                styledStationsGeoJSON = emptyFC();
                nearestLineGeoJSON = emptyFC();
                document.getElementById("hud-nearest-dist").textContent = "--";
                document.getElementById("hud-nearest-name").textContent = "No stations loaded";
            }

            const density = areaSqKm > 0 ? capturedCount / areaSqKm : 0;
            document.getElementById("hud-station-count").textContent = String(capturedCount);
            document.getElementById("hud-buffer-area").textContent = areaSqKm.toFixed(2) + " km²";
            document.getElementById("hud-density").textContent = density.toFixed(2);
            document.getElementById("hud-total-stations").textContent = String(stationsCollection.features.length);

            pushGeoJSONToSources();
        }

        // 4. Fetch Live Calgary Open Data with 5-Second Timeout + Local Fallback
        async function loadStationData() {
            const badgeEl = document.getElementById("map-source-badge");
            const controller = new AbortController();
            const timer = setTimeout(function () {
                controller.abort();
            }, 5000);

            try {
                const res = await fetch(LIVE_CALGARY_API, { signal: controller.signal });
                clearTimeout(timer);
                if (!res.ok) throw new Error("HTTP " + res.status);
                const data = await res.json();
                const points = normalizeToPointFeatures(data);
                if (points.features.length === 0) throw new Error("Empty dataset");

                stationsCollection = points;
                if (badgeEl) {
                    badgeEl.textContent = "LIVE API: City of Calgary Open Data";
                    badgeEl.classList.remove("fallback");
                }
            } catch (_err) {
                clearTimeout(timer);
                try {
                    const fallbackRes = await fetch(FALLBACK_GEOJSON);
                    const fallbackData = await fallbackRes.json();
                    stationsCollection = normalizeToPointFeatures(fallbackData);
                } catch (_fallbackErr) {
                    stationsCollection = emptyFC();
                }
                if (badgeEl) {
                    badgeEl.textContent = "LOCAL FALLBACK: sample-gis-layer.geojson";
                    badgeEl.classList.add("fallback");
                }
            }

            runSpatialAnalysis();
        }

        function normalizeToPointFeatures(geojson) {
            if (!geojson || !Array.isArray(geojson.features)) return emptyFC();
            const pointFeatures = geojson.features.filter(function (f) {
                return f && f.geometry && f.geometry.type === "Point" && Array.isArray(f.geometry.coordinates);
            });
            return { type: "FeatureCollection", features: pointFeatures };
        }

        // 5. Map Events
        map.on("load", function () {
            attachCustomLayers();
            loadStationData();
        });

        map.on("style.load", function () {
            attachCustomLayers();
            pushGeoJSONToSources();
        });

        // Click station for popup or click map to move buffer center
        map.on("click", function (e) {
            if (activeMode !== "sandbox") return;

            const hits = map.queryRenderedFeatures(e.point, { layers: ["stations-circle"] });
            if (hits && hits.length > 0) {
                const feat = hits[0];
                const props = feat.properties || {};
                const html = `
                    <div class="gis-popup">
                        <div class="gis-popup-type">CTRAIN / LRT STATION</div>
                        <h4 class="gis-popup-title">${escapeHtml(getStationName(props))}</h4>
                        <table class="gis-popup-table">
                            <tbody>
                                <tr><th>Corridor / Route</th><td>${escapeHtml(getStationLine(props))}</td></tr>
                                <tr><th>In Catchment</th><td>${props.inBuffer ? "Yes" : "No"}</td></tr>
                            </tbody>
                        </table>
                    </div>
                `;
                new maplibregl.Popup({ offset: 10 })
                    .setLngLat(feat.geometry.coordinates)
                    .setHTML(html)
                    .addTo(map);
                return;
            }

            analysisCenter = [e.lngLat.lng, e.lngLat.lat];
            runSpatialAnalysis();
        });

        map.on("mouseenter", "stations-circle", function () {
            map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "stations-circle", function () {
            map.getCanvas().style.cursor = activeMode === "sandbox" ? "crosshair" : "";
        });

        // Telemetry Status Bar Updates
        const coordEl = document.getElementById("map-cursor-coords");
        const zoomPitchEl = document.getElementById("map-zoom-pitch");

        map.on("mousemove", function (e) {
            if (!coordEl) return;
            const lat = e.lngLat.lat.toFixed(5);
            const lng = Math.abs(e.lngLat.lng).toFixed(5);
            coordEl.textContent = `${lat}° N, ${lng}° W`;
        });

        function updateViewTelemetry() {
            if (!zoomPitchEl) return;
            const z = map.getZoom().toFixed(1);
            const p = Math.round(map.getPitch());
            zoomPitchEl.textContent = `Z${z} / P${p}°`;
        }
        map.on("zoom", updateViewTelemetry);
        map.on("pitch", updateViewTelemetry);

        // 6. UI Controls: Radius Slider
        const radiusSlider = document.getElementById("buffer-radius-slider");
        const radiusVal = document.getElementById("buffer-radius-val");
        if (radiusSlider && radiusVal) {
            radiusSlider.addEventListener("input", function () {
                bufferRadiusKm = parseFloat(radiusSlider.value);
                radiusVal.textContent = bufferRadiusKm.toFixed(2) + " km";
                runSpatialAnalysis();
            });
        }

        // 7. UI Controls: Mode Switcher
        const panelSandbox = document.getElementById("panel-sandbox");
        const panelFlythrough = document.getElementById("panel-flythrough");

        document.querySelectorAll("[data-mode]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const nextMode = btn.dataset.mode;
                if (nextMode === activeMode) return;
                activeMode = nextMode;

                document.querySelectorAll("[data-mode]").forEach(function (b) {
                    const isCurrent = b.dataset.mode === activeMode;
                    b.classList.toggle("active", isCurrent);
                    b.setAttribute("aria-pressed", String(isCurrent));
                });

                if (panelSandbox) panelSandbox.hidden = activeMode !== "sandbox";
                if (panelFlythrough) panelFlythrough.hidden = activeMode !== "flythrough";

                if (activeMode === "sandbox") {
                    flythroughTargetGeoJSON = emptyFC();
                    pushGeoJSONToSources();
                    map.flyTo({
                        center: INITIAL_CENTER,
                        zoom: INITIAL_ZOOM,
                        pitch: isTilted ? INITIAL_PITCH : 0,
                        bearing: INITIAL_BEARING,
                        speed: 1.4
                    });
                } else {
                    flyToWaypoint(activeWaypointKey);
                }
                syncLayerVisibility();
            });
        });

        // 8. UI Controls: 3D Project Fly-Through Waypoints
        function flyToWaypoint(key) {
            const wp = WAYPOINTS[key];
            if (!wp) return;
            activeWaypointKey = key;

            document.querySelectorAll("[data-waypoint]").forEach(function (chip) {
                chip.classList.toggle("active", chip.dataset.waypoint === key);
            });

            document.getElementById("fly-eyebrow").textContent = wp.eyebrow;
            document.getElementById("fly-title").textContent = wp.title;
            document.getElementById("fly-summary").textContent = wp.summary;
            document.getElementById("fly-link").setAttribute("href", wp.url);

            flythroughTargetGeoJSON = {
                type: "FeatureCollection",
                features: [{
                    type: "Feature",
                    properties: { title: wp.title },
                    geometry: { type: "Point", coordinates: wp.center }
                }]
            };
            pushGeoJSONToSources();

            map.flyTo({
                center: wp.center,
                zoom: wp.zoom,
                pitch: isTilted ? wp.pitch : 0,
                bearing: wp.bearing,
                speed: 1.4,
                curve: 1.3
            });
        }

        document.querySelectorAll("[data-waypoint]").forEach(function (chip) {
            chip.addEventListener("click", function () {
                flyToWaypoint(chip.dataset.waypoint);
            });
        });

        // 9. UI Controls: Vector Style Switcher & 2D/3D Tilt
        document.querySelectorAll("[data-style]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const nextStyle = btn.dataset.style;
                if (!VECTOR_STYLES[nextStyle] || nextStyle === activeStyleKey) return;
                activeStyleKey = nextStyle;

                document.querySelectorAll("[data-style]").forEach(function (b) {
                    const isCurrent = b.dataset.style === activeStyleKey;
                    b.classList.toggle("active", isCurrent);
                    b.setAttribute("aria-pressed", String(isCurrent));
                });

                map.setStyle(VECTOR_STYLES[activeStyleKey]);
            });
        });

        const tiltBtn = document.getElementById("map-tilt-btn");
        if (tiltBtn) {
            tiltBtn.addEventListener("click", function () {
                isTilted = !isTilted;
                tiltBtn.classList.toggle("active", isTilted);
                tiltBtn.setAttribute("aria-pressed", String(isTilted));
                map.easeTo({ pitch: isTilted ? 55 : 0, duration: 600 });
            });
        }
    });
})();
