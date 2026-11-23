import L from 'leaflet';
import { Check, Eye, Flag, Info, Lightbulb, MapPin, Mountain, RefreshCw, Tree, Waves, X } from '@matita/icons';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { createLocationPicker } from './challenge-location';
import { remainingCoverFraction, scoreGuess, scratchMultiplier } from './challenge-score';
import { matitaSvg } from './icon-svg';
import { createSnippetRenderer, getSnippetBounds, snippetVariantIndex, type LandmarkAssets } from './snippet-renderer';
import { worldCountries } from './world-countries';

type ChallengeLayers = {
  coloredCountries: L.Layer;
  rivers: L.Layer;
  landmarkMarkers: L.Layer;
};

export const addLocationChallenge = (
  map: L.Map,
  layers: ChallengeLayers,
  countryColors: Map<Feature, number>,
  coastline: FeatureCollection<LineString>,
  assets: LandmarkAssets
) => {
  const pickLocation = createLocationPicker(worldCountries);
  const renderSnippets = createSnippetRenderer(countryColors, coastline, assets, map.getMinZoom());
  const enabled = L.layerGroup();
  const control = new L.Control({ position: 'bottomright' });
  let target: L.LatLng | undefined;
  let guess: L.LatLng | undefined;
  let submitted = false;
  let destroyed = false;
  let generation = 0;
  let renderController: AbortController | undefined;
  let images: string[] = [];
  const answerLayers = L.layerGroup().addTo(map);

  const container = L.DomUtil.create('section', 'location-challenge');
  container.setAttribute('aria-label', 'Location challenge');
  const riverIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 2c-5 5 5 6 0 11s5 5 1 9M15 2c-5 5 5 6 0 11s5 5 1 9"/></svg>';
  container.innerHTML = `
    <div class="challenge-preview">
      <button class="challenge-preview-button" type="button" aria-label="Map snippet. Drag to scratch the cover, or click to enlarge.">
        <span class="challenge-preview-frame"><img class="challenge-preview-image" alt="" /><span class="challenge-preview-target" aria-hidden="true">${matitaSvg(X, '#d21f2b', 28)}</span><canvas class="challenge-scratch-cover" width="560" height="392" aria-hidden="true"></canvas><span class="challenge-brush-cursor" aria-hidden="true" hidden></span></span>
      </button>
    </div>
    <dialog class="challenge-dialog" aria-label="Map snippet">
      <h2 class="challenge-progress-title">Scratch to reveal!</h2>
      <div class="challenge-progress" role="progressbar" aria-label="Scratch cover remaining" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-valuetext="100% cover remaining; 2.00x multiplier">
        <span class="challenge-progress-fill"></span><span class="challenge-multiplier">2.00x</span>
      </div>
      <div class="challenge-dialog-clues" hidden>
        <span class="challenge-hint-badge" aria-hidden="true">${matitaSvg(Lightbulb, '#2c1c0e')}</span>
        <span class="challenge-clue challenge-ocean-clue" role="img"><span aria-hidden="true">${matitaSvg(Waves, '#2c1c0e')}</span><span class="challenge-ocean"></span></span>
        <span class="challenge-clue challenge-countries-clue" role="img"><span aria-hidden="true">${matitaSvg(Flag, '#2c1c0e')}</span><span class="challenge-countries"></span></span>
        <span class="challenge-clue challenge-mountains-clue" role="img"><span aria-hidden="true">${matitaSvg(Mountain, '#2c1c0e')}</span><span class="challenge-mountains"></span></span>
        <span class="challenge-clue challenge-forests-clue" role="img"><span aria-hidden="true">${matitaSvg(Tree, '#2c1c0e')}</span><span class="challenge-forests"></span></span>
        <span class="challenge-clue challenge-rivers-clue" role="img"><span aria-hidden="true">${riverIcon}</span><span class="challenge-rivers"></span></span>
        <details class="challenge-hint-info">
          <summary aria-label="Explain hints">${matitaSvg(Info, '#2c1c0e')}</summary>
          <div class="challenge-hint-explanation">
            <p>Waves: approximate ocean percentage (lakes count as land).</p>
            <p>Flag: countries touching the snippet.</p>
            <p>Mountain and tree: mapped landmark centers inside the snippet.</p>
            <p>River: mapped river features crossing the snippet; these may be sections rather than distinct rivers.</p>
            <p>Hints count map features even when their layers are hidden.</p>
          </div>
        </details>
      </div>
      <div class="challenge-scratch-controls">
        <div class="challenge-large-frame"></div>
        <fieldset class="challenge-eraser" aria-label="Eraser size">
          <label><input type="radio" name="eraser-size" value="18" aria-label="Small" /><span class="challenge-eraser-circle challenge-eraser-small"></span></label>
          <label><input type="radio" name="eraser-size" value="36" aria-label="Medium" checked /><span class="challenge-eraser-circle challenge-eraser-medium"></span></label>
          <label><input type="radio" name="eraser-size" value="64" aria-label="Large" /><span class="challenge-eraser-circle challenge-eraser-large"></span></label>
          <label><input type="radio" name="eraser-size" value="96" aria-label="Extra large" /><span class="challenge-eraser-circle challenge-eraser-extra-large"></span></label>
        </fieldset>
      </div>
      <div class="challenge-actions">
        <button class="challenge-reveal-dialog" type="button" aria-label="Reveal map">${matitaSvg(Eye, '#2c1c0e')}<span>Reveal map</span></button>
        <button class="challenge-new" type="button" aria-label="New snippet"></button>
        <button class="challenge-close" type="button" aria-label="Close"></button>
      </div>
    </dialog>
  `;
  const getElement = <T extends Element>(selector: string, type: { new(): T }): T => {
    const element = container.querySelector(selector);
    if (!(element instanceof type)) throw new Error(`Missing challenge element: ${selector}`);
    return element;
  };
  const previewButton = getElement('.challenge-preview-button', HTMLButtonElement);
  const previewFrame = getElement('.challenge-preview-frame', HTMLSpanElement);
  const progress = getElement('.challenge-progress', HTMLDivElement);
  const progressFill = getElement('.challenge-progress-fill', HTMLSpanElement);
  const multiplierLabel = getElement('.challenge-multiplier', HTMLSpanElement);
  const previewImage = getElement('.challenge-preview-image', HTMLImageElement);
  const dialogClues = getElement('.challenge-dialog-clues', HTMLDivElement);
  const oceanClueLabel = getElement('.challenge-ocean-clue', HTMLSpanElement);
  const countriesClueLabel = getElement('.challenge-countries-clue', HTMLSpanElement);
  const oceanClue = getElement('.challenge-ocean', HTMLSpanElement);
  const countriesClue = getElement('.challenge-countries', HTMLSpanElement);
  const mountainsClueLabel = getElement('.challenge-mountains-clue', HTMLSpanElement);
  const forestsClueLabel = getElement('.challenge-forests-clue', HTMLSpanElement);
  const riversClueLabel = getElement('.challenge-rivers-clue', HTMLSpanElement);
  const mountainsClue = getElement('.challenge-mountains', HTMLSpanElement);
  const forestsClue = getElement('.challenge-forests', HTMLSpanElement);
  const riversClue = getElement('.challenge-rivers', HTMLSpanElement);
  const scratchCover = getElement('.challenge-scratch-cover', HTMLCanvasElement);
  const brushCursor = getElement('.challenge-brush-cursor', HTMLSpanElement);
  const eraserControl = getElement('.challenge-eraser', HTMLFieldSetElement);
  const scratchContext = scratchCover.getContext('2d', { willReadFrequently: true });
  if (!scratchContext) throw new Error('Canvas rendering is unavailable for the scratch cover.');
  const dialog = getElement('.challenge-dialog', HTMLDialogElement);
  const largeFrame = getElement('.challenge-large-frame', HTMLDivElement);
  const newButton = getElement('.challenge-new', HTMLButtonElement);
  const closeButton = getElement('.challenge-close', HTMLButtonElement);
  const dialogRevealButton = getElement('.challenge-reveal-dialog', HTMLButtonElement);
  const submitContainer = L.DomUtil.create('div', 'challenge-submit-control', map.getContainer());
  submitContainer.innerHTML = `
    <output class="challenge-result" role="status" aria-live="polite" hidden></output>
    <button class="challenge-submit-button" type="button" hidden>
      ${matitaSvg(Check, '#a52c2c')}
      Submit guess
    </button>
  `;
  const submitButton = submitContainer.querySelector<HTMLButtonElement>('.challenge-submit-button');
  const result = submitContainer.querySelector<HTMLOutputElement>('.challenge-result');
  if (!submitButton || !result) throw new Error('Missing location challenge controls.');
  L.DomEvent.disableClickPropagation(container);
  L.DomEvent.disableScrollPropagation(container);
  L.DomEvent.disableClickPropagation(submitContainer);

  control.onAdd = () => container;
  control.addTo(map);
  let remaining = 1;
  let initialCoverFraction = 1;
  let progressFrame: number | undefined;
  const setRemaining = (fraction: number) => {
    remaining = fraction;
    const percent = fraction * 100;
    const multiplier = scratchMultiplier(fraction).toFixed(2);
    progressFill.style.width = `${percent}%`;
    multiplierLabel.textContent = `${multiplier}x`;
    progress.setAttribute('aria-valuenow', percent.toFixed(1));
    progress.setAttribute('aria-valuetext', `${percent.toFixed(1)}% cover remaining; ${multiplier}x multiplier`);
  };
  const updateProgress = () => {
    if (progressFrame !== undefined) cancelAnimationFrame(progressFrame);
    progressFrame = undefined;
    if (scratchCover.hidden) {
      setRemaining(0);
    } else {
      const pixels = scratchContext.getImageData(0, 0, scratchCover.width, scratchCover.height).data;
      setRemaining(remainingCoverFraction(pixels, initialCoverFraction));
    }
  };
  const resetCover = () => {
    if (progressFrame !== undefined) cancelAnimationFrame(progressFrame);
    progressFrame = undefined;
    scratchCover.hidden = false;
    scratchContext.globalCompositeOperation = 'source-over';
    scratchContext.fillStyle = '#f59a90';
    scratchContext.fillRect(0, 0, scratchCover.width, scratchCover.height);
    scratchContext.fillStyle = '#e45d53';
    const stripeWidth = 30;
    for (let x = 0; x < scratchCover.width + scratchCover.height; x += stripeWidth * 2) {
      scratchContext.beginPath();
      scratchContext.moveTo(x, 0);
      scratchContext.lineTo(x + stripeWidth, 0);
      scratchContext.lineTo(x + stripeWidth - scratchCover.height, scratchCover.height);
      scratchContext.lineTo(x - scratchCover.height, scratchCover.height);
      scratchContext.closePath();
      scratchContext.fill();
    }
    scratchContext.globalCompositeOperation = 'destination-out';
    scratchContext.beginPath();
    scratchContext.arc(scratchCover.width / 2, scratchCover.height / 2, 48, 0, Math.PI * 2);
    scratchContext.fill();
    initialCoverFraction = remainingCoverFraction(
      scratchContext.getImageData(0, 0, scratchCover.width, scratchCover.height).data
    );
    dialogRevealButton.hidden = false;
    eraserControl.hidden = false;
    brushCursor.hidden = true;
    setRemaining(1);
  };
  const revealMap = () => {
    scratchCover.hidden = true;
    brushCursor.hidden = true;
    eraserControl.hidden = true;
    dialogRevealButton.hidden = true;
    updateProgress();
  };
  dialogRevealButton.addEventListener('click', revealMap);

  let scratchStart: { x: number; y: number; pointerId: number } | undefined;
  let scratched = false;
  let eraserSize = 36;
  eraserControl.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.name === 'eraser-size') {
      eraserSize = Number(event.target.value);
    }
  });
  const updateBrushCursor = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !target || scratchCover.hidden) return;
    const bounds = scratchCover.getBoundingClientRect();
    const diameter = eraserSize * bounds.width / scratchCover.width;
    brushCursor.style.width = `${diameter}px`;
    brushCursor.style.height = `${diameter}px`;
    brushCursor.style.left = `${event.clientX - bounds.left}px`;
    brushCursor.style.top = `${event.clientY - bounds.top}px`;
    brushCursor.hidden = false;
  };
  scratchCover.addEventListener('pointerenter', updateBrushCursor);
  scratchCover.addEventListener('pointerleave', () => { brushCursor.hidden = true; });
  const scratchPoint = (event: PointerEvent) => {
    const bounds = scratchCover.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * scratchCover.width / bounds.width,
      y: (event.clientY - bounds.top) * scratchCover.height / bounds.height,
    };
  };
  scratchCover.addEventListener('pointerdown', (event) => {
    if (!target || event.button !== 0) return;
    const point = scratchPoint(event);
    scratchStart = { ...point, pointerId: event.pointerId };
    scratched = false;
    scratchCover.setPointerCapture(event.pointerId);
  });
  scratchCover.addEventListener('pointermove', (event) => {
    updateBrushCursor(event);
    if (!scratchStart || scratchStart.pointerId !== event.pointerId) return;
    const point = scratchPoint(event);
    if (!scratched && Math.hypot(point.x - scratchStart.x, point.y - scratchStart.y) < 4) return;
    scratched = true;
    scratchContext.globalCompositeOperation = 'destination-out';
    scratchContext.lineWidth = eraserSize;
    scratchContext.lineCap = 'round';
    scratchContext.lineJoin = 'round';
    scratchContext.beginPath();
    scratchContext.moveTo(scratchStart.x, scratchStart.y);
    scratchContext.lineTo(point.x, point.y);
    scratchContext.stroke();
    if (progressFrame === undefined) {
      progressFrame = requestAnimationFrame(updateProgress);
    }
    scratchStart = { ...point, pointerId: event.pointerId };
  });
  scratchCover.addEventListener('pointerup', (event) => {
    if (scratchStart?.pointerId === event.pointerId) {
      if (scratched) updateProgress();
      scratchStart = undefined;
    }
  });
  scratchCover.addEventListener('pointercancel', () => {
    if (scratchStart && scratched) updateProgress();
    scratchStart = undefined;
    scratched = false;
    brushCursor.hidden = true;
  });
  scratchCover.addEventListener('click', (event) => {
    if (scratched) {
      event.preventDefault();
      event.stopPropagation();
      scratched = false;
    }
  });
  const updatePreview = () => {
    const index = snippetVariantIndex(
      map.hasLayer(layers.coloredCountries),
      map.hasLayer(layers.rivers),
      map.hasLayer(layers.landmarkMarkers)
    );
    const image = images[index];
    if (image) previewImage.src = image;
  };

  const startRound = async () => {
    const round = ++generation;
    renderController?.abort();
    const controller = new AbortController();
    renderController = controller;
    target = undefined;
    guess = undefined;
    submitted = false;
    images = [];
    answerLayers.clearLayers();
    scratchStart = undefined;
    scratched = false;
    resetCover();
    previewImage.removeAttribute('src');
    dialogClues.hidden = true;
    submitButton.hidden = true;
    result.hidden = false;
    result.textContent = 'Generating map snippet...';
    previewButton.disabled = true;
    newButton.disabled = true;
    try {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const nextTarget = L.latLng(pickLocation());
        const snippet = await renderSnippets(nextTarget, controller.signal);
        if (destroyed || round !== generation) return;
        if (!snippet) continue;
        target = nextTarget;
        images = snippet.images;
        oceanClue.textContent = `${Math.round(snippet.clues.oceanPercent)}%`;
        countriesClue.textContent = String(snippet.clues.countries);
        mountainsClue.textContent = String(snippet.clues.mountains);
        forestsClue.textContent = String(snippet.clues.forests);
        riversClue.textContent = String(snippet.clues.rivers);
        oceanClueLabel.setAttribute('aria-label', `Ocean: ${oceanClue.textContent}`);
        countriesClueLabel.setAttribute('aria-label', `Countries: ${countriesClue.textContent}`);
        mountainsClueLabel.setAttribute('aria-label', `Mountains: ${mountainsClue.textContent}`);
        forestsClueLabel.setAttribute('aria-label', `Forests: ${forestsClue.textContent}`);
        riversClueLabel.setAttribute('aria-label', `River features: ${riversClue.textContent}`);
        dialogClues.hidden = false;
        result.hidden = true;
        updatePreview();
        return;
      }
      throw new Error('Unable to find a snippet outside Antarctica with visible land.');
    } catch (error) {
      if (destroyed || round !== generation) return;
      target = undefined;
      result.hidden = false;
      result.textContent = 'Could not create a snippet. Try again.';
      console.error('Unable to create location challenge:', error);
    } finally {
      if (!destroyed && round === generation) {
        previewButton.disabled = false;
        newButton.disabled = false;
      }
    }
  };

  const placeGuess = (location: L.LatLng) => {
    if (!map.hasLayer(enabled) || !target || submitted) return;
    guess = location;
    answerLayers.clearLayers();
    const guessPane = map.getPane('challenge-guess') ?? map.createPane('challenge-guess');
    guessPane.style.zIndex = '1000';
    L.rectangle(getSnippetBounds(location), {
      pane: 'challenge-guess',
      color: '#d21f2b',
      weight: 2,
      dashArray: '2 4',
      fillColor: '#d21f2b',
      fillOpacity: 0.2,
      interactive: false,
    }).addTo(answerLayers);
    const guessIcon = L.divIcon({
      className: 'challenge-guess-marker',
      html: matitaSvg(X, '#d21f2b', 28),
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker(location, { icon: guessIcon, pane: 'challenge-guess', interactive: false })
      .addTo(answerLayers);
    submitButton.hidden = false;
    result.hidden = true;
  };
  const onMapClick = (event: L.LeafletMouseEvent) => placeGuess(event.latlng);
  const onOverlayChange = () => {
    if (target) updatePreview();
  };
  map.on('click', onMapClick);
  map.on('overlayadd overlayremove', onOverlayChange);

  submitButton.addEventListener('click', () => {
    if (!target || !guess || submitted) return;
    submitted = true;
    submitButton.hidden = true;
    const distance = target.distanceTo(guess) / 1000;
    updateProgress();
    const score = scoreGuess(distance, remaining);
    const answerIcon = L.divIcon({
      className: 'challenge-answer-marker',
      html: matitaSvg(MapPin, '#a52c2c', 32),
      iconSize: [32, 32],
      iconAnchor: [16, 30],
    });
    L.marker(target, { icon: answerIcon, pane: 'challenge-guess', zIndexOffset: 100001 })
      .bindTooltip('Actual location', { permanent: true, direction: 'top' }).addTo(answerLayers);
    result.hidden = false;
    result.textContent = `${Math.round(distance).toLocaleString()} km away · Base: ${score.base.toLocaleString()} × ${score.multiplier.toFixed(2)}x · Final score: ${score.final.toLocaleString()}. Open the map for a new round.`;
    map.fitBounds(L.latLngBounds([guess, target]).pad(0.25), { maxZoom: 7 });
  });
  previewButton.addEventListener('click', () => {
    largeFrame.append(previewFrame);
    dialog.showModal();
  });
  closeButton.innerHTML = `${matitaSvg(X, '#2c1c0e')}<span>Close</span>`;
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (destroyed) return;
    brushCursor.hidden = true;
    previewButton.prepend(previewFrame);
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  newButton.innerHTML = `${matitaSvg(RefreshCw, '#2c1c0e')}<span>New snippet</span>`;
  newButton.addEventListener('click', () => { void startRound(); });
  enabled.on('add', () => {
    container.hidden = false;
    if (!target) void startRound();
  });
  enabled.on('remove', () => {
    container.hidden = true;
    if (dialog.open) dialog.close();
    map.removeLayer(answerLayers);
  });
  enabled.on('add', () => {
    if (!map.hasLayer(answerLayers)) answerLayers.addTo(map);
  });
  enabled.addTo(map);

  return {
    layer: enabled,
    remove: () => {
      destroyed = true;
      if (progressFrame !== undefined) cancelAnimationFrame(progressFrame);
      renderController?.abort();
      map.off('click', onMapClick);
      map.off('overlayadd overlayremove', onOverlayChange);
      if (dialog.open) dialog.close();
      control.remove();
      submitContainer.remove();
    },
  };
};
