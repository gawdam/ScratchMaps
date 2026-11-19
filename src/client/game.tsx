import './index.css';
import 'leaflet/dist/leaflet.css';

import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Mountain, toSvg, Tree } from '@matita/icons';
import L, { type StyleFunction } from 'leaflet';
import { landmarks } from './landmarks';
import { worldCountries } from './world-countries';
import { worldLakes, worldRivers } from './world-water';

export const App = () => {
  const mapElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mapContainer = mapElement.current;
    if (!mapContainer) {
      return;
    }

    const worldBounds = L.latLngBounds([
      [-85.05112878, -180],
      [85.05112878, 180],
    ]);
    const map = L.map(mapContainer, {
      maxZoom: 12,
      zoomSnap: 0.1,
      maxBounds: worldBounds,
      maxBoundsViscosity: 0.8,
      renderer: L.canvas(),
    });
    map.fitBounds(worldBounds, { padding: [0, 0] });
    map.setMinZoom(map.getZoom());
    const borderPane = map.createPane('map-borders');
    borderPane.style.zIndex = '625';
    const borderRenderer = L.canvas({ pane: 'map-borders' }).addTo(map);

    let zoomLevel: HTMLOutputElement | null = null;
    const updateZoomLevel = () => {
      if (zoomLevel) {
        zoomLevel.value = map.getZoom().toFixed(1);
      }
    };
    const zoomControl = new L.Control({ position: 'topright' });
    zoomControl.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-bar map-zoom-control');
      const zoomIn = L.DomUtil.create('button', 'map-zoom-control__button');
      zoomIn.type = 'button';
      zoomIn.textContent = '+';
      zoomIn.title = 'Zoom in';
      zoomIn.setAttribute('aria-label', 'Zoom in');
      zoomIn.addEventListener('click', () => map.zoomIn());

      zoomLevel = L.DomUtil.create('output', 'map-zoom-control__level');
      zoomLevel.setAttribute('aria-label', 'Current zoom level');
      zoomLevel.setAttribute('aria-live', 'polite');

      const zoomOut = L.DomUtil.create('button', 'map-zoom-control__button');
      zoomOut.type = 'button';
      zoomOut.textContent = '-';
      zoomOut.title = 'Zoom out';
      zoomOut.setAttribute('aria-label', 'Zoom out');
      zoomOut.addEventListener('click', () => map.zoomOut());

      container.append(zoomIn, zoomLevel, zoomOut);
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      updateZoomLevel();
      return container;
    };
    zoomControl.addTo(map);
    map.on('zoomend', updateZoomLevel);

    type WaterProperties = { min_zoom: number };

    L.geoJSON(worldCountries, {
      style: {
        color: '#e7d8b5',
        fillColor: '#e7d8b5',
        fillOpacity: 1,
        weight: 0.1,
      },
      attribution:
        'Peaks: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain) | Forests: <a href="https://www.worldwildlife.org/">WWF/RESOLVE</a> (CC BY 4.0) | Icons: <a href="https://matita.dev/">Matita</a> (MIT)',
    }).addTo(map);
    const lakeStyle: StyleFunction<WaterProperties> = (feature) => {
      const visible = map.getZoom() >= (feature?.properties.min_zoom ?? 0);

      return {
        color: '#8eb8b3',
        fillColor: '#8eb8b3',
        fillOpacity: visible ? 1 : 0,
        opacity: visible ? 1 : 0,
        weight: 0.3,
      };
    };
    const riverStyle: StyleFunction<WaterProperties> = (feature) => {
      const visible = map.getZoom() >= (feature?.properties.min_zoom ?? 0);

      return {
        color: '#376d72',
        opacity: visible ? 1 : 0,
        weight: 1.8,
      };
    };
    const lakes = L.geoJSON(worldLakes, { style: lakeStyle }).addTo(map);
    const rivers = L.geoJSON(worldRivers, { style: riverStyle }).addTo(map);
    const landmarkMarkers = L.layerGroup().addTo(map);

    for (const landmark of landmarks) {
      const isMountain = landmark.kind === 'mountain';
      const color = isMountain ? '#79513b' : '#496446';
      const icon = isMountain ? Mountain : Tree;
      const markerIcon = L.divIcon({
        className: `landmark-marker landmark-marker--${landmark.kind}`,
        html: toSvg(icon, {
          size: 23,
          color,
          pencil: true,
          title: landmark.name,
        }),
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([landmark.lat, landmark.lng], {
        icon: markerIcon,
        title: landmark.name,
        riseOnHover: true,
        zIndexOffset: 1000,
      })
        .bindTooltip(landmark.name, { direction: 'top', offset: [0, -14] })
        .addTo(landmarkMarkers);
    }

    const countryBorders = L.geoJSON(worldCountries, {
      style: {
        renderer: borderRenderer,
        fill: false,
        color: '#88745b',
        opacity: 1,
        weight: 1.25,
      },
      interactive: false,
    }).addTo(map);

    const legend = new L.Control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const container = L.DomUtil.create('div', 'landmark-legend');
      container.innerHTML = `
        <strong class="landmark-legend__title">Natural landmarks</strong>
        <span class="landmark-legend__item">
          ${toSvg(Mountain, { size: 20, color: '#79513b', pencil: true })}
          Mountains
        </span>
        <span class="landmark-legend__item">
          ${toSvg(Tree, { size: 20, color: '#496446', pencil: true })}
          Forests
        </span>
      `;
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    };
    legend.addTo(map);

    const updateFeatureStyles = () => {
      countryBorders.setStyle({
        weight: Math.max(0.3, 1.25 - map.getZoom() * 0.08),
      });
      lakes.setStyle(lakeStyle);
      rivers.setStyle(riverStyle);
    };
    map.on('zoomend', updateFeatureStyles);
    return () => {
      map.off('zoomend', updateZoomLevel);
      map.off('zoomend', updateFeatureStyles);
      map.remove();
    };
  }, []);

  return (
    <main className="fixed inset-0 h-screen w-screen">
      <div
        ref={mapElement}
        className="world-map"
        aria-label="Interactive world map. Use the zoom controls or drag to explore."
      />
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
