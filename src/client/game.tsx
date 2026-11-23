import 'leaflet/dist/leaflet.css';
import './index.css';

import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Filter, Mountain, Palette, Text, Tree, Waves, ZoomIn, ZoomOut } from '@matita/icons';
import { PlopProvider, Tag, WordSticker } from '@plop-ui/react';
import L, { type StyleFunction } from 'leaflet';
import { colorCountries, getCountryCoastline, nationPalette } from './country-colors';
import { matitaSvg } from './icon-svg';
import { landmarks, visibleLandmarks } from './landmarks';
import { addLocationChallenge } from './location-challenge';
import { countryLabelInBounds, prepareCountryLabel, showDetailNames, type MapLabel } from './map-labels';
import riverLabels from './river-label-data.json';
import { getRiverStyle } from './river-style';
import type { LandmarkAssets } from './snippet-renderer';
import { worldCountries } from './world-countries';
import { worldLakes, worldRivers } from './world-water';

const landmarkAssets: LandmarkAssets = {
  mountain: { url: new URL('../../icons/mountains.png', import.meta.url).href, color: '#313131', size: 42 },
  forest: { url: new URL('../../icons/trees.png', import.meta.url).href, color: '#313131', size: 25.2 },
};
const oceanColor = '#928D79';

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
      zoomControl: false,
      attributionControl: false,
      maxZoom: 12,
      zoomSnap: 0.1,
      maxBounds: worldBounds,
      maxBoundsViscosity: 0.8,
      renderer: L.canvas(),
    });
    map.fitBounds(worldBounds, { padding: [0, 0] });
    map.setMinZoom(Math.min(2, map.getZoom()));
    map.setView(worldBounds.getCenter(), 2, { animate: false });
    const countryPane = map.createPane('map-country-fills');
    countryPane.style.zIndex = '410';
    const countryRenderer = L.svg({ pane: 'map-country-fills' }).addTo(map);
    const countrySvg = countryPane.querySelector('svg');
    if (countrySvg) {
      const svgNamespace = 'http://www.w3.org/2000/svg';
      const defs = document.createElementNS(svgNamespace, 'defs');
      const pattern = document.createElementNS(svgNamespace, 'pattern');
      pattern.setAttribute('id', 'country-parchment-grain');
      pattern.setAttribute('width', '32');
      pattern.setAttribute('height', '32');
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');

      const base = document.createElementNS(svgNamespace, 'rect');
      base.setAttribute('width', '32');
      base.setAttribute('height', '32');
      base.setAttribute('fill', '#e4c27e');
      pattern.append(base);

      for (const [path, opacity] of [
        ['M2 7 C8 5 10 9 16 7 S24 5 30 8', '0.14'],
        ['M-3 23 C4 20 9 24 15 22 S24 20 35 23', '0.11'],
        ['M6 14 l2 -1 M22 13 l2 1 M17 29 l2 -1', '0.2'],
      ] as const) {
        const grain = document.createElementNS(svgNamespace, 'path');
        grain.setAttribute('d', path);
        grain.setAttribute('fill', 'none');
        grain.setAttribute('stroke', '#754b27');
        grain.setAttribute('stroke-width', '0.7');
        grain.setAttribute('opacity', opacity);
        pattern.append(grain);
      }

      defs.append(pattern);
      countrySvg.prepend(defs);
    }

    const coastlineShadowPane = map.createPane('map-coastline-shadow');
    coastlineShadowPane.style.zIndex = '405';
    const coastlinePane = map.createPane('map-coastline');
    coastlinePane.style.zIndex = '630';
    const borderPane = map.createPane('map-borders');
    borderPane.style.zIndex = '625';
    const waterPane = map.createPane('map-water');
    waterPane.style.zIndex = '430';
    const borderRenderer = L.canvas({ pane: 'map-borders' }).addTo(map);
    const waterRenderer = L.canvas({ pane: 'map-water' }).addTo(map);
    const coastlineShadowRenderer = L.svg({ pane: 'map-coastline-shadow' }).addTo(map);
    const coastlineRenderer = L.svg({ pane: 'map-coastline' }).addTo(map);
    const coastlineSvg = coastlineShadowPane.querySelector('svg');
    if (coastlineSvg) {
      const svgNamespace = 'http://www.w3.org/2000/svg';
      const defs = document.createElementNS(svgNamespace, 'defs');
      const filter = document.createElementNS(svgNamespace, 'filter');
      filter.setAttribute('id', 'coastline-shading');
      filter.setAttribute('x', '-50%');
      filter.setAttribute('y', '-50%');
      filter.setAttribute('width', '200%');
      filter.setAttribute('height', '200%');

      const outerDilate = document.createElementNS(svgNamespace, 'feMorphology');
      outerDilate.setAttribute('in', 'SourceAlpha');
      outerDilate.setAttribute('operator', 'dilate');
      outerDilate.setAttribute('radius', '14');
      outerDilate.setAttribute('result', 'outer-shape');

      const outerBlur = document.createElementNS(svgNamespace, 'feGaussianBlur');
      outerBlur.setAttribute('in', 'outer-shape');
      outerBlur.setAttribute('stdDeviation', '5');
      outerBlur.setAttribute('result', 'outer-blur');

      const outerColor = document.createElementNS(svgNamespace, 'feFlood');
      outerColor.setAttribute('flood-color', '#3b2314');
      outerColor.setAttribute('flood-opacity', '0.08');
      outerColor.setAttribute('result', 'outer-color');

      const outerShade = document.createElementNS(svgNamespace, 'feComposite');
      outerShade.setAttribute('in', 'outer-color');
      outerShade.setAttribute('in2', 'outer-blur');
      outerShade.setAttribute('operator', 'in');
      outerShade.setAttribute('result', 'outer-shade');

      const midDilate = document.createElementNS(svgNamespace, 'feMorphology');
      midDilate.setAttribute('in', 'SourceAlpha');
      midDilate.setAttribute('operator', 'dilate');
      midDilate.setAttribute('radius', '7');
      midDilate.setAttribute('result', 'mid-shape');

      const midBlur = document.createElementNS(svgNamespace, 'feGaussianBlur');
      midBlur.setAttribute('in', 'mid-shape');
      midBlur.setAttribute('stdDeviation', '3');
      midBlur.setAttribute('result', 'mid-blur');

      const midColor = document.createElementNS(svgNamespace, 'feFlood');
      midColor.setAttribute('flood-color', '#3b2314');
      midColor.setAttribute('flood-opacity', '0.16');
      midColor.setAttribute('result', 'mid-color');

      const midShade = document.createElementNS(svgNamespace, 'feComposite');
      midShade.setAttribute('in', 'mid-color');
      midShade.setAttribute('in2', 'mid-blur');
      midShade.setAttribute('operator', 'in');
      midShade.setAttribute('result', 'mid-shade');

      const merge = document.createElementNS(svgNamespace, 'feMerge');
      for (const result of ['outer-shade', 'mid-shade', 'SourceGraphic']) {
        const node = document.createElementNS(svgNamespace, 'feMergeNode');
        node.setAttribute('in', result);
        merge.append(node);
      }

      filter.append(
        outerDilate,
        outerBlur,
        outerColor,
        outerShade,
        midDilate,
        midBlur,
        midColor,
        midShade,
        merge
      );
      defs.append(filter);
      coastlineSvg.prepend(defs);
    }
    const countryCoastline = getCountryCoastline(worldCountries);
    const countryColors = colorCountries(worldCountries);

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
      zoomIn.innerHTML = matitaSvg(ZoomIn, '#2c1c0e');
      zoomIn.title = 'Zoom in';
      zoomIn.setAttribute('aria-label', 'Zoom in');
      zoomIn.addEventListener('click', () => map.zoomIn());

      zoomLevel = L.DomUtil.create('output', 'map-zoom-control__level');
      zoomLevel.setAttribute('aria-label', 'Current zoom level');
      zoomLevel.setAttribute('aria-live', 'polite');

      const zoomOut = L.DomUtil.create('button', 'map-zoom-control__button');
      zoomOut.type = 'button';
      zoomOut.innerHTML = matitaSvg(ZoomOut, '#2c1c0e');
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
        renderer: countryRenderer,
        stroke: false,
        fillColor: '#e4c27e',
        fillOpacity: 1,
      },
      interactive: false,
    }).addTo(map);
    L.geoJSON(worldCountries, {
      style: () => {
        return {
          renderer: countryRenderer,
          stroke: false,
          fillColor: 'url(#country-parchment-grain)',
          fillOpacity: 1,
        };
      },
    }).addTo(map);
    const coloredCountries = L.geoJSON(worldCountries, {
      style: (feature) => {
        const colorIndex = feature ? (countryColors.get(feature) ?? 0) : 0;
        const color = nationPalette[colorIndex] ?? nationPalette[0];

        return {
          renderer: countryRenderer,
          color,
          fillColor: color,
          fillOpacity: 0.68,
          weight: 0,
        };
      },
      interactive: false,
    });
    const lakeStyle: StyleFunction<WaterProperties> = (feature) => {
      const visible = map.getZoom() >= (feature?.properties.min_zoom ?? 0);

      return {
        renderer: waterRenderer,
        color: '#5a3d22',
        fillColor: oceanColor,
        fillOpacity: visible ? 0.84 : 0,
        opacity: visible ? 1 : 0,
        weight: 0.45,
      };
    };
    const riverStyle: StyleFunction<WaterProperties> = (feature) => {
      return {
        renderer: waterRenderer,
        ...getRiverStyle(map.getZoom(), feature?.properties.min_zoom ?? 0),
      };
    };
    const lakes = L.geoJSON(worldLakes, { style: lakeStyle }).addTo(map);
    const rivers = L.geoJSON(worldRivers, { style: riverStyle }).addTo(map);
    const landmarkMarkers = L.layerGroup().addTo(map);
    const names = L.layerGroup().addTo(map);
    const namesPane = map.createPane('map-names');
    namesPane.style.zIndex = '645';
    namesPane.style.pointerEvents = 'none';
    const countryLabels = worldCountries.features
      .map(prepareCountryLabel)
      .filter((label) => label !== undefined)
      .sort((a, b) => b.label.area - a.label.area);

    const updateNames = () => {
      names.clearLayers();
      if (!map.hasLayer(names)) return;
      const size = map.getSize();
      const viewBounds = map.getBounds();
      const bounds = {
        west: viewBounds.getWest(),
        east: viewBounds.getEast(),
        south: viewBounds.getSouth(),
        north: viewBounds.getNorth(),
      };
      const occupied: { left: number; right: number; top: number; bottom: number }[] = [];
      const lastRiverPositions = new Map<string, L.Point[]>();
      const addLabel = (label: MapLabel, kind: 'country' | 'river') => {
        const point = map.latLngToContainerPoint([label.lat, label.lng]);
        const width = Math.min(240, Math.max(30, label.name.length * (kind === 'country' ? 7 : 6)));
        const box = { left: point.x - width / 2, right: point.x + width / 2, top: point.y - 9, bottom: point.y + 9 };
        if (box.right < 0 || box.left > size.x || box.bottom < 0 || box.top > size.y) return;
        if (occupied.some((other) => box.left < other.right && box.right > other.left &&
          box.top < other.bottom && box.bottom > other.top)) return;
        if (kind === 'river') {
          const previous = lastRiverPositions.get(label.name) ?? [];
          if (previous.some((position) => point.distanceTo(position) < 180)) return;
          previous.push(point);
          lastRiverPositions.set(label.name, previous);
        }
        occupied.push(box);
        const text = document.createElement('span');
        text.textContent = label.name;
        L.marker([label.lat, label.lng], {
          pane: 'map-names',
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: `map-name map-name--${kind}`, html: text, iconSize: [0, 0] }),
        }).addTo(names);
      };
      for (const country of countryLabels) {
        const label = countryLabelInBounds(country, bounds);
        if (label) addLabel(label, 'country');
      }
      if (showDetailNames(map.getZoom()) && map.hasLayer(rivers)) {
        for (const label of riverLabels) addLabel(label, 'river');
      }
    };

    const landmarkIcons = {
      mountain: L.divIcon({
        className: 'landmark-marker landmark-marker--mountain',
        html: `<span class="landmark-marker__image" style="--landmark-image:url('${landmarkAssets.mountain.url}');--landmark-color:${landmarkAssets.mountain.color}"></span>`,
        iconSize: [landmarkAssets.mountain.size, landmarkAssets.mountain.size],
        iconAnchor: [landmarkAssets.mountain.size / 2, landmarkAssets.mountain.size / 2],
      }),
      forest: L.divIcon({
        className: 'landmark-marker landmark-marker--forest',
        html: `<span class="landmark-marker__image" style="--landmark-image:url('${landmarkAssets.forest.url}');--landmark-color:${landmarkAssets.forest.color}"></span>`,
        iconSize: [landmarkAssets.forest.size, landmarkAssets.forest.size],
        iconAnchor: [landmarkAssets.forest.size / 2, landmarkAssets.forest.size / 2],
      }),
    };

    const updateLandmarks = () => {
      landmarkMarkers.clearLayers();
      const visible = visibleLandmarks(
        landmarks,
        (landmark) => map.latLngToContainerPoint([landmark.lat, landmark.lng]),
        map.getSize(),
        map.getZoom(),
        map.getMinZoom()
      );
      for (const landmark of visible) {
        L.marker([landmark.lat, landmark.lng], {
          icon: landmarkIcons[landmark.kind],
          title: landmark.name,
          riseOnHover: true,
          zIndexOffset: 1000,
        })
          .bindTooltip(landmark.name, {
            direction: 'top',
            offset: [0, -20],
            permanent: map.hasLayer(names) && showDetailNames(map.getZoom()),
            className: map.hasLayer(names) && showDetailNames(map.getZoom()) ? 'map-name-tooltip' : '',
          })
          .addTo(landmarkMarkers);
      }
    };
    updateLandmarks();
    map.on('moveend', updateLandmarks);
    updateNames();
    map.on('moveend', updateNames);
    const onNameOverlayChange = (event: L.LayersControlEvent) => {
      if (event.layer === names || event.layer === rivers) updateNames();
      if (event.layer === names) updateLandmarks();
    };
    map.on('overlayadd', onNameOverlayChange);
    map.on('overlayremove', onNameOverlayChange);

    L.geoJSON(countryCoastline, {
      style: {
        renderer: coastlineShadowRenderer,
        fill: false,
        color: '#2c1c0e',
        opacity: 0.9,
        weight: 3.2,
      },
      interactive: false,
    }).addTo(map);
    L.geoJSON(countryCoastline, {
      style: {
        renderer: coastlineRenderer,
        fill: false,
        color: '#2c1c0e',
        opacity: 0.9,
        weight: 3.2,
      },
      interactive: false,
    }).addTo(map);
    L.geoJSON(worldCountries, {
      style: {
        renderer: borderRenderer,
        fill: false,
        color: '#2c1c0e',
        opacity: 0.82,
        weight: 2.4,
        dashArray: '8 6',
      },
      interactive: false,
    }).addTo(map);
    const challenge = addLocationChallenge(map, {
      coloredCountries,
      rivers,
      landmarkMarkers,
    }, countryColors, countryCoastline, landmarkAssets);
    const layerControl = L.control
      .layers(undefined, {
        'Country colors': coloredCountries,
        Rivers: rivers,
        Landmarks: landmarkMarkers,
        Names: names,
      })
      .addTo(map);
    const filterContainer = layerControl.getContainer();
    if (filterContainer) {
      const filterToggle = filterContainer.querySelector<HTMLAnchorElement>('.leaflet-control-layers-toggle');
      if (filterToggle) {
        filterToggle.setAttribute('aria-label', 'Map filters');
        filterToggle.title = 'Map filters';
        filterToggle.innerHTML = matitaSvg(Filter, '#2c1c0e');
      }
      const filterIcons = new Map([
        ['Country colors', matitaSvg(Palette, '#2c1c0e')],
        ['Rivers', matitaSvg(Waves, '#2c1c0e')],
        ['Landmarks', `${matitaSvg(Mountain, '#2c1c0e', 18)}${matitaSvg(Tree, '#2c1c0e', 18)}`],
        ['Names', matitaSvg(Text, '#2c1c0e')],
      ]);
      for (const label of filterContainer.querySelectorAll('label')) {
        const labelText = label.textContent?.trim();
        const icon = labelText ? filterIcons.get(labelText) : undefined;
        if (icon) {
          const iconContainer = document.createElement('span');
          iconContainer.className = 'layer-filter-icon';
          iconContainer.setAttribute('aria-hidden', 'true');
          iconContainer.innerHTML = icon;
          label.insertBefore(iconContainer, label.firstChild);
        }
      }
      const credits = L.DomUtil.create('div', 'map-credits', filterContainer);
      credits.innerHTML = 'Data: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> (public domain); modified representative points from <a href="https://ecoregions.appspot.com/" target="_blank" rel="noopener noreferrer">RESOLVE Ecoregions 2017, Dinerstein et al.</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>).';
    }

    const updateFeatureStyles = () => {
      lakes.setStyle(lakeStyle);
      rivers.setStyle(riverStyle);
    };
    map.on('zoomend', updateFeatureStyles);
    return () => {
      map.off('zoomend', updateZoomLevel);
      map.off('zoomend', updateFeatureStyles);
      map.off('moveend', updateLandmarks);
      map.off('moveend', updateNames);
      map.off('overlayadd', onNameOverlayChange);
      map.off('overlayremove', onNameOverlayChange);
      challenge.remove();
      layerControl.remove();
      map.remove();
    };
  }, []);

  return (
    <PlopProvider surface="kraft" theme="light" paint={false} haptics={false} toaster={false}>
      <main className="fixed inset-0 h-screen w-screen">
        <div className="game-brand">
          <WordSticker tone="mustard" size={30} tilt={-2}>Scratch Maps</WordSticker>
          <Tag tone="mint" tilt={1}>Find the X</Tag>
        </div>
        <div
          ref={mapElement}
          className="world-map"
          aria-label="Interactive world map. Click to place a location guess, or use the zoom controls and drag to explore."
        />
      </main>
    </PlopProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
