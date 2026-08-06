// createMotoModel.js — Modelo procedural da moto trail (pipeline img2threejs, spec strict-quality PASS)
// Reconstrucao estilizada aproximada de moto-hero-3d.png. Transpilado de TS (esbuild), vendor local.
import * as THREE from './three.module.min.js';
function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function readLayerNumber(value, keys, fallback) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    const record = value;
    for (const key of keys) {
      if (typeof record[key] === "number") return record[key];
    }
  }
  return fallback;
}
function hexToRgb(hex) {
  const normalized = /^#[0-9a-f]{3}$/i.test(hex) ? "#" + hex.slice(1).split("").map((part) => part + part).join("") : hex;
  const value = /^#[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized.slice(1), 16) : 9075295;
  return [clampAlbedoChannel(value >> 16 & 255), clampAlbedoChannel(value >> 8 & 255), clampAlbedoChannel(value & 255)];
}
function materialPalette(spec) {
  const palette = spec.colorVariation?.palette;
  if (Array.isArray(palette) && palette.length > 0) return palette.filter((value) => typeof value === "string");
  const secondary = spec.albedo?.secondary;
  const colors = [spec.baseColor ?? spec.color ?? spec.albedo?.dominant, ...Array.isArray(secondary) ? secondary : []];
  return colors.filter((value) => typeof value === "string" && value.startsWith("#"));
}
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
function clampAlbedoChannel(value) {
  return Math.max(30, Math.min(240, Math.round(value)));
}
function clampPbrF0(value) {
  return Math.max(0.02, Math.min(1, value));
}
function clampPbrIor(value) {
  return Math.max(1, Math.min(2.5, value));
}
function clampPbrMetalness(value) {
  return value >= 0.5 ? 1 : 0;
}
function clampedAlbedoColor(spec) {
  const source = typeof spec.baseColor === "string" ? spec.baseColor : "#8A7A5F";
  const [red, green, blue] = hexToRgb(source);
  return new THREE.Color(red / 255, green / 255, blue / 255);
}
function smoothCurve(value) {
  return value * value * (3 - 2 * value);
}
function periodicHash(x, y, seed, periodX, periodY) {
  const wrappedX = (x % periodX + periodX) % periodX;
  const wrappedY = (y % periodY + periodY) % periodY;
  let value = Math.imul(wrappedX + seed * 17, 374761393) ^ Math.imul(wrappedY + seed * 31, 668265263);
  value = Math.imul(value ^ value >>> 13, 1274126177);
  return ((value ^ value >>> 16) >>> 0) / 4294967295;
}
function periodicValueNoise(u, v, seed, periodX, periodY) {
  const x = u * periodX;
  const y = v * periodY;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothCurve(x - x0);
  const ty = smoothCurve(y - y0);
  const a = periodicHash(x0, y0, seed, periodX, periodY);
  const b = periodicHash(x0 + 1, y0, seed, periodX, periodY);
  const c = periodicHash(x0, y0 + 1, seed, periodX, periodY);
  const d = periodicHash(x0 + 1, y0 + 1, seed, periodX, periodY);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}
function surfaceBands(spec) {
  const source = Array.isArray(spec.surfaceFrequencyBands) ? spec.surfaceFrequencyBands : [];
  const parsed = source.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const band = item;
    const frequency = typeof band.frequency === "number" ? band.frequency : 0;
    const amplitude = typeof band.amplitude === "number" ? band.amplitude : 0;
    if (frequency <= 0 || amplitude <= 0) return [];
    const stretch = Array.isArray(band.stretch) ? band.stretch : [1, 1];
    const description = `${String(band.pattern ?? "")} ${String(band.role ?? "")}`.toLowerCase();
    return [{
      frequency,
      amplitude,
      stretchX: typeof stretch[0] === "number" ? Math.max(0.1, stretch[0]) : 1,
      stretchY: typeof stretch[1] === "number" ? Math.max(0.1, stretch[1]) : 1,
      ridge: /(ridge|groove|grain|fiber|striated|crack)/.test(description)
    }];
  });
  return parsed.length > 0 ? parsed : [
    { frequency: 2, amplitude: 0.42, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 12, amplitude: 0.22, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 56, amplitude: 0.08, stretchX: 1, stretchY: 1, ridge: false }
  ];
}
function sampleSurface(u, v, bands, seed) {
  let value = 0;
  let weight = 0;
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    const periodX = Math.max(1, Math.round(band.frequency * band.stretchX));
    const periodY = Math.max(1, Math.round(band.frequency * band.stretchY));
    let sample = periodicValueNoise(u, v, seed + index * 1013, periodX, periodY);
    if (band.ridge) sample = 1 - Math.abs(sample * 2 - 1);
    value += sample * band.amplitude;
    weight += band.amplitude;
  }
  return weight > 0 ? clamp01(value / weight) : 0.5;
}
function mixPalette(colors, value) {
  if (colors.length === 1) return colors[0];
  const scaled = clamp01(value) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const a = colors[index];
  const b = colors[index + 1];
  return [
    Math.round(THREE.MathUtils.lerp(a[0], b[0], mix)),
    Math.round(THREE.MathUtils.lerp(a[1], b[1], mix)),
    Math.round(THREE.MathUtils.lerp(a[2], b[2], mix))
  ];
}
function parseRgba(value) {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!match) return [138, 122, 95];
  return [clampAlbedoChannel(Number(match[1])), clampAlbedoChannel(Number(match[2])), clampAlbedoChannel(Number(match[3]))];
}
function sampleColorGradient(gradient, u, v) {
  const stops = gradient.stops.length >= 2 ? gradient.stops : [{ offset: 0, color: "rgba(138,122,95,1)" }, { offset: 1, color: "rgba(138,122,95,1)" }];
  let t;
  if (gradient.type === "radial") {
    const [cx, cy] = gradient.axis;
    const dx = u - cx;
    const dy = v - cy;
    const maxRadius = Math.max(1e-3, Math.hypot(Math.max(cx, 1 - cx), Math.max(cy, 1 - cy)));
    t = clamp01(Math.hypot(dx, dy) / maxRadius);
  } else {
    const [ax, ay] = gradient.axis;
    const projection = (u - 0.5) * ax + (v - 0.5) * ay;
    const maxProjection = 0.5 * (Math.abs(ax) + Math.abs(ay)) || 0.5;
    t = clamp01(projection / maxProjection + 0.5);
  }
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.max(0, Math.floor(scaled)));
  const mix = scaled - index;
  const a = parseRgba(stops[index].color);
  const b = parseRgba(stops[index + 1].color);
  return [
    THREE.MathUtils.lerp(a[0], b[0], mix),
    THREE.MathUtils.lerp(a[1], b[1], mix),
    THREE.MathUtils.lerp(a[2], b[2], mix)
  ];
}
function writePixel(data, offset, red, green, blue) {
  data[offset] = Math.max(0, Math.min(255, Math.round(red)));
  data[offset + 1] = Math.max(0, Math.min(255, Math.round(green)));
  data[offset + 2] = Math.max(0, Math.min(255, Math.round(blue)));
  data[offset + 3] = 255;
}
function makeCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}
function createMapTexture(canvas, colorSpace, spec, options) {
  const texture = new THREE.CanvasTexture(canvas);
  const projection = spec.textureProjection && typeof spec.textureProjection === "object" ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [2, 2];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === "number" ? repeat[0] : 2,
    typeof repeat[1] === "number" ? repeat[1] : 2
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}
function referenceMapUrl(spec, channel) {
  const reference = spec.referencePbr;
  if (!reference || typeof reference !== "object") return null;
  if (reference.usable === false) return null;
  const confidence = typeof reference.confidence === "number" ? reference.confidence : typeof reference.estimatedFidelity === "number" ? reference.estimatedFidelity : 0;
  const threshold = typeof reference.targetThreshold === "number" ? reference.targetThreshold : 0.7;
  if (confidence < threshold) return null;
  const maps = reference.maps;
  if (!maps || typeof maps !== "object") return null;
  const map = maps[channel];
  if (!map || typeof map !== "object") return null;
  const record = map;
  const url = typeof record.url === "string" && record.url.trim() ? record.url : record.path;
  return typeof url === "string" && url.trim() ? url : null;
}
function createLoadedMapTexture(url, colorSpace, spec, options) {
  const texture = new THREE.TextureLoader().load(url);
  const projection = spec.textureProjection && typeof spec.textureProjection === "object" ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [1, 1];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === "number" ? repeat[0] : 1,
    typeof repeat[1] === "number" ? repeat[1] : 1
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}
function makeReferenceTextureSet(spec, options) {
  // Site: mapas PBR de evidencia (28 MB) ficam fora; usar sempre texturas procedurais.
  return null;
  const albedo = referenceMapUrl(spec, "albedo");
  const roughness = referenceMapUrl(spec, "roughness");
  const height = referenceMapUrl(spec, "height");
  const normal = referenceMapUrl(spec, "normal");
  const ao = referenceMapUrl(spec, "ao");
  if (!albedo || !roughness || !height || !normal || !ao) return null;
  return {
    albedo: createLoadedMapTexture(albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createLoadedMapTexture(roughness, THREE.NoColorSpace, spec, options),
    height: createLoadedMapTexture(height, THREE.NoColorSpace, spec, options),
    normal: createLoadedMapTexture(normal, THREE.NoColorSpace, spec, options),
    ao: createLoadedMapTexture(ao, THREE.NoColorSpace, spec, options),
    source: "reference-pixel-extraction"
  };
}
function makeProceduralTextureSet(id, spec, options) {
  // Site: texturas canvas desativadas — o texturePalette foi contaminado pelo
  // classificador (paletas cinza/castanhas) e pintava a moto toda de castanho.
  // Sem texturas, createSculptMaterial usa a cor lisa correta do spec
  // (clampedAlbedoColor) e o arranque poupa a geracao de 8 conjuntos de mapas.
  return null;
  if (typeof document === "undefined") return null;
  const qualityFirst = (options.qualityPriority ?? "reference-fidelity") === "reference-fidelity";
  const requested = options.textureSize ?? spec.textureResolution;
  const requestedSize = typeof requested === "number" && Number.isFinite(requested) ? requested : qualityFirst ? 1024 : 512;
  const size = Math.max(256, Math.min(2048, 2 ** Math.round(Math.log2(requestedSize))));
  const canvases = {
    albedo: makeCanvas(size),
    roughness: makeCanvas(size),
    height: makeCanvas(size),
    normal: makeCanvas(size),
    ao: makeCanvas(size)
  };
  const contexts = {
    albedo: canvases.albedo.getContext("2d"),
    roughness: canvases.roughness.getContext("2d"),
    height: canvases.height.getContext("2d"),
    normal: canvases.normal.getContext("2d"),
    ao: canvases.ao.getContext("2d")
  };
  if (!contexts.albedo || !contexts.roughness || !contexts.height || !contexts.normal || !contexts.ao) return null;
  const images = {
    albedo: contexts.albedo.createImageData(size, size),
    roughness: contexts.roughness.createImageData(size, size),
    height: contexts.height.createImageData(size, size),
    normal: contexts.normal.createImageData(size, size),
    ao: contexts.ao.createImageData(size, size)
  };
  const seed = hashString(id);
  const bands = surfaceBands(spec);
  const heightField = new Float32Array(size * size);
  const roughnessField = new Float32Array(size * size);
  const palette = materialPalette(spec);
  const fallback = typeof spec.baseColor === "string" ? spec.baseColor : "#8A7A5F";
  const colors = (palette.length >= 2 ? palette : [fallback, "#6E614B", "#A08F70"]).map(hexToRgb);
  const baseRoughness = clamp01(readLayerNumber(spec.roughness, ["base"], 0.76));
  const roughnessVariation = clamp01(readLayerNumber(spec.roughness, ["variation"], 0.18));
  const colorAmplitude = clamp01(readLayerNumber(spec.colorVariation, ["amplitude", "variation"], 0.18));
  const heightCorrelation = clamp01(readLayerNumber(spec.colorVariation, ["heightCorrelation"], 0.3));
  const colorGradient = spec.colorGradient;
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const index = y * size + x;
      const height = sampleSurface(u, v, bands, seed + 101);
      const roughNoise = sampleSurface(u, v, bands, seed + 7001);
      const colorNoise = sampleSurface(u, v, bands, seed + 15013);
      heightField[index] = height;
      roughnessField[index] = clamp01(baseRoughness + (roughNoise - 0.5) * roughnessVariation * 2);
      let color;
      if (colorGradient) {
        color = sampleColorGradient(colorGradient, u, v);
      } else {
        const paletteValue = clamp01(
          0.5 + (colorNoise - 0.5) * colorAmplitude * 2 + (height - 0.5) * heightCorrelation
        );
        color = mixPalette(colors, paletteValue);
      }
      writePixel(images.albedo.data, index * 4, color[0], color[1], color[2]);
    }
  }
  const normalStrength = Math.max(0.05, readLayerNumber(spec.normal, ["strength", "amplitude"], 0.35));
  const aoStrength = clamp01(readLayerNumber(spec.ambientOcclusion, ["cavityStrength", "strength"], 0.35));
  for (let y = 0; y < size; y += 1) {
    const up = (y - 1 + size) % size * size;
    const down = (y + 1) % size * size;
    for (let x = 0; x < size; x += 1) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const index = y * size + x;
      const center = heightField[index];
      const dx = (heightField[y * size + right] - heightField[y * size + left]) * normalStrength * 6;
      const dy = (heightField[down + x] - heightField[up + x]) * normalStrength * 6;
      const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const normalX = -dx * inverseLength;
      const normalY = -dy * inverseLength;
      const normalZ = inverseLength;
      const neighborAverage = (heightField[y * size + left] + heightField[y * size + right] + heightField[up + x] + heightField[down + x]) * 0.25;
      const cavity = Math.max(0, neighborAverage - center);
      const ao = clamp01(1 - aoStrength * (cavity * 12 + (1 - center) * 0.16));
      const offset = index * 4;
      const heightByte = center * 255;
      const roughnessByte = roughnessField[index] * 255;
      writePixel(images.height.data, offset, heightByte, heightByte, heightByte);
      writePixel(images.roughness.data, offset, roughnessByte, roughnessByte, roughnessByte);
      writePixel(
        images.normal.data,
        offset,
        (normalX * 0.5 + 0.5) * 255,
        (normalY * 0.5 + 0.5) * 255,
        (normalZ * 0.5 + 0.5) * 255
      );
      writePixel(images.ao.data, offset, ao * 255, ao * 255, ao * 255);
    }
  }
  contexts.albedo.putImageData(images.albedo, 0, 0);
  contexts.roughness.putImageData(images.roughness, 0, 0);
  contexts.height.putImageData(images.height, 0, 0);
  contexts.normal.putImageData(images.normal, 0, 0);
  contexts.ao.putImageData(images.ao, 0, 0);
  return {
    albedo: createMapTexture(canvases.albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createMapTexture(canvases.roughness, THREE.NoColorSpace, spec, options),
    height: createMapTexture(canvases.height, THREE.NoColorSpace, spec, options),
    normal: createMapTexture(canvases.normal, THREE.NoColorSpace, spec, options),
    ao: createMapTexture(canvases.ao, THREE.NoColorSpace, spec, options),
    source: "procedural"
  };
}
function createSculptMaterial(id, spec, options, denseComponent = false) {
  const textures = makeReferenceTextureSet(spec, options) ?? makeProceduralTextureSet(id, spec, options);
  const material = new THREE.MeshPhysicalMaterial({
    color: textures ? 16777215 : clampedAlbedoColor(spec),
    roughness: textures ? 1 : clamp01(readLayerNumber(spec.roughness, ["base"], 0.76)),
    metalness: clampPbrMetalness(readLayerNumber(spec.metalness, ["base"], 0)),
    clearcoat: clamp01(readLayerNumber(spec.clearcoat, ["base", "amount"], 0)),
    clearcoatRoughness: clamp01(readLayerNumber(spec.clearcoatRoughness, ["base"], 0.25)),
    transmission: clamp01(readLayerNumber(spec.transmission, ["base", "amount"], 0)),
    ior: clampPbrIor(readLayerNumber(spec.ior, ["base", "value"], 1.5)),
    thickness: Math.max(0, readLayerNumber(spec.thickness, ["base", "amount"], 0)),
    attenuationDistance: Math.max(1e-3, readLayerNumber(spec.attenuationDistance, ["base", "value"], Infinity)),
    attenuationColor: new THREE.Color(typeof spec.attenuationColor === "string" ? spec.attenuationColor : "#ffffff"),
    sheen: clamp01(readLayerNumber(spec.sheen, ["base", "amount"], 0)),
    sheenColor: new THREE.Color(typeof spec.sheenColor === "string" ? spec.sheenColor : "#ffffff"),
    sheenRoughness: clamp01(readLayerNumber(spec.sheenRoughness, ["base"], 1)),
    iridescence: clamp01(readLayerNumber(spec.iridescence, ["base", "amount"], 0)),
    iridescenceIOR: clampPbrIor(readLayerNumber(spec.iridescenceIOR, ["base", "value"], 1.3)),
    anisotropy: clamp01(readLayerNumber(spec.anisotropy, ["base", "amount"], 0)),
    anisotropyRotation: readLayerNumber(spec.anisotropy, ["rotation"], 0),
    specularIntensity: clampPbrF0(readLayerNumber(spec.specularF0 ?? spec.f0 ?? spec.specularIntensity, ["base", "value"], 1)),
    specularColor: new THREE.Color(typeof spec.specularColor === "string" ? spec.specularColor : "#ffffff"),
    emissive: new THREE.Color(typeof spec.emissive === "string" ? spec.emissive : "#000000"),
    emissiveIntensity: Math.max(0, readLayerNumber(spec.emissiveIntensity, ["base"], 1)),
    opacity: clamp01(readLayerNumber(spec.opacity, ["base"], 1)),
    transparent: readLayerNumber(spec.transmission, ["base", "amount"], 0) > 0 || readLayerNumber(spec.opacity, ["base"], 1) < 1,
    alphaTest: Math.max(0, readLayerNumber(spec.alpha, ["cutoff", "alphaTest"], 0)),
    wireframe: options.wireframe ?? false,
    side: spec.doubleSided === true ? THREE.DoubleSide : THREE.FrontSide,
    flatShading: spec.flatShading === true
  });
  if (textures) {
    material.map = textures.albedo;
    material.roughnessMap = textures.roughness;
    material.normalMap = textures.normal;
    material.normalScale.setScalar(Math.max(0.05, readLayerNumber(spec.normal, ["strength", "amplitude"], 0.35)));
    material.aoMap = textures.ao;
    material.aoMap.channel = 0;
    material.aoMapIntensity = readLayerNumber(spec.ambientOcclusion, ["cavityStrength", "strength"], 0.35);
    const denseMesh = denseComponent || spec.denseMesh === true || spec.geometryDensity === "dense" || spec.topologyClass === "dense";
    const bumpScale = Math.max(0, readLayerNumber(spec.bump, ["amplitude", "strength"], 0));
    const effectiveBumpScale = denseMesh ? Math.max(0.05, bumpScale) : bumpScale;
    if (effectiveBumpScale > 0) {
      material.bumpMap = textures.height;
      material.bumpScale = effectiveBumpScale;
    }
    const displacementScale = Math.max(0, readLayerNumber(spec.displacement, ["amplitude", "strength"], 0));
    const effectiveDisplacementScale = denseMesh ? Math.max(5e-3, displacementScale) : displacementScale;
    if (effectiveDisplacementScale > 0) {
      material.displacementMap = textures.height;
      material.displacementScale = effectiveDisplacementScale;
      material.displacementBias = -effectiveDisplacementScale * 0.5;
    }
  }
  material.envMapIntensity = readLayerNumber(spec, ["envMapIntensity"], 0.8);
  material.userData.sculptMaterial = spec;
  material.userData.proceduralMapsIndependent = true;
  material.userData.pbrConstraints = { albedoRange: [30, 240], binaryMetalness: true, f0Range: [0.02, 1], iorRange: [1, 2.5] };
  material.userData.pbrTextureSource = textures?.source ?? "flat-fallback";
  material.userData.referencePbr = spec.referencePbr ?? null;
  material.userData.referenceMaterialId = spec.referenceMaterialId ?? spec.materialReference?.profileId ?? null;
  material.userData.materialEvidence = spec.materialEvidence ?? null;
  material.userData.validationViews = spec.materialReference?.validationViews ?? [];
  material.needsUpdate = true;
  return material;
}
function readVector3(value, fallback) {
  if (Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number")) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
}
function readNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function makeAttachmentEndpoint(attachment) {
  if (!attachment || typeof attachment !== "object") return null;
  const record = attachment;
  const start = readVector3(record.localStart, [0, 0, 0]);
  const end = readVector3(record.localEnd, [0, 1, 0]);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (length <= 1e-4) return null;
  const direction = delta.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const baseRadius = Math.max(5e-3, readNumber(record.baseRadius, 0.06));
  const endRadius = Math.max(3e-3, readNumber(record.endRadius, baseRadius * 0.55));
  return {
    start,
    midpoint: delta.multiplyScalar(0.5),
    quaternion,
    length,
    baseRadius,
    endRadius
  };
}
function createMotoTrailVenezaModel(options = {}) {
  const root = new THREE.Group();
  root.name = "Moto Trail Veneza";
  root.userData.reconstructionEvidence = { "itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": { "solved": false, "fovDegrees": 40, "aspect": 1, "orientation": { "yaw": 0, "pitch": 0, "roll": 0 }, "positionHint": [0, 0, 3], "note": "For likeness work, solve the reference camera (forge/stage1_intake/solve_camera_pose.py) so the review render aligns with the photo and the reference can be projected. Confirm by overlay review." }, "approximationNotes": [] };
  root.userData.materialPipeline = {};
  root.userData.materialReferenceRegistry = null;
  const materialMap = {};
  materialMap["mat-blue"] = createSculptMaterial(
    "mat-blue",
    { "id": "mat-blue", "name": "Pintura azul gloss + verniz", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#1e40af", "color": "#1e40af", "albedo": { "dominant": "#1e40af", "secondary": ["#1e40af"], "samplingNotes": "flat coat, no pattern" }, "colorVariation": { "palette": ["#1e40af"], "pattern": "uniform", "amplitude": 0.03, "heightCorrelation": 0.1 }, "textureResolution": 1024, "textureProjection": { "mode": "uv", "repeat": [2, 2], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale." }, "surfaceFrequencyBands": [{ "id": "macro", "frequency": 1.5, "amplitude": 0.2, "role": "panel-scale value breakup" }, { "id": "meso", "frequency": 12, "amplitude": 0.12, "role": "wear and finish variation" }, { "id": "micro", "frequency": 90, "amplitude": 0.06, "role": "paint orange-peel / casting grain" }], "roughness": { "base": 0.3, "variation": 0.06, "map": "pbr-evidence/mat-blue_roughness.png" }, "metalness": { "base": 0.15, "variation": 0.05 }, "normal": { "pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24, "space": "tangent" }, "bump": { "pattern": "none", "amplitude": 0, "scale": 1 }, "displacement": { "pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false }, "ambientOcclusion": { "source": "cavity", "strength": 0.5, "map": "pbr-evidence/mat-blue_ao.png", "notes": "independent channel, nao derivado da cor base" }, "wear": { "pattern": "edge-wear", "intensity": 0.12, "notes": "desgaste leve de arestas; moto seminova" }, "dirt": { "pattern": "crevice-dust", "intensity": 0.08, "notes": "poeira leve em reentrancias" }, "localOverrides": [{ "id": "ov-fender-edge", "region": "front-fender leading edge", "roughnessDelta": 0.1, "notes": "clearcoat mais gasto na aresta frontal" }], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Replace with image-derived color, roughness, noise, and edge-wear notes.", "clearcoat": { "base": 0.6, "variation": 0 }, "clearcoatRoughness": { "base": 0.15, "variation": 0 }, "finishClass": "painted-metal", "texturePalette": ["#FEFEFE", "#FFFFFF", "#CDD7E9", "#B2B5B9", "#C5C9CC"], "proceduralTexture": "brushed", "transmission": { "base": 0, "variation": 0 }, "ior": { "base": 1.5, "value": 1.5 }, "envMapIntensity": 1, "anisotropy": { "base": 1 }, "referencePbr": { "version": "1", "sourceImage": "moto-hero-3d.png", "extractor": "forge/stage1_intake/extract_pbr_evidence.py", "method": "single-view statistical inference from grid-zone crop (not inverse rendering)", "verdict": "usable-approximate", "usable": true, "confidence": 0.72, "targetThreshold": 0.7, "maps": { "albedo": { "path": "pbr-evidence/mat-blue_albedo.png", "channel": "albedo" }, "roughness": { "path": "pbr-evidence/mat-blue_roughness.png", "channel": "roughness" }, "height": { "path": "pbr-evidence/mat-blue_height.png", "channel": "height" }, "normal": { "path": "pbr-evidence/mat-blue_normal.png", "channel": "normal" }, "ao": { "path": "pbr-evidence/mat-blue_ao.png", "channel": "ao" } } }, "doubleSided": true },
    options
  );
  materialMap["mat-black-plastic"] = createSculptMaterial(
    "mat-black-plastic",
    { "id": "mat-black-plastic", "name": "Plastico preto fosco", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#16181d", "color": "#16181d", "albedo": { "dominant": "#16181d", "secondary": ["#16181d"], "samplingNotes": "flat coat, no pattern" }, "colorVariation": { "palette": ["#16181d"], "pattern": "uniform", "amplitude": 0.03, "heightCorrelation": 0.1 }, "textureResolution": 1024, "textureProjection": { "mode": "uv", "repeat": [2, 2], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale." }, "surfaceFrequencyBands": [{ "id": "macro", "frequency": 1.5, "amplitude": 0.2, "role": "panel-scale value breakup" }, { "id": "meso", "frequency": 12, "amplitude": 0.12, "role": "wear and finish variation" }, { "id": "micro", "frequency": 90, "amplitude": 0.06, "role": "paint orange-peel / casting grain" }], "roughness": { "base": 0.8, "variation": 0.06, "map": "pbr-evidence/mat-black-plastic_roughness.png" }, "metalness": { "base": 0, "variation": 0.05 }, "normal": { "pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24, "space": "tangent" }, "bump": { "pattern": "none", "amplitude": 0, "scale": 1 }, "displacement": { "pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false }, "ambientOcclusion": { "source": "cavity", "strength": 0.5, "map": "pbr-evidence/mat-black-plastic_ao.png", "notes": "independent channel, nao derivado da cor base" }, "wear": { "pattern": "edge-wear", "intensity": 0.12, "notes": "desgaste leve de arestas; moto seminova" }, "dirt": { "pattern": "crevice-dust", "intensity": 0.08, "notes": "poeira leve em reentrancias" }, "localOverrides": [], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Replace with image-derived color, roughness, noise, and edge-wear notes.", "finishClass": "plastic", "referencePbr": { "version": "1", "sourceImage": "moto-hero-3d.png", "extractor": "forge/stage1_intake/extract_pbr_evidence.py", "method": "single-view statistical inference from grid-zone crop (not inverse rendering)", "verdict": "usable-approximate", "usable": true, "confidence": 0.72, "targetThreshold": 0.7, "maps": { "albedo": { "path": "pbr-evidence/mat-black-plastic_albedo.png", "channel": "albedo" }, "roughness": { "path": "pbr-evidence/mat-black-plastic_roughness.png", "channel": "roughness" }, "height": { "path": "pbr-evidence/mat-black-plastic_height.png", "channel": "height" }, "normal": { "path": "pbr-evidence/mat-black-plastic_normal.png", "channel": "normal" }, "ao": { "path": "pbr-evidence/mat-black-plastic_ao.png", "channel": "ao" } } } },
    options
  );
  materialMap["mat-rubber"] = createSculptMaterial(
    "mat-rubber",
    { "id": "mat-rubber", "name": "Borracha de pneu", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#141414", "color": "#141414", "albedo": { "dominant": "#141414", "secondary": ["#141414"], "samplingNotes": "flat coat, no pattern" }, "colorVariation": { "palette": ["#141414"], "pattern": "uniform", "amplitude": 0.03, "heightCorrelation": 0.1 }, "textureResolution": 1024, "textureProjection": { "mode": "uv", "repeat": [2, 2], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale." }, "surfaceFrequencyBands": [{ "id": "macro", "frequency": 1.5, "amplitude": 0.2, "role": "panel-scale value breakup" }, { "id": "meso", "frequency": 12, "amplitude": 0.12, "role": "wear and finish variation" }, { "id": "micro", "frequency": 90, "amplitude": 0.06, "role": "paint orange-peel / casting grain" }], "roughness": { "base": 0.95, "variation": 0.06, "map": "pbr-evidence/mat-rubber_roughness.png" }, "metalness": { "base": 0, "variation": 0.05 }, "normal": { "pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24, "space": "tangent" }, "bump": { "pattern": "none", "amplitude": 0, "scale": 1 }, "displacement": { "pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false }, "ambientOcclusion": { "source": "cavity", "strength": 0.5, "map": "pbr-evidence/mat-rubber_ao.png", "notes": "independent channel, nao derivado da cor base" }, "wear": { "pattern": "edge-wear", "intensity": 0.12, "notes": "desgaste leve de arestas; moto seminova" }, "dirt": { "pattern": "crevice-dust", "intensity": 0.08, "notes": "poeira leve em reentrancias" }, "localOverrides": [], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Replace with image-derived color, roughness, noise, and edge-wear notes.", "finishClass": "plastic", "texturePalette": ["#FCFDFD", "#D3D9DE", "#BEC2C6", "#9EA4A9", "#C3CBCF"], "proceduralTexture": "brushed", "clearcoat": { "base": 0, "variation": 0 }, "clearcoatRoughness": { "base": 0, "variation": 0 }, "transmission": { "base": 0, "variation": 0 }, "ior": { "base": 1.5, "value": 1.5 }, "envMapIntensity": 1, "anisotropy": { "base": 1 }, "referencePbr": { "version": "1", "sourceImage": "moto-hero-3d.png", "extractor": "forge/stage1_intake/extract_pbr_evidence.py", "method": "single-view statistical inference from grid-zone crop (not inverse rendering)", "verdict": "usable-approximate", "usable": true, "confidence": 0.72, "targetThreshold": 0.7, "maps": { "albedo": { "path": "pbr-evidence/mat-rubber_albedo.png", "channel": "albedo" }, "roughness": { "path": "pbr-evidence/mat-rubber_roughness.png", "channel": "roughness" }, "height": { "path": "pbr-evidence/mat-rubber_height.png", "channel": "height" }, "normal": { "path": "pbr-evidence/mat-rubber_normal.png", "channel": "normal" }, "ao": { "path": "pbr-evidence/mat-rubber_ao.png", "channel": "ao" } } } },
    options
  );
  materialMap["mat-seat"] = createSculptMaterial(
    "mat-seat",
    { "id": "mat-seat", "name": "Vinil do banco", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#101114", "color": "#101114", "albedo": { "dominant": "#101114", "secondary": ["#101114"], "samplingNotes": "flat coat, no pattern" }, "colorVariation": { "palette": ["#101114"], "pattern": "uniform", "amplitude": 0.03, "heightCorrelation": 0.1 }, "textureResolution": 1024, "textureProjection": { "mode": "uv", "repeat": [2, 2], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale." }, "surfaceFrequencyBands": [{ "id": "macro", "frequency": 1.5, "amplitude": 0.2, "role": "panel-scale value breakup" }, { "id": "meso", "frequency": 12, "amplitude": 0.12, "role": "wear and finish variation" }, { "id": "micro", "frequency": 90, "amplitude": 0.06, "role": "paint orange-peel / casting grain" }], "roughness": { "base": 0.88, "variation": 0.06, "map": "pbr-evidence/mat-seat_roughness.png" }, "metalness": { "base": 0, "variation": 0.05 }, "normal": { "pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24, "space": "tangent" }, "bump": { "pattern": "none", "amplitude": 0, "scale": 1 }, "displacement": { "pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false }, "ambientOcclusion": { "source": "cavity", "strength": 0.5, "map": "pbr-evidence/mat-seat_ao.png", "notes": "independent channel, nao derivado da cor base" }, "wear": { "pattern": "edge-wear", "intensity": 0.12, "notes": "desgaste leve de arestas; moto seminova" }, "dirt": { "pattern": "crevice-dust", "intensity": 0.08, "notes": "poeira leve em reentrancias" }, "localOverrides": [], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Replace with image-derived color, roughness, noise, and edge-wear notes.", "finishClass": "plastic", "referencePbr": { "version": "1", "sourceImage": "moto-hero-3d.png", "extractor": "forge/stage1_intake/extract_pbr_evidence.py", "method": "single-view statistical inference from grid-zone crop (not inverse rendering)", "verdict": "usable-approximate", "usable": true, "confidence": 0.72, "targetThreshold": 0.7, "maps": { "albedo": { "path": "pbr-evidence/mat-seat_albedo.png", "channel": "albedo" }, "roughness": { "path": "pbr-evidence/mat-seat_roughness.png", "channel": "roughness" }, "height": { "path": "pbr-evidence/mat-seat_height.png", "channel": "height" }, "normal": { "path": "pbr-evidence/mat-seat_normal.png", "channel": "normal" }, "ao": { "path": "pbr-evidence/mat-seat_ao.png", "channel": "ao" } } } },
    options
  );
  materialMap["mat-alloy"] = createSculptMaterial(
    "mat-alloy",
    { "id": "mat-alloy", "name": "Liga de aluminio (motor/cubos)", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#c8ccd2", "color": "#c8ccd2", "albedo": { "dominant": "#c8ccd2", "secondary": ["#c8ccd2"], "samplingNotes": "flat coat, no pattern" }, "colorVariation": { "palette": ["#c8ccd2"], "pattern": "uniform", "amplitude": 0.03, "heightCorrelation": 0.1 }, "textureResolution": 1024, "textureProjection": { "mode": "uv", "repeat": [2, 2], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale." }, "surfaceFrequencyBands": [{ "id": "macro", "frequency": 1.5, "amplitude": 0.2, "role": "panel-scale value breakup" }, { "id": "meso", "frequency": 12, "amplitude": 0.12, "role": "wear and finish variation" }, { "id": "micro", "frequency": 90, "amplitude": 0.06, "role": "paint orange-peel / casting grain" }], "roughness": { "base": 0.4, "variation": 0.06, "map": "pbr-evidence/mat-alloy_roughness.png" }, "metalness": { "base": 0.85, "variation": 0.05 }, "normal": { "pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24, "space": "tangent" }, "bump": { "pattern": "none", "amplitude": 0, "scale": 1 }, "displacement": { "pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false }, "ambientOcclusion": { "source": "cavity", "strength": 0.5, "map": "pbr-evidence/mat-alloy_ao.png", "notes": "independent channel, nao derivado da cor base" }, "wear": { "pattern": "edge-wear", "intensity": 0.12, "notes": "desgaste leve de arestas; moto seminova" }, "dirt": { "pattern": "crevice-dust", "intensity": 0.08, "notes": "poeira leve em reentrancias" }, "localOverrides": [{ "id": "ov-clutch-polish", "region": "clutch-cover face", "roughnessDelta": -0.15, "notes": "tampa de embreagem mais polida" }], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Replace with image-derived color, roughness, noise, and edge-wear notes.", "finishClass": "brushed-steel", "texturePalette": ["#FAFAF9", "#97A0AB", "#5F6874", "#AFB3B6", "#DCE1E3"], "proceduralTexture": "brushed", "clearcoat": { "base": 0, "variation": 0 }, "clearcoatRoughness": { "base": 0, "variation": 0 }, "transmission": { "base": 0, "variation": 0 }, "ior": { "base": 1.5, "value": 1.5 }, "envMapIntensity": 1, "anisotropy": { "base": 1 }, "referencePbr": { "version": "1", "sourceImage": "moto-hero-3d.png", "extractor": "forge/stage1_intake/extract_pbr_evidence.py", "method": "single-view statistical inference from grid-zone crop (not inverse rendering)", "verdict": "usable-approximate", "usable": true, "confidence": 0.72, "targetThreshold": 0.7, "maps": { "albedo": { "path": "pbr-evidence/mat-alloy_albedo.png", "channel": "albedo" }, "roughness": { "path": "pbr-evidence/mat-alloy_roughness.png", "channel": "roughness" }, "height": { "path": "pbr-evidence/mat-alloy_height.png", "channel": "height" }, "normal": { "path": "pbr-evidence/mat-alloy_normal.png", "channel": "normal" }, "ao": { "path": "pbr-evidence/mat-alloy_ao.png", "channel": "ao" } } } },
    options
  );
  materialMap["mat-chrome"] = createSculptMaterial(
    "mat-chrome",
    { "id": "mat-chrome", "name": "Aco cromado (raios/aro)", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#e2e6ea", "color": "#e2e6ea", "albedo": { "dominant": "#e2e6ea", "secondary": ["#e2e6ea"], "samplingNotes": "flat coat, no pattern" }, "colorVariation": { "palette": ["#e2e6ea"], "pattern": "uniform", "amplitude": 0.03, "heightCorrelation": 0.1 }, "textureResolution": 1024, "textureProjection": { "mode": "uv", "repeat": [2, 2], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale." }, "surfaceFrequencyBands": [{ "id": "macro", "frequency": 1.5, "amplitude": 0.2, "role": "panel-scale value breakup" }, { "id": "meso", "frequency": 12, "amplitude": 0.12, "role": "wear and finish variation" }, { "id": "micro", "frequency": 90, "amplitude": 0.06, "role": "paint orange-peel / casting grain" }], "roughness": { "base": 0.18, "variation": 0.06, "map": "pbr-evidence/mat-chrome_roughness.png" }, "metalness": { "base": 1, "variation": 0.05 }, "normal": { "pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24, "space": "tangent" }, "bump": { "pattern": "none", "amplitude": 0, "scale": 1 }, "displacement": { "pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false }, "ambientOcclusion": { "source": "cavity", "strength": 0.5, "map": "pbr-evidence/mat-chrome_ao.png", "notes": "independent channel, nao derivado da cor base" }, "wear": { "pattern": "edge-wear", "intensity": 0.12, "notes": "desgaste leve de arestas; moto seminova" }, "dirt": { "pattern": "crevice-dust", "intensity": 0.08, "notes": "poeira leve em reentrancias" }, "localOverrides": [], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Replace with image-derived color, roughness, noise, and edge-wear notes.", "finishClass": "brushed-steel", "referencePbr": { "version": "1", "sourceImage": "moto-hero-3d.png", "extractor": "forge/stage1_intake/extract_pbr_evidence.py", "method": "single-view statistical inference from grid-zone crop (not inverse rendering)", "verdict": "usable-approximate", "usable": true, "confidence": 0.72, "targetThreshold": 0.7, "maps": { "albedo": { "path": "pbr-evidence/mat-chrome_albedo.png", "channel": "albedo" }, "roughness": { "path": "pbr-evidence/mat-chrome_roughness.png", "channel": "roughness" }, "height": { "path": "pbr-evidence/mat-chrome_height.png", "channel": "height" }, "normal": { "path": "pbr-evidence/mat-chrome_normal.png", "channel": "normal" }, "ao": { "path": "pbr-evidence/mat-chrome_ao.png", "channel": "ao" } } } },
    options
  );
  materialMap["mat-dark-metal"] = createSculptMaterial(
    "mat-dark-metal",
    { "id": "mat-dark-metal", "name": "Metal escuro (quadro/forquilha)", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#23262b", "color": "#23262b", "albedo": { "dominant": "#23262b", "secondary": ["#23262b"], "samplingNotes": "flat coat, no pattern" }, "colorVariation": { "palette": ["#23262b"], "pattern": "uniform", "amplitude": 0.03, "heightCorrelation": 0.1 }, "textureResolution": 1024, "textureProjection": { "mode": "uv", "repeat": [2, 2], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale." }, "surfaceFrequencyBands": [{ "id": "macro", "frequency": 1.5, "amplitude": 0.2, "role": "panel-scale value breakup" }, { "id": "meso", "frequency": 12, "amplitude": 0.12, "role": "wear and finish variation" }, { "id": "micro", "frequency": 90, "amplitude": 0.06, "role": "paint orange-peel / casting grain" }], "roughness": { "base": 0.5, "variation": 0.06, "map": "pbr-evidence/mat-dark-metal_roughness.png" }, "metalness": { "base": 0.6, "variation": 0.05 }, "normal": { "pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24, "space": "tangent" }, "bump": { "pattern": "none", "amplitude": 0, "scale": 1 }, "displacement": { "pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false }, "ambientOcclusion": { "source": "cavity", "strength": 0.5, "map": "pbr-evidence/mat-dark-metal_ao.png", "notes": "independent channel, nao derivado da cor base" }, "wear": { "pattern": "edge-wear", "intensity": 0.12, "notes": "desgaste leve de arestas; moto seminova" }, "dirt": { "pattern": "crevice-dust", "intensity": 0.08, "notes": "poeira leve em reentrancias" }, "localOverrides": [], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Replace with image-derived color, roughness, noise, and edge-wear notes.", "finishClass": "painted-metal", "referencePbr": { "version": "1", "sourceImage": "moto-hero-3d.png", "extractor": "forge/stage1_intake/extract_pbr_evidence.py", "method": "single-view statistical inference from grid-zone crop (not inverse rendering)", "verdict": "usable-approximate", "usable": true, "confidence": 0.72, "targetThreshold": 0.7, "maps": { "albedo": { "path": "pbr-evidence/mat-dark-metal_albedo.png", "channel": "albedo" }, "roughness": { "path": "pbr-evidence/mat-dark-metal_roughness.png", "channel": "roughness" }, "height": { "path": "pbr-evidence/mat-dark-metal_height.png", "channel": "height" }, "normal": { "path": "pbr-evidence/mat-dark-metal_normal.png", "channel": "normal" }, "ao": { "path": "pbr-evidence/mat-dark-metal_ao.png", "channel": "ao" } } } },
    options
  );
  materialMap["mat-headlight"] = createSculptMaterial(
    "mat-headlight",
    { "id": "mat-headlight", "name": "Lente do farol", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#f8fafc", "color": "#f8fafc", "albedo": { "dominant": "#f8fafc", "secondary": ["#f8fafc"], "samplingNotes": "flat coat, no pattern" }, "colorVariation": { "palette": ["#f8fafc"], "pattern": "uniform", "amplitude": 0.03, "heightCorrelation": 0.1 }, "textureResolution": 1024, "textureProjection": { "mode": "uv", "repeat": [2, 2], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale." }, "surfaceFrequencyBands": [{ "id": "macro", "frequency": 1.5, "amplitude": 0.2, "role": "panel-scale value breakup" }, { "id": "meso", "frequency": 12, "amplitude": 0.12, "role": "wear and finish variation" }, { "id": "micro", "frequency": 90, "amplitude": 0.06, "role": "paint orange-peel / casting grain" }], "roughness": { "base": 0.1, "variation": 0.06, "map": "pbr-evidence/mat-headlight_roughness.png" }, "metalness": { "base": 0, "variation": 0.05 }, "normal": { "pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24, "space": "tangent" }, "bump": { "pattern": "none", "amplitude": 0, "scale": 1 }, "displacement": { "pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false }, "ambientOcclusion": { "source": "cavity", "strength": 0.5, "map": "pbr-evidence/mat-headlight_ao.png", "notes": "independent channel, nao derivado da cor base" }, "wear": { "pattern": "edge-wear", "intensity": 0.12, "notes": "desgaste leve de arestas; moto seminova" }, "dirt": { "pattern": "crevice-dust", "intensity": 0.08, "notes": "poeira leve em reentrancias" }, "localOverrides": [], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Replace with image-derived color, roughness, noise, and edge-wear notes.", "emissive": "#dbeafe", "emissiveIntensity": 0.35, "finishClass": "plastic", "referencePbr": { "version": "1", "sourceImage": "moto-hero-3d.png", "extractor": "forge/stage1_intake/extract_pbr_evidence.py", "method": "single-view statistical inference from 4x4 grid crop r1c2 (cowl/headlight region)", "verdict": "usable-approximate", "usable": true, "confidence": 0.86, "targetThreshold": 0.7, "maps": { "albedo": { "path": "pbr-evidence/mat-headlight_albedo.png", "channel": "albedo" }, "roughness": { "path": "pbr-evidence/mat-headlight_roughness.png", "channel": "roughness" }, "height": { "path": "pbr-evidence/mat-headlight_height.png", "channel": "height" }, "normal": { "path": "pbr-evidence/mat-headlight_normal.png", "channel": "normal" }, "ao": { "path": "pbr-evidence/mat-headlight_ao.png", "channel": "ao" } } } },
    options
  );
  const nodes = { root };
  const meshes = {};
  const sockets = {};
  const colliders = {};
  const destructionGroups = {};
  const attachment_root_0 = null;
  const endpoint_root_0 = makeAttachmentEndpoint(attachment_root_0);
  const node_root_0 = new THREE.Group();
  node_root_0.name = "Ancora do chassis__pivot";
  node_root_0.scale.set(1, 1, 1);
  if (endpoint_root_0) {
    node_root_0.position.copy(endpoint_root_0.start);
    node_root_0.rotation.set(0, 0, 0);
  } else {
    node_root_0.position.set(0, 0, 0);
    node_root_0.rotation.set(0, 0, 0);
  }
  node_root_0.userData.sculptComponent = { "id": "root", "name": "Ancora do chassis", "level": "macro", "role": "root", "importance": 1, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Ancora estrutural minuscula (12 mm) na origem, ao nivel do chao entre as rodas; raiz da arvore, sem contributo visual.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.171 }, "parent": null, "attachment": null, "dimensions": { "width": 0.012, "height": 0.012, "depth": 0.012, "units": "meters", "confidence": 0.9 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "root", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(20, 20, 20, 1.0)", "secondaryAlbedo": "rgba(32, 32, 32, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_root_0.userData.actionProfile = { "animationRole": "root", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_root_0);
  nodes["root"] = node_root_0;
  const mesh_root_0Geometry = endpoint_root_0 ? new THREE.CylinderGeometry(endpoint_root_0.endRadius, endpoint_root_0.baseRadius, endpoint_root_0.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_root_0) {
    mesh_root_0Geometry.scale(0.012, 0.012, 0.012);
  }
  const mesh_root_0 = new THREE.Mesh(
    mesh_root_0Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_root_0.name = "Ancora do chassis";
  if (endpoint_root_0) {
    mesh_root_0.position.copy(endpoint_root_0.midpoint);
    mesh_root_0.quaternion.copy(endpoint_root_0.quaternion);
  }
  mesh_root_0.castShadow = options.castShadow ?? true;
  mesh_root_0.receiveShadow = options.receiveShadow ?? true;
  mesh_root_0.userData.sculptComponent = { "id": "root", "name": "Ancora do chassis", "level": "macro", "role": "root", "importance": 1, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Ancora estrutural minuscula (12 mm) na origem, ao nivel do chao entre as rodas; raiz da arvore, sem contributo visual.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.171 }, "parent": null, "attachment": null, "dimensions": { "width": 0.012, "height": 0.012, "depth": 0.012, "units": "meters", "confidence": 0.9 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "root", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(20, 20, 20, 1.0)", "secondaryAlbedo": "rgba(32, 32, 32, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_root_0.add(mesh_root_0);
  meshes["root"] = mesh_root_0;
  colliders["root"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_root_0);
  const attachment_tire_front_1 = { "parentSocket": "fork-lower-r", "contactType": "overlap", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_tire_front_1 = makeAttachmentEndpoint(attachment_tire_front_1);
  const node_tire_front_1 = new THREE.Group();
  node_tire_front_1.name = "Pneu dianteiro__pivot";
  node_tire_front_1.scale.set(1, 1, 1);
  if (endpoint_tire_front_1) {
    node_tire_front_1.position.copy(endpoint_tire_front_1.start);
    node_tire_front_1.rotation.set(0, 0, 0);
  } else {
    node_tire_front_1.position.set(0.68, 0.325, 0);
    node_tire_front_1.rotation.set(0, 0, 0);
  }
  node_tire_front_1.userData.sculptComponent = { "id": "tire-front", "name": "Pneu dianteiro", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "torus", "topologyClass": "continuous-sculpt", "topologyRationale": "Toro unitario (anel 0.45, tubo 0.45*0.171) escalado 0.626 -> diametro exterior 0.66 m.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.171 }, "parent": "root", "attachment": { "parentSocket": "fork-lower-r", "contactType": "overlap", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.626, "height": 0.626, "depth": 0.625, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.68, 0.325, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-rubber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-tread-front", "kind": "groove", "description": "Blocos de piso retangulares, 28 em anel", "mapsTo": "rep-tread-front" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-rubber", "colorMaterialRecipe": { "dominantAlbedo": "rgba(20, 20, 20, 1.0)", "secondaryAlbedo": "rgba(32, 32, 32, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_tire_front_1.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_tire_front_1);
  nodes["tire-front"] = node_tire_front_1;
  const mesh_tire_front_1Geometry = endpoint_tire_front_1 ? new THREE.CylinderGeometry(endpoint_tire_front_1.endRadius, endpoint_tire_front_1.baseRadius, endpoint_tire_front_1.length, 16, 6) : new THREE.TorusGeometry(0.45, 0.077, 12, 48);
  if (!endpoint_tire_front_1) {
    mesh_tire_front_1Geometry.scale(0.626, 0.626, 0.625);
  }
  const mesh_tire_front_1 = new THREE.Mesh(
    mesh_tire_front_1Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_tire_front_1.name = "Pneu dianteiro";
  if (endpoint_tire_front_1) {
    mesh_tire_front_1.position.copy(endpoint_tire_front_1.midpoint);
    mesh_tire_front_1.quaternion.copy(endpoint_tire_front_1.quaternion);
  }
  mesh_tire_front_1.castShadow = options.castShadow ?? true;
  mesh_tire_front_1.receiveShadow = options.receiveShadow ?? true;
  mesh_tire_front_1.userData.sculptComponent = { "id": "tire-front", "name": "Pneu dianteiro", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "torus", "topologyClass": "continuous-sculpt", "topologyRationale": "Toro unitario (anel 0.45, tubo 0.45*0.171) escalado 0.626 -> diametro exterior 0.66 m.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.171 }, "parent": "root", "attachment": { "parentSocket": "fork-lower-r", "contactType": "overlap", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.626, "height": 0.626, "depth": 0.625, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.68, 0.325, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-rubber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-tread-front", "kind": "groove", "description": "Blocos de piso retangulares, 28 em anel", "mapsTo": "rep-tread-front" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-rubber", "colorMaterialRecipe": { "dominantAlbedo": "rgba(20, 20, 20, 1.0)", "secondaryAlbedo": "rgba(32, 32, 32, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_tire_front_1.add(mesh_tire_front_1);
  meshes["tire-front"] = mesh_tire_front_1;
  colliders["tire-front"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_tire_front_1);
  const attachment_rim_front_2 = { "parentSocket": "tire-front", "contactType": "embed", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_rim_front_2 = makeAttachmentEndpoint(attachment_rim_front_2);
  const node_rim_front_2 = new THREE.Group();
  node_rim_front_2.name = "Aro dianteiro__pivot";
  node_rim_front_2.scale.set(1, 1, 1);
  if (endpoint_rim_front_2) {
    node_rim_front_2.position.copy(endpoint_rim_front_2.start);
    node_rim_front_2.rotation.set(0, 0, 0);
  } else {
    node_rim_front_2.position.set(0.68, 0.325, 0);
    node_rim_front_2.rotation.set(0, 0, 0);
  }
  node_rim_front_2.userData.sculptComponent = { "id": "rim-front", "name": "Aro dianteiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "torus unitario escalado por dimensions para o volume observado de Aro dianteiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.0553 }, "parent": "root", "attachment": { "parentSocket": "tire-front", "contactType": "embed", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.522, "height": 0.522, "depth": 0.523, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.68, 0.325, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-chrome"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-chrome", "colorMaterialRecipe": { "dominantAlbedo": "rgba(226, 230, 234, 1.0)", "secondaryAlbedo": "rgba(180, 186, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_rim_front_2.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_rim_front_2);
  nodes["rim-front"] = node_rim_front_2;
  const mesh_rim_front_2Geometry = endpoint_rim_front_2 ? new THREE.CylinderGeometry(endpoint_rim_front_2.endRadius, endpoint_rim_front_2.baseRadius, endpoint_rim_front_2.length, 16, 6) : new THREE.TorusGeometry(0.45, 0.0249, 12, 48);
  if (!endpoint_rim_front_2) {
    mesh_rim_front_2Geometry.scale(0.522, 0.522, 0.523);
  }
  const mesh_rim_front_2 = new THREE.Mesh(
    mesh_rim_front_2Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_rim_front_2.name = "Aro dianteiro";
  if (endpoint_rim_front_2) {
    mesh_rim_front_2.position.copy(endpoint_rim_front_2.midpoint);
    mesh_rim_front_2.quaternion.copy(endpoint_rim_front_2.quaternion);
  }
  mesh_rim_front_2.castShadow = options.castShadow ?? true;
  mesh_rim_front_2.receiveShadow = options.receiveShadow ?? true;
  mesh_rim_front_2.userData.sculptComponent = { "id": "rim-front", "name": "Aro dianteiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "torus unitario escalado por dimensions para o volume observado de Aro dianteiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.0553 }, "parent": "root", "attachment": { "parentSocket": "tire-front", "contactType": "embed", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.522, "height": 0.522, "depth": 0.523, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.68, 0.325, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-chrome"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-chrome", "colorMaterialRecipe": { "dominantAlbedo": "rgba(226, 230, 234, 1.0)", "secondaryAlbedo": "rgba(180, 186, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_rim_front_2.add(mesh_rim_front_2);
  meshes["rim-front"] = mesh_rim_front_2;
  colliders["rim-front"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_rim_front_2);
  const attachment_hub_front_3 = { "parentSocket": "fork-lower-r", "contactType": "socket", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_hub_front_3 = makeAttachmentEndpoint(attachment_hub_front_3);
  const node_hub_front_3 = new THREE.Group();
  node_hub_front_3.name = "Cubo dianteiro__pivot";
  node_hub_front_3.scale.set(1, 1, 1);
  if (endpoint_hub_front_3) {
    node_hub_front_3.position.copy(endpoint_hub_front_3.start);
    node_hub_front_3.rotation.set(1.5707963267948966, 0, 0);
  } else {
    node_hub_front_3.position.set(0.68, 0.325, 0);
    node_hub_front_3.rotation.set(1.5707963267948966, 0, 0);
  }
  node_hub_front_3.userData.sculptComponent = { "id": "hub-front", "name": "Cubo dianteiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Cubo dianteiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fork-lower-r", "contactType": "socket", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.11, "height": 0.11, "depth": 0.11, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.68, 0.325, 0], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-spoke-cross", "kind": "linework", "description": "36 raios cruzados cromados", "mapsTo": "rep-spokes-front" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_hub_front_3.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_hub_front_3);
  nodes["hub-front"] = node_hub_front_3;
  const mesh_hub_front_3Geometry = endpoint_hub_front_3 ? new THREE.CylinderGeometry(endpoint_hub_front_3.endRadius, endpoint_hub_front_3.baseRadius, endpoint_hub_front_3.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_hub_front_3) {
    mesh_hub_front_3Geometry.scale(0.11, 0.11, 0.11);
  }
  const mesh_hub_front_3 = new THREE.Mesh(
    mesh_hub_front_3Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_hub_front_3.name = "Cubo dianteiro";
  if (endpoint_hub_front_3) {
    mesh_hub_front_3.position.copy(endpoint_hub_front_3.midpoint);
    mesh_hub_front_3.quaternion.copy(endpoint_hub_front_3.quaternion);
  }
  mesh_hub_front_3.castShadow = options.castShadow ?? true;
  mesh_hub_front_3.receiveShadow = options.receiveShadow ?? true;
  mesh_hub_front_3.userData.sculptComponent = { "id": "hub-front", "name": "Cubo dianteiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Cubo dianteiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fork-lower-r", "contactType": "socket", "localStart": [0.68, 0.325, 0], "localEnd": [0.68, 0.325, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.11, "height": 0.11, "depth": 0.11, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.68, 0.325, 0], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-spoke-cross", "kind": "linework", "description": "36 raios cruzados cromados", "mapsTo": "rep-spokes-front" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_hub_front_3.add(mesh_hub_front_3);
  meshes["hub-front"] = mesh_hub_front_3;
  colliders["hub-front"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_hub_front_3);
  const attachment_disc_front_4 = { "parentSocket": "hub-front", "contactType": "overlap", "localStart": [0.68, 0.325, 0.045], "localEnd": [0.68, 0.325, 0.045], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_disc_front_4 = makeAttachmentEndpoint(attachment_disc_front_4);
  const node_disc_front_4 = new THREE.Group();
  node_disc_front_4.name = "Disco de travao__pivot";
  node_disc_front_4.scale.set(1, 1, 1);
  if (endpoint_disc_front_4) {
    node_disc_front_4.position.copy(endpoint_disc_front_4.start);
    node_disc_front_4.rotation.set(1.5707963267948966, 0, 0);
  } else {
    node_disc_front_4.position.set(0.68, 0.325, 0.045);
    node_disc_front_4.rotation.set(1.5707963267948966, 0, 0);
  }
  node_disc_front_4.userData.sculptComponent = { "id": "disc-front", "name": "Disco de travao", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Disco de travao.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "hub-front", "contactType": "overlap", "localStart": [0.68, 0.325, 0.045], "localEnd": [0.68, 0.325, 0.045], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.22, "height": 6e-3, "depth": 0.22, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.68, 0.325, 0.045], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_disc_front_4.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_disc_front_4);
  nodes["disc-front"] = node_disc_front_4;
  const mesh_disc_front_4Geometry = endpoint_disc_front_4 ? new THREE.CylinderGeometry(endpoint_disc_front_4.endRadius, endpoint_disc_front_4.baseRadius, endpoint_disc_front_4.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_disc_front_4) {
    mesh_disc_front_4Geometry.scale(0.22, 6e-3, 0.22);
  }
  const mesh_disc_front_4 = new THREE.Mesh(
    mesh_disc_front_4Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_disc_front_4.name = "Disco de travao";
  if (endpoint_disc_front_4) {
    mesh_disc_front_4.position.copy(endpoint_disc_front_4.midpoint);
    mesh_disc_front_4.quaternion.copy(endpoint_disc_front_4.quaternion);
  }
  mesh_disc_front_4.castShadow = options.castShadow ?? true;
  mesh_disc_front_4.receiveShadow = options.receiveShadow ?? true;
  mesh_disc_front_4.userData.sculptComponent = { "id": "disc-front", "name": "Disco de travao", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Disco de travao.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "hub-front", "contactType": "overlap", "localStart": [0.68, 0.325, 0.045], "localEnd": [0.68, 0.325, 0.045], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.22, "height": 6e-3, "depth": 0.22, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.68, 0.325, 0.045], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_disc_front_4.add(mesh_disc_front_4);
  meshes["disc-front"] = mesh_disc_front_4;
  colliders["disc-front"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_disc_front_4);
  const attachment_tire_rear_5 = { "parentSocket": "swingarm-r", "contactType": "overlap", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_tire_rear_5 = makeAttachmentEndpoint(attachment_tire_rear_5);
  const node_tire_rear_5 = new THREE.Group();
  node_tire_rear_5.name = "Pneu traseiro__pivot";
  node_tire_rear_5.scale.set(1, 1, 1);
  if (endpoint_tire_rear_5) {
    node_tire_rear_5.position.copy(endpoint_tire_rear_5.start);
    node_tire_rear_5.rotation.set(0, 0, 0);
  } else {
    node_tire_rear_5.position.set(-0.67, 0.31, 0);
    node_tire_rear_5.rotation.set(0, 0, 0);
  }
  node_tire_rear_5.userData.sculptComponent = { "id": "tire-rear", "name": "Pneu traseiro", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "torus", "topologyClass": "continuous-sculpt", "topologyRationale": "torus unitario escalado por dimensions para o volume observado de Pneu traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.2275 }, "parent": "root", "attachment": { "parentSocket": "swingarm-r", "contactType": "overlap", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.567, "height": 0.567, "depth": 0.567, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.67, 0.31, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-rubber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-tread-rear", "kind": "groove", "description": "Blocos de piso retangulares, 26 em anel", "mapsTo": "rep-tread-rear" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-rubber", "colorMaterialRecipe": { "dominantAlbedo": "rgba(20, 20, 20, 1.0)", "secondaryAlbedo": "rgba(32, 32, 32, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_tire_rear_5.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_tire_rear_5);
  nodes["tire-rear"] = node_tire_rear_5;
  const mesh_tire_rear_5Geometry = endpoint_tire_rear_5 ? new THREE.CylinderGeometry(endpoint_tire_rear_5.endRadius, endpoint_tire_rear_5.baseRadius, endpoint_tire_rear_5.length, 16, 6) : new THREE.TorusGeometry(0.45, 0.1024, 12, 48);
  if (!endpoint_tire_rear_5) {
    mesh_tire_rear_5Geometry.scale(0.567, 0.567, 0.567);
  }
  const mesh_tire_rear_5 = new THREE.Mesh(
    mesh_tire_rear_5Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_tire_rear_5.name = "Pneu traseiro";
  if (endpoint_tire_rear_5) {
    mesh_tire_rear_5.position.copy(endpoint_tire_rear_5.midpoint);
    mesh_tire_rear_5.quaternion.copy(endpoint_tire_rear_5.quaternion);
  }
  mesh_tire_rear_5.castShadow = options.castShadow ?? true;
  mesh_tire_rear_5.receiveShadow = options.receiveShadow ?? true;
  mesh_tire_rear_5.userData.sculptComponent = { "id": "tire-rear", "name": "Pneu traseiro", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "torus", "topologyClass": "continuous-sculpt", "topologyRationale": "torus unitario escalado por dimensions para o volume observado de Pneu traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.2275 }, "parent": "root", "attachment": { "parentSocket": "swingarm-r", "contactType": "overlap", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.567, "height": 0.567, "depth": 0.567, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.67, 0.31, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-rubber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-tread-rear", "kind": "groove", "description": "Blocos de piso retangulares, 26 em anel", "mapsTo": "rep-tread-rear" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-rubber", "colorMaterialRecipe": { "dominantAlbedo": "rgba(20, 20, 20, 1.0)", "secondaryAlbedo": "rgba(32, 32, 32, 1.0)", "materialClass": "rubber", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_tire_rear_5.add(mesh_tire_rear_5);
  meshes["tire-rear"] = mesh_tire_rear_5;
  colliders["tire-rear"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_tire_rear_5);
  const attachment_rim_rear_6 = { "parentSocket": "tire-rear", "contactType": "embed", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_rim_rear_6 = makeAttachmentEndpoint(attachment_rim_rear_6);
  const node_rim_rear_6 = new THREE.Group();
  node_rim_rear_6.name = "Aro traseiro__pivot";
  node_rim_rear_6.scale.set(1, 1, 1);
  if (endpoint_rim_rear_6) {
    node_rim_rear_6.position.copy(endpoint_rim_rear_6.start);
    node_rim_rear_6.rotation.set(0, 0, 0);
  } else {
    node_rim_rear_6.position.set(-0.67, 0.31, 0);
    node_rim_rear_6.rotation.set(0, 0, 0);
  }
  node_rim_rear_6.userData.sculptComponent = { "id": "rim-rear", "name": "Aro traseiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "torus unitario escalado por dimensions para o volume observado de Aro traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.0619 }, "parent": "root", "attachment": { "parentSocket": "tire-rear", "contactType": "embed", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.467, "height": 0.467, "depth": 0.467, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.67, 0.31, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-chrome"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-chrome", "colorMaterialRecipe": { "dominantAlbedo": "rgba(226, 230, 234, 1.0)", "secondaryAlbedo": "rgba(180, 186, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_rim_rear_6.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_rim_rear_6);
  nodes["rim-rear"] = node_rim_rear_6;
  const mesh_rim_rear_6Geometry = endpoint_rim_rear_6 ? new THREE.CylinderGeometry(endpoint_rim_rear_6.endRadius, endpoint_rim_rear_6.baseRadius, endpoint_rim_rear_6.length, 16, 6) : new THREE.TorusGeometry(0.45, 0.0279, 12, 48);
  if (!endpoint_rim_rear_6) {
    mesh_rim_rear_6Geometry.scale(0.467, 0.467, 0.467);
  }
  const mesh_rim_rear_6 = new THREE.Mesh(
    mesh_rim_rear_6Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_rim_rear_6.name = "Aro traseiro";
  if (endpoint_rim_rear_6) {
    mesh_rim_rear_6.position.copy(endpoint_rim_rear_6.midpoint);
    mesh_rim_rear_6.quaternion.copy(endpoint_rim_rear_6.quaternion);
  }
  mesh_rim_rear_6.castShadow = options.castShadow ?? true;
  mesh_rim_rear_6.receiveShadow = options.receiveShadow ?? true;
  mesh_rim_rear_6.userData.sculptComponent = { "id": "rim-rear", "name": "Aro traseiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "torus unitario escalado por dimensions para o volume observado de Aro traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry", "torusTubeRatio": 0.0619 }, "parent": "root", "attachment": { "parentSocket": "tire-rear", "contactType": "embed", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.467, "height": 0.467, "depth": 0.467, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.67, 0.31, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-chrome"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-chrome", "colorMaterialRecipe": { "dominantAlbedo": "rgba(226, 230, 234, 1.0)", "secondaryAlbedo": "rgba(180, 186, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_rim_rear_6.add(mesh_rim_rear_6);
  meshes["rim-rear"] = mesh_rim_rear_6;
  colliders["rim-rear"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_rim_rear_6);
  const attachment_hub_rear_7 = { "parentSocket": "swingarm-r", "contactType": "socket", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_hub_rear_7 = makeAttachmentEndpoint(attachment_hub_rear_7);
  const node_hub_rear_7 = new THREE.Group();
  node_hub_rear_7.name = "Cubo traseiro__pivot";
  node_hub_rear_7.scale.set(1, 1, 1);
  if (endpoint_hub_rear_7) {
    node_hub_rear_7.position.copy(endpoint_hub_rear_7.start);
    node_hub_rear_7.rotation.set(1.5707963267948966, 0, 0);
  } else {
    node_hub_rear_7.position.set(-0.67, 0.31, 0);
    node_hub_rear_7.rotation.set(1.5707963267948966, 0, 0);
  }
  node_hub_rear_7.userData.sculptComponent = { "id": "hub-rear", "name": "Cubo traseiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Cubo traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "swingarm-r", "contactType": "socket", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.14, "height": 0.13, "depth": 0.14, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.67, 0.31, 0], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-spoke-cross-r", "kind": "linework", "description": "36 raios cruzados cromados", "mapsTo": "rep-spokes-rear" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_hub_rear_7.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_hub_rear_7);
  nodes["hub-rear"] = node_hub_rear_7;
  const mesh_hub_rear_7Geometry = endpoint_hub_rear_7 ? new THREE.CylinderGeometry(endpoint_hub_rear_7.endRadius, endpoint_hub_rear_7.baseRadius, endpoint_hub_rear_7.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_hub_rear_7) {
    mesh_hub_rear_7Geometry.scale(0.14, 0.13, 0.14);
  }
  const mesh_hub_rear_7 = new THREE.Mesh(
    mesh_hub_rear_7Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_hub_rear_7.name = "Cubo traseiro";
  if (endpoint_hub_rear_7) {
    mesh_hub_rear_7.position.copy(endpoint_hub_rear_7.midpoint);
    mesh_hub_rear_7.quaternion.copy(endpoint_hub_rear_7.quaternion);
  }
  mesh_hub_rear_7.castShadow = options.castShadow ?? true;
  mesh_hub_rear_7.receiveShadow = options.receiveShadow ?? true;
  mesh_hub_rear_7.userData.sculptComponent = { "id": "hub-rear", "name": "Cubo traseiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Cubo traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "swingarm-r", "contactType": "socket", "localStart": [-0.67, 0.31, 0], "localEnd": [-0.67, 0.31, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.14, "height": 0.13, "depth": 0.14, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.67, 0.31, 0], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-spoke-cross-r", "kind": "linework", "description": "36 raios cruzados cromados", "mapsTo": "rep-spokes-rear" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_hub_rear_7.add(mesh_hub_rear_7);
  meshes["hub-rear"] = mesh_hub_rear_7;
  colliders["hub-rear"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_hub_rear_7);
  const attachment_fork_lower_r_8 = { "parentSocket": "hub-front", "contactType": "socket", "localStart": [0.68, 0.325, 0.09], "localEnd": [0.512, 0.62, 0.09], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_fork_lower_r_8 = makeAttachmentEndpoint(attachment_fork_lower_r_8);
  const node_fork_lower_r_8 = new THREE.Group();
  node_fork_lower_r_8.name = "Canela da forquilha (r)__pivot";
  node_fork_lower_r_8.scale.set(1, 1, 1);
  if (endpoint_fork_lower_r_8) {
    node_fork_lower_r_8.position.copy(endpoint_fork_lower_r_8.start);
    node_fork_lower_r_8.rotation.set(0, 0, 0);
  } else {
    node_fork_lower_r_8.position.set(0, 0, 0);
    node_fork_lower_r_8.rotation.set(0, 0, 0);
  }
  node_fork_lower_r_8.userData.sculptComponent = { "id": "fork-lower-r", "name": "Canela da forquilha (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Canela da forquilha (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "hub-front", "contactType": "socket", "localStart": [0.68, 0.325, 0.09], "localEnd": [0.512, 0.62, 0.09], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fork_lower_r_8.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_fork_lower_r_8);
  nodes["fork-lower-r"] = node_fork_lower_r_8;
  const mesh_fork_lower_r_8Geometry = endpoint_fork_lower_r_8 ? new THREE.CylinderGeometry(endpoint_fork_lower_r_8.endRadius, endpoint_fork_lower_r_8.baseRadius, endpoint_fork_lower_r_8.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_fork_lower_r_8) {
    mesh_fork_lower_r_8Geometry.scale(1, 1, 1);
  }
  const mesh_fork_lower_r_8 = new THREE.Mesh(
    mesh_fork_lower_r_8Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_fork_lower_r_8.name = "Canela da forquilha (r)";
  if (endpoint_fork_lower_r_8) {
    mesh_fork_lower_r_8.position.copy(endpoint_fork_lower_r_8.midpoint);
    mesh_fork_lower_r_8.quaternion.copy(endpoint_fork_lower_r_8.quaternion);
  }
  mesh_fork_lower_r_8.castShadow = options.castShadow ?? true;
  mesh_fork_lower_r_8.receiveShadow = options.receiveShadow ?? true;
  mesh_fork_lower_r_8.userData.sculptComponent = { "id": "fork-lower-r", "name": "Canela da forquilha (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Canela da forquilha (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "hub-front", "contactType": "socket", "localStart": [0.68, 0.325, 0.09], "localEnd": [0.512, 0.62, 0.09], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fork_lower_r_8.add(mesh_fork_lower_r_8);
  meshes["fork-lower-r"] = mesh_fork_lower_r_8;
  colliders["fork-lower-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_fork_lower_r_8);
  const attachment_fork_gaiter_r_9 = { "parentSocket": "fork-lower-r", "contactType": "overlap", "localStart": [0.512, 0.62, 0.09], "localEnd": [0.338, 0.924, 0.09], "baseRadius": 0.038, "endRadius": 0.038, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_fork_gaiter_r_9 = makeAttachmentEndpoint(attachment_fork_gaiter_r_9);
  const node_fork_gaiter_r_9 = new THREE.Group();
  node_fork_gaiter_r_9.name = "Sanfona da forquilha (r)__pivot";
  node_fork_gaiter_r_9.scale.set(1, 1, 1);
  if (endpoint_fork_gaiter_r_9) {
    node_fork_gaiter_r_9.position.copy(endpoint_fork_gaiter_r_9.start);
    node_fork_gaiter_r_9.rotation.set(0, 0, 0);
  } else {
    node_fork_gaiter_r_9.position.set(0, 0, 0);
    node_fork_gaiter_r_9.rotation.set(0, 0, 0);
  }
  node_fork_gaiter_r_9.userData.sculptComponent = { "id": "fork-gaiter-r", "name": "Sanfona da forquilha (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manga cilindrica; pregas descritas em localFeatures (aproximacao sem stack de toros).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fork-lower-r", "contactType": "overlap", "localStart": [0.512, 0.62, 0.09], "localEnd": [0.338, 0.924, 0.09], "baseRadius": 0.038, "endRadius": 0.038, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-pleats-r", "kind": "ridge", "description": "~10 pregas de fole (aproximadas pelo material rugoso)" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fork_gaiter_r_9.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_fork_gaiter_r_9);
  nodes["fork-gaiter-r"] = node_fork_gaiter_r_9;
  const mesh_fork_gaiter_r_9Geometry = endpoint_fork_gaiter_r_9 ? new THREE.CylinderGeometry(endpoint_fork_gaiter_r_9.endRadius, endpoint_fork_gaiter_r_9.baseRadius, endpoint_fork_gaiter_r_9.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_fork_gaiter_r_9) {
    mesh_fork_gaiter_r_9Geometry.scale(1, 1, 1);
  }
  const mesh_fork_gaiter_r_9 = new THREE.Mesh(
    mesh_fork_gaiter_r_9Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_fork_gaiter_r_9.name = "Sanfona da forquilha (r)";
  if (endpoint_fork_gaiter_r_9) {
    mesh_fork_gaiter_r_9.position.copy(endpoint_fork_gaiter_r_9.midpoint);
    mesh_fork_gaiter_r_9.quaternion.copy(endpoint_fork_gaiter_r_9.quaternion);
  }
  mesh_fork_gaiter_r_9.castShadow = options.castShadow ?? true;
  mesh_fork_gaiter_r_9.receiveShadow = options.receiveShadow ?? true;
  mesh_fork_gaiter_r_9.userData.sculptComponent = { "id": "fork-gaiter-r", "name": "Sanfona da forquilha (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manga cilindrica; pregas descritas em localFeatures (aproximacao sem stack de toros).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fork-lower-r", "contactType": "overlap", "localStart": [0.512, 0.62, 0.09], "localEnd": [0.338, 0.924, 0.09], "baseRadius": 0.038, "endRadius": 0.038, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-pleats-r", "kind": "ridge", "description": "~10 pregas de fole (aproximadas pelo material rugoso)" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fork_gaiter_r_9.add(mesh_fork_gaiter_r_9);
  meshes["fork-gaiter-r"] = mesh_fork_gaiter_r_9;
  colliders["fork-gaiter-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_fork_gaiter_r_9);
  const attachment_fork_lower_l_10 = { "parentSocket": "hub-front", "contactType": "socket", "localStart": [0.68, 0.325, -0.09], "localEnd": [0.512, 0.62, -0.09], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_fork_lower_l_10 = makeAttachmentEndpoint(attachment_fork_lower_l_10);
  const node_fork_lower_l_10 = new THREE.Group();
  node_fork_lower_l_10.name = "Canela da forquilha (l)__pivot";
  node_fork_lower_l_10.scale.set(1, 1, 1);
  if (endpoint_fork_lower_l_10) {
    node_fork_lower_l_10.position.copy(endpoint_fork_lower_l_10.start);
    node_fork_lower_l_10.rotation.set(0, 0, 0);
  } else {
    node_fork_lower_l_10.position.set(0, 0, 0);
    node_fork_lower_l_10.rotation.set(0, 0, 0);
  }
  node_fork_lower_l_10.userData.sculptComponent = { "id": "fork-lower-l", "name": "Canela da forquilha (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Canela da forquilha (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "hub-front", "contactType": "socket", "localStart": [0.68, 0.325, -0.09], "localEnd": [0.512, 0.62, -0.09], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fork_lower_l_10.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_fork_lower_l_10);
  nodes["fork-lower-l"] = node_fork_lower_l_10;
  const mesh_fork_lower_l_10Geometry = endpoint_fork_lower_l_10 ? new THREE.CylinderGeometry(endpoint_fork_lower_l_10.endRadius, endpoint_fork_lower_l_10.baseRadius, endpoint_fork_lower_l_10.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_fork_lower_l_10) {
    mesh_fork_lower_l_10Geometry.scale(1, 1, 1);
  }
  const mesh_fork_lower_l_10 = new THREE.Mesh(
    mesh_fork_lower_l_10Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_fork_lower_l_10.name = "Canela da forquilha (l)";
  if (endpoint_fork_lower_l_10) {
    mesh_fork_lower_l_10.position.copy(endpoint_fork_lower_l_10.midpoint);
    mesh_fork_lower_l_10.quaternion.copy(endpoint_fork_lower_l_10.quaternion);
  }
  mesh_fork_lower_l_10.castShadow = options.castShadow ?? true;
  mesh_fork_lower_l_10.receiveShadow = options.receiveShadow ?? true;
  mesh_fork_lower_l_10.userData.sculptComponent = { "id": "fork-lower-l", "name": "Canela da forquilha (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Canela da forquilha (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "hub-front", "contactType": "socket", "localStart": [0.68, 0.325, -0.09], "localEnd": [0.512, 0.62, -0.09], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fork_lower_l_10.add(mesh_fork_lower_l_10);
  meshes["fork-lower-l"] = mesh_fork_lower_l_10;
  colliders["fork-lower-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_fork_lower_l_10);
  const attachment_fork_gaiter_l_11 = { "parentSocket": "fork-lower-l", "contactType": "overlap", "localStart": [0.512, 0.62, -0.09], "localEnd": [0.338, 0.924, -0.09], "baseRadius": 0.038, "endRadius": 0.038, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_fork_gaiter_l_11 = makeAttachmentEndpoint(attachment_fork_gaiter_l_11);
  const node_fork_gaiter_l_11 = new THREE.Group();
  node_fork_gaiter_l_11.name = "Sanfona da forquilha (l)__pivot";
  node_fork_gaiter_l_11.scale.set(1, 1, 1);
  if (endpoint_fork_gaiter_l_11) {
    node_fork_gaiter_l_11.position.copy(endpoint_fork_gaiter_l_11.start);
    node_fork_gaiter_l_11.rotation.set(0, 0, 0);
  } else {
    node_fork_gaiter_l_11.position.set(0, 0, 0);
    node_fork_gaiter_l_11.rotation.set(0, 0, 0);
  }
  node_fork_gaiter_l_11.userData.sculptComponent = { "id": "fork-gaiter-l", "name": "Sanfona da forquilha (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manga cilindrica; pregas descritas em localFeatures (aproximacao sem stack de toros).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fork-lower-l", "contactType": "overlap", "localStart": [0.512, 0.62, -0.09], "localEnd": [0.338, 0.924, -0.09], "baseRadius": 0.038, "endRadius": 0.038, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-pleats-l", "kind": "ridge", "description": "~10 pregas de fole (aproximadas pelo material rugoso)" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fork_gaiter_l_11.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_fork_gaiter_l_11);
  nodes["fork-gaiter-l"] = node_fork_gaiter_l_11;
  const mesh_fork_gaiter_l_11Geometry = endpoint_fork_gaiter_l_11 ? new THREE.CylinderGeometry(endpoint_fork_gaiter_l_11.endRadius, endpoint_fork_gaiter_l_11.baseRadius, endpoint_fork_gaiter_l_11.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_fork_gaiter_l_11) {
    mesh_fork_gaiter_l_11Geometry.scale(1, 1, 1);
  }
  const mesh_fork_gaiter_l_11 = new THREE.Mesh(
    mesh_fork_gaiter_l_11Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_fork_gaiter_l_11.name = "Sanfona da forquilha (l)";
  if (endpoint_fork_gaiter_l_11) {
    mesh_fork_gaiter_l_11.position.copy(endpoint_fork_gaiter_l_11.midpoint);
    mesh_fork_gaiter_l_11.quaternion.copy(endpoint_fork_gaiter_l_11.quaternion);
  }
  mesh_fork_gaiter_l_11.castShadow = options.castShadow ?? true;
  mesh_fork_gaiter_l_11.receiveShadow = options.receiveShadow ?? true;
  mesh_fork_gaiter_l_11.userData.sculptComponent = { "id": "fork-gaiter-l", "name": "Sanfona da forquilha (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manga cilindrica; pregas descritas em localFeatures (aproximacao sem stack de toros).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fork-lower-l", "contactType": "overlap", "localStart": [0.512, 0.62, -0.09], "localEnd": [0.338, 0.924, -0.09], "baseRadius": 0.038, "endRadius": 0.038, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-pleats-l", "kind": "ridge", "description": "~10 pregas de fole (aproximadas pelo material rugoso)" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fork_gaiter_l_11.add(mesh_fork_gaiter_l_11);
  meshes["fork-gaiter-l"] = mesh_fork_gaiter_l_11;
  colliders["fork-gaiter-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_fork_gaiter_l_11);
  const attachment_triple_clamp_12 = { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [0.31, 0.965, 0], "localEnd": [0.31, 0.965, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_triple_clamp_12 = makeAttachmentEndpoint(attachment_triple_clamp_12);
  const node_triple_clamp_12 = new THREE.Group();
  node_triple_clamp_12.name = "Mesa da direcao__pivot";
  node_triple_clamp_12.scale.set(1, 1, 1);
  if (endpoint_triple_clamp_12) {
    node_triple_clamp_12.position.copy(endpoint_triple_clamp_12.start);
    node_triple_clamp_12.rotation.set(0, 0, 0.52);
  } else {
    node_triple_clamp_12.position.set(0.31, 0.965, 0);
    node_triple_clamp_12.rotation.set(0, 0, 0.52);
  }
  node_triple_clamp_12.userData.sculptComponent = { "id": "triple-clamp", "name": "Mesa da direcao", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Mesa da direcao.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [0.31, 0.965, 0], "localEnd": [0.31, 0.965, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.15, "height": 0.07, "depth": 0.24, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.31, 0.965, 0], "rotation": [0, 0, 0.52] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_triple_clamp_12.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_triple_clamp_12);
  nodes["triple-clamp"] = node_triple_clamp_12;
  const mesh_triple_clamp_12Geometry = endpoint_triple_clamp_12 ? new THREE.CylinderGeometry(endpoint_triple_clamp_12.endRadius, endpoint_triple_clamp_12.baseRadius, endpoint_triple_clamp_12.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_triple_clamp_12) {
    mesh_triple_clamp_12Geometry.scale(0.15, 0.07, 0.24);
  }
  const mesh_triple_clamp_12 = new THREE.Mesh(
    mesh_triple_clamp_12Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_triple_clamp_12.name = "Mesa da direcao";
  if (endpoint_triple_clamp_12) {
    mesh_triple_clamp_12.position.copy(endpoint_triple_clamp_12.midpoint);
    mesh_triple_clamp_12.quaternion.copy(endpoint_triple_clamp_12.quaternion);
  }
  mesh_triple_clamp_12.castShadow = options.castShadow ?? true;
  mesh_triple_clamp_12.receiveShadow = options.receiveShadow ?? true;
  mesh_triple_clamp_12.userData.sculptComponent = { "id": "triple-clamp", "name": "Mesa da direcao", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Mesa da direcao.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [0.31, 0.965, 0], "localEnd": [0.31, 0.965, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.15, "height": 0.07, "depth": 0.24, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.31, 0.965, 0], "rotation": [0, 0, 0.52] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_triple_clamp_12.add(mesh_triple_clamp_12);
  meshes["triple-clamp"] = mesh_triple_clamp_12;
  colliders["triple-clamp"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_triple_clamp_12);
  const attachment_handlebar_13 = { "parentSocket": "triple-clamp", "contactType": "socket", "localStart": [0.26, 1.045, -0.32], "localEnd": [0.26, 1.045, 0.32], "baseRadius": 0.013, "endRadius": 0.013, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_handlebar_13 = makeAttachmentEndpoint(attachment_handlebar_13);
  const node_handlebar_13 = new THREE.Group();
  node_handlebar_13.name = "Guiador__pivot";
  node_handlebar_13.scale.set(1, 1, 1);
  if (endpoint_handlebar_13) {
    node_handlebar_13.position.copy(endpoint_handlebar_13.start);
    node_handlebar_13.rotation.set(0, 0, 0);
  } else {
    node_handlebar_13.position.set(0, 0, 0);
    node_handlebar_13.rotation.set(0, 0, 0);
  }
  node_handlebar_13.userData.sculptComponent = { "id": "handlebar", "name": "Guiador", "level": "macro", "role": "structure", "importance": 0.9, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Guiador.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "triple-clamp", "contactType": "socket", "localStart": [0.26, 1.045, -0.32], "localEnd": [0.26, 1.045, 0.32], "baseRadius": 0.013, "endRadius": 0.013, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_handlebar_13.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_handlebar_13);
  nodes["handlebar"] = node_handlebar_13;
  const mesh_handlebar_13Geometry = endpoint_handlebar_13 ? new THREE.CylinderGeometry(endpoint_handlebar_13.endRadius, endpoint_handlebar_13.baseRadius, endpoint_handlebar_13.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_handlebar_13) {
    mesh_handlebar_13Geometry.scale(1, 1, 1);
  }
  const mesh_handlebar_13 = new THREE.Mesh(
    mesh_handlebar_13Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_handlebar_13.name = "Guiador";
  if (endpoint_handlebar_13) {
    mesh_handlebar_13.position.copy(endpoint_handlebar_13.midpoint);
    mesh_handlebar_13.quaternion.copy(endpoint_handlebar_13.quaternion);
  }
  mesh_handlebar_13.castShadow = options.castShadow ?? true;
  mesh_handlebar_13.receiveShadow = options.receiveShadow ?? true;
  mesh_handlebar_13.userData.sculptComponent = { "id": "handlebar", "name": "Guiador", "level": "macro", "role": "structure", "importance": 0.9, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Guiador.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "triple-clamp", "contactType": "socket", "localStart": [0.26, 1.045, -0.32], "localEnd": [0.26, 1.045, 0.32], "baseRadius": 0.013, "endRadius": 0.013, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_handlebar_13.add(mesh_handlebar_13);
  meshes["handlebar"] = mesh_handlebar_13;
  colliders["handlebar"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_handlebar_13);
  const attachment_mirror_stalk_r_14 = { "parentSocket": "handlebar", "contactType": "socket", "localStart": [0.26, 1.05, 0.24], "localEnd": [0.285, 1.21, 0.285], "baseRadius": 7e-3, "endRadius": 7e-3, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_mirror_stalk_r_14 = makeAttachmentEndpoint(attachment_mirror_stalk_r_14);
  const node_mirror_stalk_r_14 = new THREE.Group();
  node_mirror_stalk_r_14.name = "Haste do espelho (r)__pivot";
  node_mirror_stalk_r_14.scale.set(1, 1, 1);
  if (endpoint_mirror_stalk_r_14) {
    node_mirror_stalk_r_14.position.copy(endpoint_mirror_stalk_r_14.start);
    node_mirror_stalk_r_14.rotation.set(0, 0, 0);
  } else {
    node_mirror_stalk_r_14.position.set(0, 0, 0);
    node_mirror_stalk_r_14.rotation.set(0, 0, 0);
  }
  node_mirror_stalk_r_14.userData.sculptComponent = { "id": "mirror-stalk-r", "name": "Haste do espelho (r)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Haste do espelho (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "handlebar", "contactType": "socket", "localStart": [0.26, 1.05, 0.24], "localEnd": [0.285, 1.21, 0.285], "baseRadius": 7e-3, "endRadius": 7e-3, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_mirror_stalk_r_14.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_mirror_stalk_r_14);
  nodes["mirror-stalk-r"] = node_mirror_stalk_r_14;
  const mesh_mirror_stalk_r_14Geometry = endpoint_mirror_stalk_r_14 ? new THREE.CylinderGeometry(endpoint_mirror_stalk_r_14.endRadius, endpoint_mirror_stalk_r_14.baseRadius, endpoint_mirror_stalk_r_14.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_mirror_stalk_r_14) {
    mesh_mirror_stalk_r_14Geometry.scale(1, 1, 1);
  }
  const mesh_mirror_stalk_r_14 = new THREE.Mesh(
    mesh_mirror_stalk_r_14Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_mirror_stalk_r_14.name = "Haste do espelho (r)";
  if (endpoint_mirror_stalk_r_14) {
    mesh_mirror_stalk_r_14.position.copy(endpoint_mirror_stalk_r_14.midpoint);
    mesh_mirror_stalk_r_14.quaternion.copy(endpoint_mirror_stalk_r_14.quaternion);
  }
  mesh_mirror_stalk_r_14.castShadow = options.castShadow ?? true;
  mesh_mirror_stalk_r_14.receiveShadow = options.receiveShadow ?? true;
  mesh_mirror_stalk_r_14.userData.sculptComponent = { "id": "mirror-stalk-r", "name": "Haste do espelho (r)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Haste do espelho (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "handlebar", "contactType": "socket", "localStart": [0.26, 1.05, 0.24], "localEnd": [0.285, 1.21, 0.285], "baseRadius": 7e-3, "endRadius": 7e-3, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_mirror_stalk_r_14.add(mesh_mirror_stalk_r_14);
  meshes["mirror-stalk-r"] = mesh_mirror_stalk_r_14;
  colliders["mirror-stalk-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_mirror_stalk_r_14);
  const attachment_mirror_r_15 = { "parentSocket": "mirror-stalk-r", "contactType": "socket", "localStart": [0.285, 1.235, 0.29], "localEnd": [0.285, 1.235, 0.29], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_mirror_r_15 = makeAttachmentEndpoint(attachment_mirror_r_15);
  const node_mirror_r_15 = new THREE.Group();
  node_mirror_r_15.name = "Espelho retrovisor (r)__pivot";
  node_mirror_r_15.scale.set(1, 1, 1);
  if (endpoint_mirror_r_15) {
    node_mirror_r_15.position.copy(endpoint_mirror_r_15.start);
    node_mirror_r_15.rotation.set(0, 0.35, 0.1);
  } else {
    node_mirror_r_15.position.set(0.285, 1.235, 0.29);
    node_mirror_r_15.rotation.set(0, 0.35, 0.1);
  }
  node_mirror_r_15.userData.sculptComponent = { "id": "mirror-r", "name": "Espelho retrovisor (r)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "ellipsoid", "topologyClass": "assembled-solid", "topologyRationale": "ellipsoid unitario escalado por dimensions para o volume observado de Espelho retrovisor (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "mirror-stalk-r", "contactType": "socket", "localStart": [0.285, 1.235, 0.29], "localEnd": [0.285, 1.235, 0.29], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.105, "height": 0.075, "depth": 0.028, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.285, 1.235, 0.29], "rotation": [0, 0.35, 0.1] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-mirror-face-r", "kind": "gloss", "description": "Face espelhada, rugosidade quase nula" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_mirror_r_15.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_mirror_r_15);
  nodes["mirror-r"] = node_mirror_r_15;
  const mesh_mirror_r_15Geometry = endpoint_mirror_r_15 ? new THREE.CylinderGeometry(endpoint_mirror_r_15.endRadius, endpoint_mirror_r_15.baseRadius, endpoint_mirror_r_15.length, 16, 6) : new THREE.SphereGeometry(0.5, 32, 20);
  if (!endpoint_mirror_r_15) {
    mesh_mirror_r_15Geometry.scale(0.105, 0.075, 0.028);
  }
  const mesh_mirror_r_15 = new THREE.Mesh(
    mesh_mirror_r_15Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_mirror_r_15.name = "Espelho retrovisor (r)";
  if (endpoint_mirror_r_15) {
    mesh_mirror_r_15.position.copy(endpoint_mirror_r_15.midpoint);
    mesh_mirror_r_15.quaternion.copy(endpoint_mirror_r_15.quaternion);
  }
  mesh_mirror_r_15.castShadow = options.castShadow ?? true;
  mesh_mirror_r_15.receiveShadow = options.receiveShadow ?? true;
  mesh_mirror_r_15.userData.sculptComponent = { "id": "mirror-r", "name": "Espelho retrovisor (r)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "ellipsoid", "topologyClass": "assembled-solid", "topologyRationale": "ellipsoid unitario escalado por dimensions para o volume observado de Espelho retrovisor (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "mirror-stalk-r", "contactType": "socket", "localStart": [0.285, 1.235, 0.29], "localEnd": [0.285, 1.235, 0.29], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.105, "height": 0.075, "depth": 0.028, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.285, 1.235, 0.29], "rotation": [0, 0.35, 0.1] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-mirror-face-r", "kind": "gloss", "description": "Face espelhada, rugosidade quase nula" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_mirror_r_15.add(mesh_mirror_r_15);
  meshes["mirror-r"] = mesh_mirror_r_15;
  colliders["mirror-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_mirror_r_15);
  const attachment_mirror_stalk_l_16 = { "parentSocket": "handlebar", "contactType": "socket", "localStart": [0.26, 1.05, -0.24], "localEnd": [0.285, 1.21, -0.285], "baseRadius": 7e-3, "endRadius": 7e-3, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_mirror_stalk_l_16 = makeAttachmentEndpoint(attachment_mirror_stalk_l_16);
  const node_mirror_stalk_l_16 = new THREE.Group();
  node_mirror_stalk_l_16.name = "Haste do espelho (l)__pivot";
  node_mirror_stalk_l_16.scale.set(1, 1, 1);
  if (endpoint_mirror_stalk_l_16) {
    node_mirror_stalk_l_16.position.copy(endpoint_mirror_stalk_l_16.start);
    node_mirror_stalk_l_16.rotation.set(0, 0, 0);
  } else {
    node_mirror_stalk_l_16.position.set(0, 0, 0);
    node_mirror_stalk_l_16.rotation.set(0, 0, 0);
  }
  node_mirror_stalk_l_16.userData.sculptComponent = { "id": "mirror-stalk-l", "name": "Haste do espelho (l)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Haste do espelho (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "handlebar", "contactType": "socket", "localStart": [0.26, 1.05, -0.24], "localEnd": [0.285, 1.21, -0.285], "baseRadius": 7e-3, "endRadius": 7e-3, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_mirror_stalk_l_16.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_mirror_stalk_l_16);
  nodes["mirror-stalk-l"] = node_mirror_stalk_l_16;
  const mesh_mirror_stalk_l_16Geometry = endpoint_mirror_stalk_l_16 ? new THREE.CylinderGeometry(endpoint_mirror_stalk_l_16.endRadius, endpoint_mirror_stalk_l_16.baseRadius, endpoint_mirror_stalk_l_16.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_mirror_stalk_l_16) {
    mesh_mirror_stalk_l_16Geometry.scale(1, 1, 1);
  }
  const mesh_mirror_stalk_l_16 = new THREE.Mesh(
    mesh_mirror_stalk_l_16Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_mirror_stalk_l_16.name = "Haste do espelho (l)";
  if (endpoint_mirror_stalk_l_16) {
    mesh_mirror_stalk_l_16.position.copy(endpoint_mirror_stalk_l_16.midpoint);
    mesh_mirror_stalk_l_16.quaternion.copy(endpoint_mirror_stalk_l_16.quaternion);
  }
  mesh_mirror_stalk_l_16.castShadow = options.castShadow ?? true;
  mesh_mirror_stalk_l_16.receiveShadow = options.receiveShadow ?? true;
  mesh_mirror_stalk_l_16.userData.sculptComponent = { "id": "mirror-stalk-l", "name": "Haste do espelho (l)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Haste do espelho (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "handlebar", "contactType": "socket", "localStart": [0.26, 1.05, -0.24], "localEnd": [0.285, 1.21, -0.285], "baseRadius": 7e-3, "endRadius": 7e-3, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_mirror_stalk_l_16.add(mesh_mirror_stalk_l_16);
  meshes["mirror-stalk-l"] = mesh_mirror_stalk_l_16;
  colliders["mirror-stalk-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_mirror_stalk_l_16);
  const attachment_mirror_l_17 = { "parentSocket": "mirror-stalk-l", "contactType": "socket", "localStart": [0.285, 1.235, -0.29], "localEnd": [0.285, 1.235, -0.29], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_mirror_l_17 = makeAttachmentEndpoint(attachment_mirror_l_17);
  const node_mirror_l_17 = new THREE.Group();
  node_mirror_l_17.name = "Espelho retrovisor (l)__pivot";
  node_mirror_l_17.scale.set(1, 1, 1);
  if (endpoint_mirror_l_17) {
    node_mirror_l_17.position.copy(endpoint_mirror_l_17.start);
    node_mirror_l_17.rotation.set(0, -0.35, 0.1);
  } else {
    node_mirror_l_17.position.set(0.285, 1.235, -0.29);
    node_mirror_l_17.rotation.set(0, -0.35, 0.1);
  }
  node_mirror_l_17.userData.sculptComponent = { "id": "mirror-l", "name": "Espelho retrovisor (l)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "ellipsoid", "topologyClass": "assembled-solid", "topologyRationale": "ellipsoid unitario escalado por dimensions para o volume observado de Espelho retrovisor (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "mirror-stalk-l", "contactType": "socket", "localStart": [0.285, 1.235, -0.29], "localEnd": [0.285, 1.235, -0.29], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.105, "height": 0.075, "depth": 0.028, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.285, 1.235, -0.29], "rotation": [0, -0.35, 0.1] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_mirror_l_17.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_mirror_l_17);
  nodes["mirror-l"] = node_mirror_l_17;
  const mesh_mirror_l_17Geometry = endpoint_mirror_l_17 ? new THREE.CylinderGeometry(endpoint_mirror_l_17.endRadius, endpoint_mirror_l_17.baseRadius, endpoint_mirror_l_17.length, 16, 6) : new THREE.SphereGeometry(0.5, 32, 20);
  if (!endpoint_mirror_l_17) {
    mesh_mirror_l_17Geometry.scale(0.105, 0.075, 0.028);
  }
  const mesh_mirror_l_17 = new THREE.Mesh(
    mesh_mirror_l_17Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_mirror_l_17.name = "Espelho retrovisor (l)";
  if (endpoint_mirror_l_17) {
    mesh_mirror_l_17.position.copy(endpoint_mirror_l_17.midpoint);
    mesh_mirror_l_17.quaternion.copy(endpoint_mirror_l_17.quaternion);
  }
  mesh_mirror_l_17.castShadow = options.castShadow ?? true;
  mesh_mirror_l_17.receiveShadow = options.receiveShadow ?? true;
  mesh_mirror_l_17.userData.sculptComponent = { "id": "mirror-l", "name": "Espelho retrovisor (l)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "ellipsoid", "topologyClass": "assembled-solid", "topologyRationale": "ellipsoid unitario escalado por dimensions para o volume observado de Espelho retrovisor (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "mirror-stalk-l", "contactType": "socket", "localStart": [0.285, 1.235, -0.29], "localEnd": [0.285, 1.235, -0.29], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.105, "height": 0.075, "depth": 0.028, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.285, 1.235, -0.29], "rotation": [0, -0.35, 0.1] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_mirror_l_17.add(mesh_mirror_l_17);
  meshes["mirror-l"] = mesh_mirror_l_17;
  colliders["mirror-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_mirror_l_17);
  const attachment_headlight_cowl_18 = { "parentSocket": "triple-clamp", "contactType": "overlap", "localStart": [0.4, 0.95, 0], "localEnd": [0.4, 0.95, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_headlight_cowl_18 = makeAttachmentEndpoint(attachment_headlight_cowl_18);
  const node_headlight_cowl_18 = new THREE.Group();
  node_headlight_cowl_18.name = "Carenagem do farol__pivot";
  node_headlight_cowl_18.scale.set(1, 1, 1);
  if (endpoint_headlight_cowl_18) {
    node_headlight_cowl_18.position.copy(endpoint_headlight_cowl_18.start);
    node_headlight_cowl_18.rotation.set(0, 0, -0.18);
  } else {
    node_headlight_cowl_18.position.set(0.4, 0.95, 0);
    node_headlight_cowl_18.rotation.set(0, 0, -0.18);
  }
  node_headlight_cowl_18.userData.sculptComponent = { "id": "headlight-cowl", "name": "Carenagem do farol", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Carenagem do farol.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "triple-clamp", "contactType": "overlap", "localStart": [0.4, 0.95, 0], "localEnd": [0.4, 0.95, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.17, "height": 0.27, "depth": 0.24, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.4, 0.95, 0], "rotation": [0, 0, -0.18] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-cowl-seam", "kind": "seam", "description": "Costura entre mascara azul e defletor preto" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_headlight_cowl_18.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_headlight_cowl_18);
  nodes["headlight-cowl"] = node_headlight_cowl_18;
  const mesh_headlight_cowl_18Geometry = endpoint_headlight_cowl_18 ? new THREE.CylinderGeometry(endpoint_headlight_cowl_18.endRadius, endpoint_headlight_cowl_18.baseRadius, endpoint_headlight_cowl_18.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_headlight_cowl_18) {
    mesh_headlight_cowl_18Geometry.scale(0.17, 0.27, 0.24);
  }
  const mesh_headlight_cowl_18 = new THREE.Mesh(
    mesh_headlight_cowl_18Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_headlight_cowl_18.name = "Carenagem do farol";
  if (endpoint_headlight_cowl_18) {
    mesh_headlight_cowl_18.position.copy(endpoint_headlight_cowl_18.midpoint);
    mesh_headlight_cowl_18.quaternion.copy(endpoint_headlight_cowl_18.quaternion);
  }
  mesh_headlight_cowl_18.castShadow = options.castShadow ?? true;
  mesh_headlight_cowl_18.receiveShadow = options.receiveShadow ?? true;
  mesh_headlight_cowl_18.userData.sculptComponent = { "id": "headlight-cowl", "name": "Carenagem do farol", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Carenagem do farol.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "triple-clamp", "contactType": "overlap", "localStart": [0.4, 0.95, 0], "localEnd": [0.4, 0.95, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.17, "height": 0.27, "depth": 0.24, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.4, 0.95, 0], "rotation": [0, 0, -0.18] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-cowl-seam", "kind": "seam", "description": "Costura entre mascara azul e defletor preto" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_headlight_cowl_18.add(mesh_headlight_cowl_18);
  meshes["headlight-cowl"] = mesh_headlight_cowl_18;
  colliders["headlight-cowl"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_headlight_cowl_18);
  const attachment_windscreen_19 = { "parentSocket": "headlight-cowl", "contactType": "overlap", "localStart": [0.345, 1.1, 0], "localEnd": [0.345, 1.1, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_windscreen_19 = makeAttachmentEndpoint(attachment_windscreen_19);
  const node_windscreen_19 = new THREE.Group();
  node_windscreen_19.name = "Defletor escuro__pivot";
  node_windscreen_19.scale.set(1, 1, 1);
  if (endpoint_windscreen_19) {
    node_windscreen_19.position.copy(endpoint_windscreen_19.start);
    node_windscreen_19.rotation.set(0, 0, -0.55);
  } else {
    node_windscreen_19.position.set(0.345, 1.1, 0);
    node_windscreen_19.rotation.set(0, 0, -0.55);
  }
  node_windscreen_19.userData.sculptComponent = { "id": "windscreen", "name": "Defletor escuro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Defletor escuro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "headlight-cowl", "contactType": "overlap", "localStart": [0.345, 1.1, 0], "localEnd": [0.345, 1.1, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.03, "height": 0.15, "depth": 0.2, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.345, 1.1, 0], "rotation": [0, 0, -0.55] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_windscreen_19.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_windscreen_19);
  nodes["windscreen"] = node_windscreen_19;
  const mesh_windscreen_19Geometry = endpoint_windscreen_19 ? new THREE.CylinderGeometry(endpoint_windscreen_19.endRadius, endpoint_windscreen_19.baseRadius, endpoint_windscreen_19.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_windscreen_19) {
    mesh_windscreen_19Geometry.scale(0.03, 0.15, 0.2);
  }
  const mesh_windscreen_19 = new THREE.Mesh(
    mesh_windscreen_19Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_windscreen_19.name = "Defletor escuro";
  if (endpoint_windscreen_19) {
    mesh_windscreen_19.position.copy(endpoint_windscreen_19.midpoint);
    mesh_windscreen_19.quaternion.copy(endpoint_windscreen_19.quaternion);
  }
  mesh_windscreen_19.castShadow = options.castShadow ?? true;
  mesh_windscreen_19.receiveShadow = options.receiveShadow ?? true;
  mesh_windscreen_19.userData.sculptComponent = { "id": "windscreen", "name": "Defletor escuro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Defletor escuro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "headlight-cowl", "contactType": "overlap", "localStart": [0.345, 1.1, 0], "localEnd": [0.345, 1.1, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.03, "height": 0.15, "depth": 0.2, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.345, 1.1, 0], "rotation": [0, 0, -0.55] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_windscreen_19.add(mesh_windscreen_19);
  meshes["windscreen"] = mesh_windscreen_19;
  colliders["windscreen"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_windscreen_19);
  const attachment_headlight_20 = { "parentSocket": "headlight-cowl", "contactType": "embed", "localStart": [0.487, 0.93, 0], "localEnd": [0.487, 0.93, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_headlight_20 = makeAttachmentEndpoint(attachment_headlight_20);
  const node_headlight_20 = new THREE.Group();
  node_headlight_20.name = "Farol retangular__pivot";
  node_headlight_20.scale.set(1, 1, 1);
  if (endpoint_headlight_20) {
    node_headlight_20.position.copy(endpoint_headlight_20.start);
    node_headlight_20.rotation.set(0, 0, -0.18);
  } else {
    node_headlight_20.position.set(0.487, 0.93, 0);
    node_headlight_20.rotation.set(0, 0, -0.18);
  }
  node_headlight_20.userData.sculptComponent = { "id": "headlight", "name": "Farol retangular", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Farol retangular.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "headlight-cowl", "contactType": "embed", "localStart": [0.487, 0.93, 0], "localEnd": [0.487, 0.93, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.03, "height": 0.12, "depth": 0.15, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.487, 0.93, 0], "rotation": [0, 0, -0.18] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-headlight"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-lens", "kind": "gloss", "description": "Lente retangular, leve emissivo" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-headlight", "colorMaterialRecipe": { "dominantAlbedo": "rgba(248, 250, 252, 1.0)", "secondaryAlbedo": "rgba(219, 234, 254, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_headlight_20.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_headlight_20);
  nodes["headlight"] = node_headlight_20;
  const mesh_headlight_20Geometry = endpoint_headlight_20 ? new THREE.CylinderGeometry(endpoint_headlight_20.endRadius, endpoint_headlight_20.baseRadius, endpoint_headlight_20.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_headlight_20) {
    mesh_headlight_20Geometry.scale(0.03, 0.12, 0.15);
  }
  const mesh_headlight_20 = new THREE.Mesh(
    mesh_headlight_20Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_headlight_20.name = "Farol retangular";
  if (endpoint_headlight_20) {
    mesh_headlight_20.position.copy(endpoint_headlight_20.midpoint);
    mesh_headlight_20.quaternion.copy(endpoint_headlight_20.quaternion);
  }
  mesh_headlight_20.castShadow = options.castShadow ?? true;
  mesh_headlight_20.receiveShadow = options.receiveShadow ?? true;
  mesh_headlight_20.userData.sculptComponent = { "id": "headlight", "name": "Farol retangular", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Farol retangular.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "headlight-cowl", "contactType": "embed", "localStart": [0.487, 0.93, 0], "localEnd": [0.487, 0.93, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.03, "height": 0.12, "depth": 0.15, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.487, 0.93, 0], "rotation": [0, 0, -0.18] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-headlight"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-lens", "kind": "gloss", "description": "Lente retangular, leve emissivo" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-headlight", "colorMaterialRecipe": { "dominantAlbedo": "rgba(248, 250, 252, 1.0)", "secondaryAlbedo": "rgba(219, 234, 254, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_headlight_20.add(mesh_headlight_20);
  meshes["headlight"] = mesh_headlight_20;
  colliders["headlight"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_headlight_20);
  const attachment_front_fender_21 = { "parentSocket": "triple-clamp", "contactType": "overlap", "localStart": [0.6, 0.72, 0], "localEnd": [0.6, 0.72, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_front_fender_21 = makeAttachmentEndpoint(attachment_front_fender_21);
  const node_front_fender_21 = new THREE.Group();
  node_front_fender_21.name = "Para-lama dianteiro alto__pivot";
  node_front_fender_21.scale.set(1, 1, 1);
  if (endpoint_front_fender_21) {
    node_front_fender_21.position.copy(endpoint_front_fender_21.start);
    node_front_fender_21.rotation.set(0, 0, -0.24);
  } else {
    node_front_fender_21.position.set(0.6, 0.72, 0);
    node_front_fender_21.rotation.set(0, 0, -0.24);
  }
  node_front_fender_21.userData.sculptComponent = { "id": "front-fender", "name": "Para-lama dianteiro alto", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "ellipsoid", "topologyClass": "continuous-sculpt", "topologyRationale": "Elipsoide achatado le como a concha lofted do para-lama alto; aproximacao do perfil varrido real.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "triple-clamp", "contactType": "overlap", "localStart": [0.6, 0.72, 0], "localEnd": [0.6, 0.72, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.7, "height": 0.14, "depth": 0.24, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.6, 0.72, 0], "rotation": [0, 0, -0.24] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_front_fender_21.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_front_fender_21);
  nodes["front-fender"] = node_front_fender_21;
  const mesh_front_fender_21Geometry = endpoint_front_fender_21 ? new THREE.CylinderGeometry(endpoint_front_fender_21.endRadius, endpoint_front_fender_21.baseRadius, endpoint_front_fender_21.length, 16, 6) : new THREE.SphereGeometry(0.5, 32, 20);
  if (!endpoint_front_fender_21) {
    mesh_front_fender_21Geometry.scale(0.7, 0.14, 0.24);
  }
  const mesh_front_fender_21 = new THREE.Mesh(
    mesh_front_fender_21Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_front_fender_21.name = "Para-lama dianteiro alto";
  if (endpoint_front_fender_21) {
    mesh_front_fender_21.position.copy(endpoint_front_fender_21.midpoint);
    mesh_front_fender_21.quaternion.copy(endpoint_front_fender_21.quaternion);
  }
  mesh_front_fender_21.castShadow = options.castShadow ?? true;
  mesh_front_fender_21.receiveShadow = options.receiveShadow ?? true;
  mesh_front_fender_21.userData.sculptComponent = { "id": "front-fender", "name": "Para-lama dianteiro alto", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "ellipsoid", "topologyClass": "continuous-sculpt", "topologyRationale": "Elipsoide achatado le como a concha lofted do para-lama alto; aproximacao do perfil varrido real.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "triple-clamp", "contactType": "overlap", "localStart": [0.6, 0.72, 0], "localEnd": [0.6, 0.72, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.7, "height": 0.14, "depth": 0.24, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.6, 0.72, 0], "rotation": [0, 0, -0.24] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_front_fender_21.add(mesh_front_fender_21);
  meshes["front-fender"] = mesh_front_fender_21;
  colliders["front-fender"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_front_fender_21);
  const attachment_fuel_tank_22 = { "parentSocket": "frame-spine", "contactType": "overlap", "localStart": [0.1, 0.82, 0], "localEnd": [0.1, 0.82, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_fuel_tank_22 = makeAttachmentEndpoint(attachment_fuel_tank_22);
  const node_fuel_tank_22 = new THREE.Group();
  node_fuel_tank_22.name = "Tanque de combustivel__pivot";
  node_fuel_tank_22.scale.set(1, 1, 1);
  if (endpoint_fuel_tank_22) {
    node_fuel_tank_22.position.copy(endpoint_fuel_tank_22.start);
    node_fuel_tank_22.rotation.set(0, 0, -0.06);
  } else {
    node_fuel_tank_22.position.set(0.1, 0.82, 0);
    node_fuel_tank_22.rotation.set(0, 0, -0.06);
  }
  node_fuel_tank_22.userData.sculptComponent = { "id": "fuel-tank", "name": "Tanque de combustivel", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "ellipsoid", "topologyClass": "continuous-sculpt", "topologyRationale": "ellipsoid unitario escalado por dimensions para o volume observado de Tanque de combustivel.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "overlap", "localStart": [0.1, 0.82, 0], "localEnd": [0.1, 0.82, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.62, "height": 0.28, "depth": 0.34, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.1, 0.82, 0], "rotation": [0, 0, -0.06] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-knee-recess", "kind": "contour", "description": "Recortes de joelho; concha estreita para o banco" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fuel_tank_22.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_fuel_tank_22);
  nodes["fuel-tank"] = node_fuel_tank_22;
  const mesh_fuel_tank_22Geometry = endpoint_fuel_tank_22 ? new THREE.CylinderGeometry(endpoint_fuel_tank_22.endRadius, endpoint_fuel_tank_22.baseRadius, endpoint_fuel_tank_22.length, 16, 6) : new THREE.SphereGeometry(0.5, 32, 20);
  if (!endpoint_fuel_tank_22) {
    mesh_fuel_tank_22Geometry.scale(0.62, 0.28, 0.34);
  }
  const mesh_fuel_tank_22 = new THREE.Mesh(
    mesh_fuel_tank_22Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_fuel_tank_22.name = "Tanque de combustivel";
  if (endpoint_fuel_tank_22) {
    mesh_fuel_tank_22.position.copy(endpoint_fuel_tank_22.midpoint);
    mesh_fuel_tank_22.quaternion.copy(endpoint_fuel_tank_22.quaternion);
  }
  mesh_fuel_tank_22.castShadow = options.castShadow ?? true;
  mesh_fuel_tank_22.receiveShadow = options.receiveShadow ?? true;
  mesh_fuel_tank_22.userData.sculptComponent = { "id": "fuel-tank", "name": "Tanque de combustivel", "level": "macro", "role": "structure", "importance": 1, "confidence": 0.8, "primitive": "ellipsoid", "topologyClass": "continuous-sculpt", "topologyRationale": "ellipsoid unitario escalado por dimensions para o volume observado de Tanque de combustivel.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "overlap", "localStart": [0.1, 0.82, 0], "localEnd": [0.1, 0.82, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.62, "height": 0.28, "depth": 0.34, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.1, 0.82, 0], "rotation": [0, 0, -0.06] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-knee-recess", "kind": "contour", "description": "Recortes de joelho; concha estreita para o banco" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_fuel_tank_22.add(mesh_fuel_tank_22);
  meshes["fuel-tank"] = mesh_fuel_tank_22;
  colliders["fuel-tank"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_fuel_tank_22);
  const attachment_shroud_r_23 = { "parentSocket": "fuel-tank", "contactType": "overlap", "localStart": [0.28, 0.76, 0.17], "localEnd": [0.28, 0.76, 0.17], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_shroud_r_23 = makeAttachmentEndpoint(attachment_shroud_r_23);
  const node_shroud_r_23 = new THREE.Group();
  node_shroud_r_23.name = "Aba lateral do tanque (r)__pivot";
  node_shroud_r_23.scale.set(1, 1, 1);
  if (endpoint_shroud_r_23) {
    node_shroud_r_23.position.copy(endpoint_shroud_r_23.start);
    node_shroud_r_23.rotation.set(0, 0.3, 0.15);
  } else {
    node_shroud_r_23.position.set(0.28, 0.76, 0.17);
    node_shroud_r_23.rotation.set(0, 0.3, 0.15);
  }
  node_shroud_r_23.userData.sculptComponent = { "id": "shroud-r", "name": "Aba lateral do tanque (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Aba lateral do tanque (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fuel-tank", "contactType": "overlap", "localStart": [0.28, 0.76, 0.17], "localEnd": [0.28, 0.76, 0.17], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.22, "height": 0.2, "depth": 0.03, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.28, 0.76, 0.17], "rotation": [0, 0.3, 0.15] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_shroud_r_23.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_shroud_r_23);
  nodes["shroud-r"] = node_shroud_r_23;
  const mesh_shroud_r_23Geometry = endpoint_shroud_r_23 ? new THREE.CylinderGeometry(endpoint_shroud_r_23.endRadius, endpoint_shroud_r_23.baseRadius, endpoint_shroud_r_23.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_shroud_r_23) {
    mesh_shroud_r_23Geometry.scale(0.22, 0.2, 0.03);
  }
  const mesh_shroud_r_23 = new THREE.Mesh(
    mesh_shroud_r_23Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_shroud_r_23.name = "Aba lateral do tanque (r)";
  if (endpoint_shroud_r_23) {
    mesh_shroud_r_23.position.copy(endpoint_shroud_r_23.midpoint);
    mesh_shroud_r_23.quaternion.copy(endpoint_shroud_r_23.quaternion);
  }
  mesh_shroud_r_23.castShadow = options.castShadow ?? true;
  mesh_shroud_r_23.receiveShadow = options.receiveShadow ?? true;
  mesh_shroud_r_23.userData.sculptComponent = { "id": "shroud-r", "name": "Aba lateral do tanque (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Aba lateral do tanque (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fuel-tank", "contactType": "overlap", "localStart": [0.28, 0.76, 0.17], "localEnd": [0.28, 0.76, 0.17], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.22, "height": 0.2, "depth": 0.03, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.28, 0.76, 0.17], "rotation": [0, 0.3, 0.15] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_shroud_r_23.add(mesh_shroud_r_23);
  meshes["shroud-r"] = mesh_shroud_r_23;
  colliders["shroud-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_shroud_r_23);
  const attachment_shroud_l_24 = { "parentSocket": "fuel-tank", "contactType": "overlap", "localStart": [0.28, 0.76, -0.17], "localEnd": [0.28, 0.76, -0.17], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_shroud_l_24 = makeAttachmentEndpoint(attachment_shroud_l_24);
  const node_shroud_l_24 = new THREE.Group();
  node_shroud_l_24.name = "Aba lateral do tanque (l)__pivot";
  node_shroud_l_24.scale.set(1, 1, 1);
  if (endpoint_shroud_l_24) {
    node_shroud_l_24.position.copy(endpoint_shroud_l_24.start);
    node_shroud_l_24.rotation.set(0, -0.3, 0.15);
  } else {
    node_shroud_l_24.position.set(0.28, 0.76, -0.17);
    node_shroud_l_24.rotation.set(0, -0.3, 0.15);
  }
  node_shroud_l_24.userData.sculptComponent = { "id": "shroud-l", "name": "Aba lateral do tanque (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Aba lateral do tanque (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fuel-tank", "contactType": "overlap", "localStart": [0.28, 0.76, -0.17], "localEnd": [0.28, 0.76, -0.17], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.22, "height": 0.2, "depth": 0.03, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.28, 0.76, -0.17], "rotation": [0, -0.3, 0.15] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_shroud_l_24.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_shroud_l_24);
  nodes["shroud-l"] = node_shroud_l_24;
  const mesh_shroud_l_24Geometry = endpoint_shroud_l_24 ? new THREE.CylinderGeometry(endpoint_shroud_l_24.endRadius, endpoint_shroud_l_24.baseRadius, endpoint_shroud_l_24.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_shroud_l_24) {
    mesh_shroud_l_24Geometry.scale(0.22, 0.2, 0.03);
  }
  const mesh_shroud_l_24 = new THREE.Mesh(
    mesh_shroud_l_24Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_shroud_l_24.name = "Aba lateral do tanque (l)";
  if (endpoint_shroud_l_24) {
    mesh_shroud_l_24.position.copy(endpoint_shroud_l_24.midpoint);
    mesh_shroud_l_24.quaternion.copy(endpoint_shroud_l_24.quaternion);
  }
  mesh_shroud_l_24.castShadow = options.castShadow ?? true;
  mesh_shroud_l_24.receiveShadow = options.receiveShadow ?? true;
  mesh_shroud_l_24.userData.sculptComponent = { "id": "shroud-l", "name": "Aba lateral do tanque (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Aba lateral do tanque (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "fuel-tank", "contactType": "overlap", "localStart": [0.28, 0.76, -0.17], "localEnd": [0.28, 0.76, -0.17], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.22, "height": 0.2, "depth": 0.03, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.28, 0.76, -0.17], "rotation": [0, -0.3, 0.15] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_shroud_l_24.add(mesh_shroud_l_24);
  meshes["shroud-l"] = mesh_shroud_l_24;
  colliders["shroud-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_shroud_l_24);
  const attachment_seat_25 = { "parentSocket": "frame-spine", "contactType": "overlap", "localStart": [-0.26, 0.8, 0], "localEnd": [-0.26, 0.8, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_seat_25 = makeAttachmentEndpoint(attachment_seat_25);
  const node_seat_25 = new THREE.Group();
  node_seat_25.name = "Banco escalonado (nivel 1)__pivot";
  node_seat_25.scale.set(1, 1, 1);
  if (endpoint_seat_25) {
    node_seat_25.position.copy(endpoint_seat_25.start);
    node_seat_25.rotation.set(0, 0, 0.05);
  } else {
    node_seat_25.position.set(-0.26, 0.8, 0);
    node_seat_25.rotation.set(0, 0, 0.05);
  }
  node_seat_25.userData.sculptComponent = { "id": "seat", "name": "Banco escalonado (nivel 1)", "level": "macro", "role": "structure", "importance": 0.9, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Banco escalonado (nivel 1).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "overlap", "localStart": [-0.26, 0.8, 0], "localEnd": [-0.26, 0.8, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.52, "height": 0.07, "depth": 0.26, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.26, 0.8, 0], "rotation": [0, 0, 0.05] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-seat"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-seat", "colorMaterialRecipe": { "dominantAlbedo": "rgba(16, 17, 20, 1.0)", "secondaryAlbedo": "rgba(28, 29, 33, 1.0)", "materialClass": "fabric", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_seat_25.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_seat_25);
  nodes["seat"] = node_seat_25;
  const mesh_seat_25Geometry = endpoint_seat_25 ? new THREE.CylinderGeometry(endpoint_seat_25.endRadius, endpoint_seat_25.baseRadius, endpoint_seat_25.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_seat_25) {
    mesh_seat_25Geometry.scale(0.52, 0.07, 0.26);
  }
  const mesh_seat_25 = new THREE.Mesh(
    mesh_seat_25Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_seat_25.name = "Banco escalonado (nivel 1)";
  if (endpoint_seat_25) {
    mesh_seat_25.position.copy(endpoint_seat_25.midpoint);
    mesh_seat_25.quaternion.copy(endpoint_seat_25.quaternion);
  }
  mesh_seat_25.castShadow = options.castShadow ?? true;
  mesh_seat_25.receiveShadow = options.receiveShadow ?? true;
  mesh_seat_25.userData.sculptComponent = { "id": "seat", "name": "Banco escalonado (nivel 1)", "level": "macro", "role": "structure", "importance": 0.9, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Banco escalonado (nivel 1).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "overlap", "localStart": [-0.26, 0.8, 0], "localEnd": [-0.26, 0.8, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.52, "height": 0.07, "depth": 0.26, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.26, 0.8, 0], "rotation": [0, 0, 0.05] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-seat"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-seat", "colorMaterialRecipe": { "dominantAlbedo": "rgba(16, 17, 20, 1.0)", "secondaryAlbedo": "rgba(28, 29, 33, 1.0)", "materialClass": "fabric", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_seat_25.add(mesh_seat_25);
  meshes["seat"] = mesh_seat_25;
  colliders["seat"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_seat_25);
  const attachment_seat_pillion_26 = { "parentSocket": "seat", "contactType": "butt", "localStart": [-0.56, 0.865, 0], "localEnd": [-0.56, 0.865, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_seat_pillion_26 = makeAttachmentEndpoint(attachment_seat_pillion_26);
  const node_seat_pillion_26 = new THREE.Group();
  node_seat_pillion_26.name = "Banco escalonado (nivel 2)__pivot";
  node_seat_pillion_26.scale.set(1, 1, 1);
  if (endpoint_seat_pillion_26) {
    node_seat_pillion_26.position.copy(endpoint_seat_pillion_26.start);
    node_seat_pillion_26.rotation.set(0, 0, 0.08);
  } else {
    node_seat_pillion_26.position.set(-0.56, 0.865, 0);
    node_seat_pillion_26.rotation.set(0, 0, 0.08);
  }
  node_seat_pillion_26.userData.sculptComponent = { "id": "seat-pillion", "name": "Banco escalonado (nivel 2)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Banco escalonado (nivel 2).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "seat", "contactType": "butt", "localStart": [-0.56, 0.865, 0], "localEnd": [-0.56, 0.865, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.26, "height": 0.06, "depth": 0.24, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.56, 0.865, 0], "rotation": [0, 0, 0.08] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-seat"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-seat", "colorMaterialRecipe": { "dominantAlbedo": "rgba(16, 17, 20, 1.0)", "secondaryAlbedo": "rgba(28, 29, 33, 1.0)", "materialClass": "fabric", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_seat_pillion_26.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_seat_pillion_26);
  nodes["seat-pillion"] = node_seat_pillion_26;
  const mesh_seat_pillion_26Geometry = endpoint_seat_pillion_26 ? new THREE.CylinderGeometry(endpoint_seat_pillion_26.endRadius, endpoint_seat_pillion_26.baseRadius, endpoint_seat_pillion_26.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_seat_pillion_26) {
    mesh_seat_pillion_26Geometry.scale(0.26, 0.06, 0.24);
  }
  const mesh_seat_pillion_26 = new THREE.Mesh(
    mesh_seat_pillion_26Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_seat_pillion_26.name = "Banco escalonado (nivel 2)";
  if (endpoint_seat_pillion_26) {
    mesh_seat_pillion_26.position.copy(endpoint_seat_pillion_26.midpoint);
    mesh_seat_pillion_26.quaternion.copy(endpoint_seat_pillion_26.quaternion);
  }
  mesh_seat_pillion_26.castShadow = options.castShadow ?? true;
  mesh_seat_pillion_26.receiveShadow = options.receiveShadow ?? true;
  mesh_seat_pillion_26.userData.sculptComponent = { "id": "seat-pillion", "name": "Banco escalonado (nivel 2)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Banco escalonado (nivel 2).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "seat", "contactType": "butt", "localStart": [-0.56, 0.865, 0], "localEnd": [-0.56, 0.865, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.26, "height": 0.06, "depth": 0.24, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.56, 0.865, 0], "rotation": [0, 0, 0.08] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-seat"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-seat", "colorMaterialRecipe": { "dominantAlbedo": "rgba(16, 17, 20, 1.0)", "secondaryAlbedo": "rgba(28, 29, 33, 1.0)", "materialClass": "fabric", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_seat_pillion_26.add(mesh_seat_pillion_26);
  meshes["seat-pillion"] = mesh_seat_pillion_26;
  colliders["seat-pillion"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_seat_pillion_26);
  const attachment_tail_panel_r_27 = { "parentSocket": "seat", "contactType": "overlap", "localStart": [-0.5, 0.7, 0.13], "localEnd": [-0.5, 0.7, 0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_tail_panel_r_27 = makeAttachmentEndpoint(attachment_tail_panel_r_27);
  const node_tail_panel_r_27 = new THREE.Group();
  node_tail_panel_r_27.name = "Painel da rabeta (r)__pivot";
  node_tail_panel_r_27.scale.set(1, 1, 1);
  if (endpoint_tail_panel_r_27) {
    node_tail_panel_r_27.position.copy(endpoint_tail_panel_r_27.start);
    node_tail_panel_r_27.rotation.set(0, 0, 0.32);
  } else {
    node_tail_panel_r_27.position.set(-0.5, 0.7, 0.13);
    node_tail_panel_r_27.rotation.set(0, 0, 0.32);
  }
  node_tail_panel_r_27.userData.sculptComponent = { "id": "tail-panel-r", "name": "Painel da rabeta (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Painel da rabeta (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "seat", "contactType": "overlap", "localStart": [-0.5, 0.7, 0.13], "localEnd": [-0.5, 0.7, 0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.38, "height": 0.17, "depth": 0.03, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.5, 0.7, 0.13], "rotation": [0, 0, 0.32] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_tail_panel_r_27.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_tail_panel_r_27);
  nodes["tail-panel-r"] = node_tail_panel_r_27;
  const mesh_tail_panel_r_27Geometry = endpoint_tail_panel_r_27 ? new THREE.CylinderGeometry(endpoint_tail_panel_r_27.endRadius, endpoint_tail_panel_r_27.baseRadius, endpoint_tail_panel_r_27.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_tail_panel_r_27) {
    mesh_tail_panel_r_27Geometry.scale(0.38, 0.17, 0.03);
  }
  const mesh_tail_panel_r_27 = new THREE.Mesh(
    mesh_tail_panel_r_27Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_tail_panel_r_27.name = "Painel da rabeta (r)";
  if (endpoint_tail_panel_r_27) {
    mesh_tail_panel_r_27.position.copy(endpoint_tail_panel_r_27.midpoint);
    mesh_tail_panel_r_27.quaternion.copy(endpoint_tail_panel_r_27.quaternion);
  }
  mesh_tail_panel_r_27.castShadow = options.castShadow ?? true;
  mesh_tail_panel_r_27.receiveShadow = options.receiveShadow ?? true;
  mesh_tail_panel_r_27.userData.sculptComponent = { "id": "tail-panel-r", "name": "Painel da rabeta (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Painel da rabeta (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "seat", "contactType": "overlap", "localStart": [-0.5, 0.7, 0.13], "localEnd": [-0.5, 0.7, 0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.38, "height": 0.17, "depth": 0.03, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.5, 0.7, 0.13], "rotation": [0, 0, 0.32] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_tail_panel_r_27.add(mesh_tail_panel_r_27);
  meshes["tail-panel-r"] = mesh_tail_panel_r_27;
  colliders["tail-panel-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_tail_panel_r_27);
  const attachment_grab_rail_r_28 = { "parentSocket": "tail-panel-r", "contactType": "socket", "localStart": [-0.42, 0.8, 0.13], "localEnd": [-0.72, 0.885, 0.13], "baseRadius": 0.011, "endRadius": 0.011, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_grab_rail_r_28 = makeAttachmentEndpoint(attachment_grab_rail_r_28);
  const node_grab_rail_r_28 = new THREE.Group();
  node_grab_rail_r_28.name = "Alca de garupa (r)__pivot";
  node_grab_rail_r_28.scale.set(1, 1, 1);
  if (endpoint_grab_rail_r_28) {
    node_grab_rail_r_28.position.copy(endpoint_grab_rail_r_28.start);
    node_grab_rail_r_28.rotation.set(0, 0, 0);
  } else {
    node_grab_rail_r_28.position.set(0, 0, 0);
    node_grab_rail_r_28.rotation.set(0, 0, 0);
  }
  node_grab_rail_r_28.userData.sculptComponent = { "id": "grab-rail-r", "name": "Alca de garupa (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Alca de garupa (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "tail-panel-r", "contactType": "socket", "localStart": [-0.42, 0.8, 0.13], "localEnd": [-0.72, 0.885, 0.13], "baseRadius": 0.011, "endRadius": 0.011, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_grab_rail_r_28.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_grab_rail_r_28);
  nodes["grab-rail-r"] = node_grab_rail_r_28;
  const mesh_grab_rail_r_28Geometry = endpoint_grab_rail_r_28 ? new THREE.CylinderGeometry(endpoint_grab_rail_r_28.endRadius, endpoint_grab_rail_r_28.baseRadius, endpoint_grab_rail_r_28.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_grab_rail_r_28) {
    mesh_grab_rail_r_28Geometry.scale(1, 1, 1);
  }
  const mesh_grab_rail_r_28 = new THREE.Mesh(
    mesh_grab_rail_r_28Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_grab_rail_r_28.name = "Alca de garupa (r)";
  if (endpoint_grab_rail_r_28) {
    mesh_grab_rail_r_28.position.copy(endpoint_grab_rail_r_28.midpoint);
    mesh_grab_rail_r_28.quaternion.copy(endpoint_grab_rail_r_28.quaternion);
  }
  mesh_grab_rail_r_28.castShadow = options.castShadow ?? true;
  mesh_grab_rail_r_28.receiveShadow = options.receiveShadow ?? true;
  mesh_grab_rail_r_28.userData.sculptComponent = { "id": "grab-rail-r", "name": "Alca de garupa (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Alca de garupa (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "tail-panel-r", "contactType": "socket", "localStart": [-0.42, 0.8, 0.13], "localEnd": [-0.72, 0.885, 0.13], "baseRadius": 0.011, "endRadius": 0.011, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_grab_rail_r_28.add(mesh_grab_rail_r_28);
  meshes["grab-rail-r"] = mesh_grab_rail_r_28;
  colliders["grab-rail-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_grab_rail_r_28);
  const attachment_tail_panel_l_29 = { "parentSocket": "seat", "contactType": "overlap", "localStart": [-0.5, 0.7, -0.13], "localEnd": [-0.5, 0.7, -0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_tail_panel_l_29 = makeAttachmentEndpoint(attachment_tail_panel_l_29);
  const node_tail_panel_l_29 = new THREE.Group();
  node_tail_panel_l_29.name = "Painel da rabeta (l)__pivot";
  node_tail_panel_l_29.scale.set(1, 1, 1);
  if (endpoint_tail_panel_l_29) {
    node_tail_panel_l_29.position.copy(endpoint_tail_panel_l_29.start);
    node_tail_panel_l_29.rotation.set(0, 0, 0.32);
  } else {
    node_tail_panel_l_29.position.set(-0.5, 0.7, -0.13);
    node_tail_panel_l_29.rotation.set(0, 0, 0.32);
  }
  node_tail_panel_l_29.userData.sculptComponent = { "id": "tail-panel-l", "name": "Painel da rabeta (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Painel da rabeta (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "seat", "contactType": "overlap", "localStart": [-0.5, 0.7, -0.13], "localEnd": [-0.5, 0.7, -0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.38, "height": 0.17, "depth": 0.03, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.5, 0.7, -0.13], "rotation": [0, 0, 0.32] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_tail_panel_l_29.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_tail_panel_l_29);
  nodes["tail-panel-l"] = node_tail_panel_l_29;
  const mesh_tail_panel_l_29Geometry = endpoint_tail_panel_l_29 ? new THREE.CylinderGeometry(endpoint_tail_panel_l_29.endRadius, endpoint_tail_panel_l_29.baseRadius, endpoint_tail_panel_l_29.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_tail_panel_l_29) {
    mesh_tail_panel_l_29Geometry.scale(0.38, 0.17, 0.03);
  }
  const mesh_tail_panel_l_29 = new THREE.Mesh(
    mesh_tail_panel_l_29Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_tail_panel_l_29.name = "Painel da rabeta (l)";
  if (endpoint_tail_panel_l_29) {
    mesh_tail_panel_l_29.position.copy(endpoint_tail_panel_l_29.midpoint);
    mesh_tail_panel_l_29.quaternion.copy(endpoint_tail_panel_l_29.quaternion);
  }
  mesh_tail_panel_l_29.castShadow = options.castShadow ?? true;
  mesh_tail_panel_l_29.receiveShadow = options.receiveShadow ?? true;
  mesh_tail_panel_l_29.userData.sculptComponent = { "id": "tail-panel-l", "name": "Painel da rabeta (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Painel da rabeta (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "seat", "contactType": "overlap", "localStart": [-0.5, 0.7, -0.13], "localEnd": [-0.5, 0.7, -0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.38, "height": 0.17, "depth": 0.03, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.5, 0.7, -0.13], "rotation": [0, 0, 0.32] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-blue"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-blue", "colorMaterialRecipe": { "dominantAlbedo": "rgba(30, 64, 175, 1.0)", "secondaryAlbedo": "rgba(23, 49, 134, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_tail_panel_l_29.add(mesh_tail_panel_l_29);
  meshes["tail-panel-l"] = mesh_tail_panel_l_29;
  colliders["tail-panel-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_tail_panel_l_29);
  const attachment_grab_rail_l_30 = { "parentSocket": "tail-panel-l", "contactType": "socket", "localStart": [-0.42, 0.8, -0.13], "localEnd": [-0.72, 0.885, -0.13], "baseRadius": 0.011, "endRadius": 0.011, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_grab_rail_l_30 = makeAttachmentEndpoint(attachment_grab_rail_l_30);
  const node_grab_rail_l_30 = new THREE.Group();
  node_grab_rail_l_30.name = "Alca de garupa (l)__pivot";
  node_grab_rail_l_30.scale.set(1, 1, 1);
  if (endpoint_grab_rail_l_30) {
    node_grab_rail_l_30.position.copy(endpoint_grab_rail_l_30.start);
    node_grab_rail_l_30.rotation.set(0, 0, 0);
  } else {
    node_grab_rail_l_30.position.set(0, 0, 0);
    node_grab_rail_l_30.rotation.set(0, 0, 0);
  }
  node_grab_rail_l_30.userData.sculptComponent = { "id": "grab-rail-l", "name": "Alca de garupa (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Alca de garupa (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "tail-panel-l", "contactType": "socket", "localStart": [-0.42, 0.8, -0.13], "localEnd": [-0.72, 0.885, -0.13], "baseRadius": 0.011, "endRadius": 0.011, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_grab_rail_l_30.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_grab_rail_l_30);
  nodes["grab-rail-l"] = node_grab_rail_l_30;
  const mesh_grab_rail_l_30Geometry = endpoint_grab_rail_l_30 ? new THREE.CylinderGeometry(endpoint_grab_rail_l_30.endRadius, endpoint_grab_rail_l_30.baseRadius, endpoint_grab_rail_l_30.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_grab_rail_l_30) {
    mesh_grab_rail_l_30Geometry.scale(1, 1, 1);
  }
  const mesh_grab_rail_l_30 = new THREE.Mesh(
    mesh_grab_rail_l_30Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_grab_rail_l_30.name = "Alca de garupa (l)";
  if (endpoint_grab_rail_l_30) {
    mesh_grab_rail_l_30.position.copy(endpoint_grab_rail_l_30.midpoint);
    mesh_grab_rail_l_30.quaternion.copy(endpoint_grab_rail_l_30.quaternion);
  }
  mesh_grab_rail_l_30.castShadow = options.castShadow ?? true;
  mesh_grab_rail_l_30.receiveShadow = options.receiveShadow ?? true;
  mesh_grab_rail_l_30.userData.sculptComponent = { "id": "grab-rail-l", "name": "Alca de garupa (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Alca de garupa (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "tail-panel-l", "contactType": "socket", "localStart": [-0.42, 0.8, -0.13], "localEnd": [-0.72, 0.885, -0.13], "baseRadius": 0.011, "endRadius": 0.011, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_grab_rail_l_30.add(mesh_grab_rail_l_30);
  meshes["grab-rail-l"] = mesh_grab_rail_l_30;
  colliders["grab-rail-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_grab_rail_l_30);
  const attachment_rear_fender_31 = { "parentSocket": "tail-panel-r", "contactType": "overlap", "localStart": [-0.8, 0.55, 0], "localEnd": [-0.8, 0.55, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_rear_fender_31 = makeAttachmentEndpoint(attachment_rear_fender_31);
  const node_rear_fender_31 = new THREE.Group();
  node_rear_fender_31.name = "Para-lama traseiro__pivot";
  node_rear_fender_31.scale.set(1, 1, 1);
  if (endpoint_rear_fender_31) {
    node_rear_fender_31.position.copy(endpoint_rear_fender_31.start);
    node_rear_fender_31.rotation.set(0, 0, -0.62);
  } else {
    node_rear_fender_31.position.set(-0.8, 0.55, 0);
    node_rear_fender_31.rotation.set(0, 0, -0.62);
  }
  node_rear_fender_31.userData.sculptComponent = { "id": "rear-fender", "name": "Para-lama traseiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Para-lama traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "tail-panel-r", "contactType": "overlap", "localStart": [-0.8, 0.55, 0], "localEnd": [-0.8, 0.55, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.26, "height": 0.03, "depth": 0.15, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.8, 0.55, 0], "rotation": [0, 0, -0.62] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_rear_fender_31.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_rear_fender_31);
  nodes["rear-fender"] = node_rear_fender_31;
  const mesh_rear_fender_31Geometry = endpoint_rear_fender_31 ? new THREE.CylinderGeometry(endpoint_rear_fender_31.endRadius, endpoint_rear_fender_31.baseRadius, endpoint_rear_fender_31.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_rear_fender_31) {
    mesh_rear_fender_31Geometry.scale(0.26, 0.03, 0.15);
  }
  const mesh_rear_fender_31 = new THREE.Mesh(
    mesh_rear_fender_31Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_rear_fender_31.name = "Para-lama traseiro";
  if (endpoint_rear_fender_31) {
    mesh_rear_fender_31.position.copy(endpoint_rear_fender_31.midpoint);
    mesh_rear_fender_31.quaternion.copy(endpoint_rear_fender_31.quaternion);
  }
  mesh_rear_fender_31.castShadow = options.castShadow ?? true;
  mesh_rear_fender_31.receiveShadow = options.receiveShadow ?? true;
  mesh_rear_fender_31.userData.sculptComponent = { "id": "rear-fender", "name": "Para-lama traseiro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Para-lama traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "tail-panel-r", "contactType": "overlap", "localStart": [-0.8, 0.55, 0], "localEnd": [-0.8, 0.55, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.26, "height": 0.03, "depth": 0.15, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.8, 0.55, 0], "rotation": [0, 0, -0.62] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_rear_fender_31.add(mesh_rear_fender_31);
  meshes["rear-fender"] = mesh_rear_fender_31;
  colliders["rear-fender"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_rear_fender_31);
  const attachment_crankcase_32 = { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [0.02, 0.4, 0], "localEnd": [0.02, 0.4, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_crankcase_32 = makeAttachmentEndpoint(attachment_crankcase_32);
  const node_crankcase_32 = new THREE.Group();
  node_crankcase_32.name = "Carter do motor__pivot";
  node_crankcase_32.scale.set(1, 1, 1);
  if (endpoint_crankcase_32) {
    node_crankcase_32.position.copy(endpoint_crankcase_32.start);
    node_crankcase_32.rotation.set(1.5707963267948966, 0, 0);
  } else {
    node_crankcase_32.position.set(0.02, 0.4, 0);
    node_crankcase_32.rotation.set(1.5707963267948966, 0, 0);
  }
  node_crankcase_32.userData.sculptComponent = { "id": "crankcase", "name": "Carter do motor", "level": "macro", "role": "structure", "importance": 0.9, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Carter do motor.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [0.02, 0.4, 0], "localEnd": [0.02, 0.4, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.26, "height": 0.26, "depth": 0.28, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.02, 0.4, 0], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-clutch-gloss", "kind": "gloss", "description": "Tampa de embreagem circular polida", "mapsTo": "clutch-cover" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_crankcase_32.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_crankcase_32);
  nodes["crankcase"] = node_crankcase_32;
  const mesh_crankcase_32Geometry = endpoint_crankcase_32 ? new THREE.CylinderGeometry(endpoint_crankcase_32.endRadius, endpoint_crankcase_32.baseRadius, endpoint_crankcase_32.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_crankcase_32) {
    mesh_crankcase_32Geometry.scale(0.26, 0.26, 0.28);
  }
  const mesh_crankcase_32 = new THREE.Mesh(
    mesh_crankcase_32Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_crankcase_32.name = "Carter do motor";
  if (endpoint_crankcase_32) {
    mesh_crankcase_32.position.copy(endpoint_crankcase_32.midpoint);
    mesh_crankcase_32.quaternion.copy(endpoint_crankcase_32.quaternion);
  }
  mesh_crankcase_32.castShadow = options.castShadow ?? true;
  mesh_crankcase_32.receiveShadow = options.receiveShadow ?? true;
  mesh_crankcase_32.userData.sculptComponent = { "id": "crankcase", "name": "Carter do motor", "level": "macro", "role": "structure", "importance": 0.9, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Carter do motor.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [0.02, 0.4, 0], "localEnd": [0.02, 0.4, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.26, "height": 0.26, "depth": 0.28, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.02, 0.4, 0], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-clutch-gloss", "kind": "gloss", "description": "Tampa de embreagem circular polida", "mapsTo": "clutch-cover" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_crankcase_32.add(mesh_crankcase_32);
  meshes["crankcase"] = mesh_crankcase_32;
  colliders["crankcase"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_crankcase_32);
  const attachment_clutch_cover_33 = { "parentSocket": "crankcase", "contactType": "overlap", "localStart": [0.02, 0.4, 0.15], "localEnd": [0.02, 0.4, 0.15], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_clutch_cover_33 = makeAttachmentEndpoint(attachment_clutch_cover_33);
  const node_clutch_cover_33 = new THREE.Group();
  node_clutch_cover_33.name = "Tampa de embreagem__pivot";
  node_clutch_cover_33.scale.set(1, 1, 1);
  if (endpoint_clutch_cover_33) {
    node_clutch_cover_33.position.copy(endpoint_clutch_cover_33.start);
    node_clutch_cover_33.rotation.set(1.5707963267948966, 0, 0);
  } else {
    node_clutch_cover_33.position.set(0.02, 0.4, 0.15);
    node_clutch_cover_33.rotation.set(1.5707963267948966, 0, 0);
  }
  node_clutch_cover_33.userData.sculptComponent = { "id": "clutch-cover", "name": "Tampa de embreagem", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Tampa de embreagem.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "crankcase", "contactType": "overlap", "localStart": [0.02, 0.4, 0.15], "localEnd": [0.02, 0.4, 0.15], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.18, "height": 0.026, "depth": 0.18, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.02, 0.4, 0.15], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_clutch_cover_33.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_clutch_cover_33);
  nodes["clutch-cover"] = node_clutch_cover_33;
  const mesh_clutch_cover_33Geometry = endpoint_clutch_cover_33 ? new THREE.CylinderGeometry(endpoint_clutch_cover_33.endRadius, endpoint_clutch_cover_33.baseRadius, endpoint_clutch_cover_33.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_clutch_cover_33) {
    mesh_clutch_cover_33Geometry.scale(0.18, 0.026, 0.18);
  }
  const mesh_clutch_cover_33 = new THREE.Mesh(
    mesh_clutch_cover_33Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_clutch_cover_33.name = "Tampa de embreagem";
  if (endpoint_clutch_cover_33) {
    mesh_clutch_cover_33.position.copy(endpoint_clutch_cover_33.midpoint);
    mesh_clutch_cover_33.quaternion.copy(endpoint_clutch_cover_33.quaternion);
  }
  mesh_clutch_cover_33.castShadow = options.castShadow ?? true;
  mesh_clutch_cover_33.receiveShadow = options.receiveShadow ?? true;
  mesh_clutch_cover_33.userData.sculptComponent = { "id": "clutch-cover", "name": "Tampa de embreagem", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Tampa de embreagem.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "crankcase", "contactType": "overlap", "localStart": [0.02, 0.4, 0.15], "localEnd": [0.02, 0.4, 0.15], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.18, "height": 0.026, "depth": 0.18, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.02, 0.4, 0.15], "rotation": [1.5707963267948966, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-alloy"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-alloy", "colorMaterialRecipe": { "dominantAlbedo": "rgba(200, 204, 210, 1.0)", "secondaryAlbedo": "rgba(160, 165, 172, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_clutch_cover_33.add(mesh_clutch_cover_33);
  meshes["clutch-cover"] = mesh_clutch_cover_33;
  colliders["clutch-cover"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_clutch_cover_33);
  const attachment_cylinder_block_34 = { "parentSocket": "crankcase", "contactType": "socket", "localStart": [0.1, 0.565, 0], "localEnd": [0.1, 0.565, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_cylinder_block_34 = makeAttachmentEndpoint(attachment_cylinder_block_34);
  const node_cylinder_block_34 = new THREE.Group();
  node_cylinder_block_34.name = "Cilindro do motor__pivot";
  node_cylinder_block_34.scale.set(1, 1, 1);
  if (endpoint_cylinder_block_34) {
    node_cylinder_block_34.position.copy(endpoint_cylinder_block_34.start);
    node_cylinder_block_34.rotation.set(0, 0, -0.26);
  } else {
    node_cylinder_block_34.position.set(0.1, 0.565, 0);
    node_cylinder_block_34.rotation.set(0, 0, -0.26);
  }
  node_cylinder_block_34.userData.sculptComponent = { "id": "cylinder-block", "name": "Cilindro do motor", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Bloco aletado aproximado por caixa; aletas descritas em localFeatures.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "crankcase", "contactType": "socket", "localStart": [0.1, 0.565, 0], "localEnd": [0.1, 0.565, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.15, "height": 0.2, "depth": 0.16, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.1, 0.565, 0], "rotation": [0, 0, -0.26] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-fins", "kind": "ridge", "description": "Aletas de arrefecimento horizontais (aproximadas)" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_cylinder_block_34.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_cylinder_block_34);
  nodes["cylinder-block"] = node_cylinder_block_34;
  const mesh_cylinder_block_34Geometry = endpoint_cylinder_block_34 ? new THREE.CylinderGeometry(endpoint_cylinder_block_34.endRadius, endpoint_cylinder_block_34.baseRadius, endpoint_cylinder_block_34.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_cylinder_block_34) {
    mesh_cylinder_block_34Geometry.scale(0.15, 0.2, 0.16);
  }
  const mesh_cylinder_block_34 = new THREE.Mesh(
    mesh_cylinder_block_34Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_cylinder_block_34.name = "Cilindro do motor";
  if (endpoint_cylinder_block_34) {
    mesh_cylinder_block_34.position.copy(endpoint_cylinder_block_34.midpoint);
    mesh_cylinder_block_34.quaternion.copy(endpoint_cylinder_block_34.quaternion);
  }
  mesh_cylinder_block_34.castShadow = options.castShadow ?? true;
  mesh_cylinder_block_34.receiveShadow = options.receiveShadow ?? true;
  mesh_cylinder_block_34.userData.sculptComponent = { "id": "cylinder-block", "name": "Cilindro do motor", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Bloco aletado aproximado por caixa; aletas descritas em localFeatures.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "crankcase", "contactType": "socket", "localStart": [0.1, 0.565, 0], "localEnd": [0.1, 0.565, 0], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.15, "height": 0.2, "depth": 0.16, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0.1, 0.565, 0], "rotation": [0, 0, -0.26] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{ "id": "lf-fins", "kind": "ridge", "description": "Aletas de arrefecimento horizontais (aproximadas)" }], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_cylinder_block_34.add(mesh_cylinder_block_34);
  meshes["cylinder-block"] = mesh_cylinder_block_34;
  colliders["cylinder-block"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_cylinder_block_34);
  const attachment_exhaust_downpipe_35 = { "parentSocket": "cylinder-block", "contactType": "socket", "localStart": [0.16, 0.6, 0.1], "localEnd": [0.1, 0.36, 0.13], "baseRadius": 0.021, "endRadius": 0.021, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_exhaust_downpipe_35 = makeAttachmentEndpoint(attachment_exhaust_downpipe_35);
  const node_exhaust_downpipe_35 = new THREE.Group();
  node_exhaust_downpipe_35.name = "Curva de escape__pivot";
  node_exhaust_downpipe_35.scale.set(1, 1, 1);
  if (endpoint_exhaust_downpipe_35) {
    node_exhaust_downpipe_35.position.copy(endpoint_exhaust_downpipe_35.start);
    node_exhaust_downpipe_35.rotation.set(0, 0, 0);
  } else {
    node_exhaust_downpipe_35.position.set(0, 0, 0);
    node_exhaust_downpipe_35.rotation.set(0, 0, 0);
  }
  node_exhaust_downpipe_35.userData.sculptComponent = { "id": "exhaust-downpipe", "name": "Curva de escape", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Curva de escape.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "cylinder-block", "contactType": "socket", "localStart": [0.16, 0.6, 0.1], "localEnd": [0.1, 0.36, 0.13], "baseRadius": 0.021, "endRadius": 0.021, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_exhaust_downpipe_35.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_exhaust_downpipe_35);
  nodes["exhaust-downpipe"] = node_exhaust_downpipe_35;
  const mesh_exhaust_downpipe_35Geometry = endpoint_exhaust_downpipe_35 ? new THREE.CylinderGeometry(endpoint_exhaust_downpipe_35.endRadius, endpoint_exhaust_downpipe_35.baseRadius, endpoint_exhaust_downpipe_35.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_exhaust_downpipe_35) {
    mesh_exhaust_downpipe_35Geometry.scale(1, 1, 1);
  }
  const mesh_exhaust_downpipe_35 = new THREE.Mesh(
    mesh_exhaust_downpipe_35Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_exhaust_downpipe_35.name = "Curva de escape";
  if (endpoint_exhaust_downpipe_35) {
    mesh_exhaust_downpipe_35.position.copy(endpoint_exhaust_downpipe_35.midpoint);
    mesh_exhaust_downpipe_35.quaternion.copy(endpoint_exhaust_downpipe_35.quaternion);
  }
  mesh_exhaust_downpipe_35.castShadow = options.castShadow ?? true;
  mesh_exhaust_downpipe_35.receiveShadow = options.receiveShadow ?? true;
  mesh_exhaust_downpipe_35.userData.sculptComponent = { "id": "exhaust-downpipe", "name": "Curva de escape", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Curva de escape.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "cylinder-block", "contactType": "socket", "localStart": [0.16, 0.6, 0.1], "localEnd": [0.1, 0.36, 0.13], "baseRadius": 0.021, "endRadius": 0.021, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_exhaust_downpipe_35.add(mesh_exhaust_downpipe_35);
  meshes["exhaust-downpipe"] = mesh_exhaust_downpipe_35;
  colliders["exhaust-downpipe"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_exhaust_downpipe_35);
  const attachment_exhaust_midpipe_36 = { "parentSocket": "exhaust-downpipe", "contactType": "socket", "localStart": [0.1, 0.36, 0.13], "localEnd": [-0.2, 0.45, 0.14], "baseRadius": 0.022, "endRadius": 0.022, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_exhaust_midpipe_36 = makeAttachmentEndpoint(attachment_exhaust_midpipe_36);
  const node_exhaust_midpipe_36 = new THREE.Group();
  node_exhaust_midpipe_36.name = "Tubo intermedio de escape__pivot";
  node_exhaust_midpipe_36.scale.set(1, 1, 1);
  if (endpoint_exhaust_midpipe_36) {
    node_exhaust_midpipe_36.position.copy(endpoint_exhaust_midpipe_36.start);
    node_exhaust_midpipe_36.rotation.set(0, 0, 0);
  } else {
    node_exhaust_midpipe_36.position.set(0, 0, 0);
    node_exhaust_midpipe_36.rotation.set(0, 0, 0);
  }
  node_exhaust_midpipe_36.userData.sculptComponent = { "id": "exhaust-midpipe", "name": "Tubo intermedio de escape", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Tubo intermedio de escape.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "exhaust-downpipe", "contactType": "socket", "localStart": [0.1, 0.36, 0.13], "localEnd": [-0.2, 0.45, 0.14], "baseRadius": 0.022, "endRadius": 0.022, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_exhaust_midpipe_36.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_exhaust_midpipe_36);
  nodes["exhaust-midpipe"] = node_exhaust_midpipe_36;
  const mesh_exhaust_midpipe_36Geometry = endpoint_exhaust_midpipe_36 ? new THREE.CylinderGeometry(endpoint_exhaust_midpipe_36.endRadius, endpoint_exhaust_midpipe_36.baseRadius, endpoint_exhaust_midpipe_36.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_exhaust_midpipe_36) {
    mesh_exhaust_midpipe_36Geometry.scale(1, 1, 1);
  }
  const mesh_exhaust_midpipe_36 = new THREE.Mesh(
    mesh_exhaust_midpipe_36Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_exhaust_midpipe_36.name = "Tubo intermedio de escape";
  if (endpoint_exhaust_midpipe_36) {
    mesh_exhaust_midpipe_36.position.copy(endpoint_exhaust_midpipe_36.midpoint);
    mesh_exhaust_midpipe_36.quaternion.copy(endpoint_exhaust_midpipe_36.quaternion);
  }
  mesh_exhaust_midpipe_36.castShadow = options.castShadow ?? true;
  mesh_exhaust_midpipe_36.receiveShadow = options.receiveShadow ?? true;
  mesh_exhaust_midpipe_36.userData.sculptComponent = { "id": "exhaust-midpipe", "name": "Tubo intermedio de escape", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Tubo intermedio de escape.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "exhaust-downpipe", "contactType": "socket", "localStart": [0.1, 0.36, 0.13], "localEnd": [-0.2, 0.45, 0.14], "baseRadius": 0.022, "endRadius": 0.022, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_exhaust_midpipe_36.add(mesh_exhaust_midpipe_36);
  meshes["exhaust-midpipe"] = mesh_exhaust_midpipe_36;
  colliders["exhaust-midpipe"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_exhaust_midpipe_36);
  const attachment_exhaust_muffler_37 = { "parentSocket": "exhaust-midpipe", "contactType": "socket", "localStart": [-0.2, 0.45, 0.14], "localEnd": [-0.64, 0.54, 0.145], "baseRadius": 0.048, "endRadius": 0.048, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_exhaust_muffler_37 = makeAttachmentEndpoint(attachment_exhaust_muffler_37);
  const node_exhaust_muffler_37 = new THREE.Group();
  node_exhaust_muffler_37.name = "Ponteira de escape__pivot";
  node_exhaust_muffler_37.scale.set(1, 1, 1);
  if (endpoint_exhaust_muffler_37) {
    node_exhaust_muffler_37.position.copy(endpoint_exhaust_muffler_37.start);
    node_exhaust_muffler_37.rotation.set(0, 0, 0);
  } else {
    node_exhaust_muffler_37.position.set(0, 0, 0);
    node_exhaust_muffler_37.rotation.set(0, 0, 0);
  }
  node_exhaust_muffler_37.userData.sculptComponent = { "id": "exhaust-muffler", "name": "Ponteira de escape", "level": "macro", "role": "structure", "importance": 0.8, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Ponteira de escape.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "exhaust-midpipe", "contactType": "socket", "localStart": [-0.2, 0.45, 0.14], "localEnd": [-0.64, 0.54, 0.145], "baseRadius": 0.048, "endRadius": 0.048, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_exhaust_muffler_37.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_exhaust_muffler_37);
  nodes["exhaust-muffler"] = node_exhaust_muffler_37;
  const mesh_exhaust_muffler_37Geometry = endpoint_exhaust_muffler_37 ? new THREE.CylinderGeometry(endpoint_exhaust_muffler_37.endRadius, endpoint_exhaust_muffler_37.baseRadius, endpoint_exhaust_muffler_37.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_exhaust_muffler_37) {
    mesh_exhaust_muffler_37Geometry.scale(1, 1, 1);
  }
  const mesh_exhaust_muffler_37 = new THREE.Mesh(
    mesh_exhaust_muffler_37Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_exhaust_muffler_37.name = "Ponteira de escape";
  if (endpoint_exhaust_muffler_37) {
    mesh_exhaust_muffler_37.position.copy(endpoint_exhaust_muffler_37.midpoint);
    mesh_exhaust_muffler_37.quaternion.copy(endpoint_exhaust_muffler_37.quaternion);
  }
  mesh_exhaust_muffler_37.castShadow = options.castShadow ?? true;
  mesh_exhaust_muffler_37.receiveShadow = options.receiveShadow ?? true;
  mesh_exhaust_muffler_37.userData.sculptComponent = { "id": "exhaust-muffler", "name": "Ponteira de escape", "level": "macro", "role": "structure", "importance": 0.8, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Ponteira de escape.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "exhaust-midpipe", "contactType": "socket", "localStart": [-0.2, 0.45, 0.14], "localEnd": [-0.64, 0.54, 0.145], "baseRadius": 0.048, "endRadius": 0.048, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_exhaust_muffler_37.add(mesh_exhaust_muffler_37);
  meshes["exhaust-muffler"] = mesh_exhaust_muffler_37;
  colliders["exhaust-muffler"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_exhaust_muffler_37);
  const attachment_frame_downtube_38 = { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [0.28, 0.98, 0], "localEnd": [0.12, 0.46, 0], "baseRadius": 0.022, "endRadius": 0.022, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_frame_downtube_38 = makeAttachmentEndpoint(attachment_frame_downtube_38);
  const node_frame_downtube_38 = new THREE.Group();
  node_frame_downtube_38.name = "Tubo frontal do quadro__pivot";
  node_frame_downtube_38.scale.set(1, 1, 1);
  if (endpoint_frame_downtube_38) {
    node_frame_downtube_38.position.copy(endpoint_frame_downtube_38.start);
    node_frame_downtube_38.rotation.set(0, 0, 0);
  } else {
    node_frame_downtube_38.position.set(0, 0, 0);
    node_frame_downtube_38.rotation.set(0, 0, 0);
  }
  node_frame_downtube_38.userData.sculptComponent = { "id": "frame-downtube", "name": "Tubo frontal do quadro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Tubo frontal do quadro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [0.28, 0.98, 0], "localEnd": [0.12, 0.46, 0], "baseRadius": 0.022, "endRadius": 0.022, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_frame_downtube_38.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_frame_downtube_38);
  nodes["frame-downtube"] = node_frame_downtube_38;
  const mesh_frame_downtube_38Geometry = endpoint_frame_downtube_38 ? new THREE.CylinderGeometry(endpoint_frame_downtube_38.endRadius, endpoint_frame_downtube_38.baseRadius, endpoint_frame_downtube_38.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_frame_downtube_38) {
    mesh_frame_downtube_38Geometry.scale(1, 1, 1);
  }
  const mesh_frame_downtube_38 = new THREE.Mesh(
    mesh_frame_downtube_38Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_frame_downtube_38.name = "Tubo frontal do quadro";
  if (endpoint_frame_downtube_38) {
    mesh_frame_downtube_38.position.copy(endpoint_frame_downtube_38.midpoint);
    mesh_frame_downtube_38.quaternion.copy(endpoint_frame_downtube_38.quaternion);
  }
  mesh_frame_downtube_38.castShadow = options.castShadow ?? true;
  mesh_frame_downtube_38.receiveShadow = options.receiveShadow ?? true;
  mesh_frame_downtube_38.userData.sculptComponent = { "id": "frame-downtube", "name": "Tubo frontal do quadro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Tubo frontal do quadro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [0.28, 0.98, 0], "localEnd": [0.12, 0.46, 0], "baseRadius": 0.022, "endRadius": 0.022, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_frame_downtube_38.add(mesh_frame_downtube_38);
  meshes["frame-downtube"] = mesh_frame_downtube_38;
  colliders["frame-downtube"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_frame_downtube_38);
  const attachment_frame_spine_39 = { "parentSocket": "triple-clamp", "contactType": "socket", "localStart": [0.28, 0.99, 0], "localEnd": [-0.25, 0.86, 0], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_frame_spine_39 = makeAttachmentEndpoint(attachment_frame_spine_39);
  const node_frame_spine_39 = new THREE.Group();
  node_frame_spine_39.name = "Espinha do quadro__pivot";
  node_frame_spine_39.scale.set(1, 1, 1);
  if (endpoint_frame_spine_39) {
    node_frame_spine_39.position.copy(endpoint_frame_spine_39.start);
    node_frame_spine_39.rotation.set(0, 0, 0);
  } else {
    node_frame_spine_39.position.set(0, 0, 0);
    node_frame_spine_39.rotation.set(0, 0, 0);
  }
  node_frame_spine_39.userData.sculptComponent = { "id": "frame-spine", "name": "Espinha do quadro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Espinha do quadro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "triple-clamp", "contactType": "socket", "localStart": [0.28, 0.99, 0], "localEnd": [-0.25, 0.86, 0], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_frame_spine_39.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_frame_spine_39);
  nodes["frame-spine"] = node_frame_spine_39;
  const mesh_frame_spine_39Geometry = endpoint_frame_spine_39 ? new THREE.CylinderGeometry(endpoint_frame_spine_39.endRadius, endpoint_frame_spine_39.baseRadius, endpoint_frame_spine_39.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_frame_spine_39) {
    mesh_frame_spine_39Geometry.scale(1, 1, 1);
  }
  const mesh_frame_spine_39 = new THREE.Mesh(
    mesh_frame_spine_39Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_frame_spine_39.name = "Espinha do quadro";
  if (endpoint_frame_spine_39) {
    mesh_frame_spine_39.position.copy(endpoint_frame_spine_39.midpoint);
    mesh_frame_spine_39.quaternion.copy(endpoint_frame_spine_39.quaternion);
  }
  mesh_frame_spine_39.castShadow = options.castShadow ?? true;
  mesh_frame_spine_39.receiveShadow = options.receiveShadow ?? true;
  mesh_frame_spine_39.userData.sculptComponent = { "id": "frame-spine", "name": "Espinha do quadro", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Espinha do quadro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "triple-clamp", "contactType": "socket", "localStart": [0.28, 0.99, 0], "localEnd": [-0.25, 0.86, 0], "baseRadius": 0.024, "endRadius": 0.024, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_frame_spine_39.add(mesh_frame_spine_39);
  meshes["frame-spine"] = mesh_frame_spine_39;
  colliders["frame-spine"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_frame_spine_39);
  const attachment_subframe_r_40 = { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [-0.18, 0.84, 0.1], "localEnd": [-0.62, 0.8, 0.1], "baseRadius": 0.014, "endRadius": 0.014, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_subframe_r_40 = makeAttachmentEndpoint(attachment_subframe_r_40);
  const node_subframe_r_40 = new THREE.Group();
  node_subframe_r_40.name = "Subquadro (r)__pivot";
  node_subframe_r_40.scale.set(1, 1, 1);
  if (endpoint_subframe_r_40) {
    node_subframe_r_40.position.copy(endpoint_subframe_r_40.start);
    node_subframe_r_40.rotation.set(0, 0, 0);
  } else {
    node_subframe_r_40.position.set(0, 0, 0);
    node_subframe_r_40.rotation.set(0, 0, 0);
  }
  node_subframe_r_40.userData.sculptComponent = { "id": "subframe-r", "name": "Subquadro (r)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Subquadro (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [-0.18, 0.84, 0.1], "localEnd": [-0.62, 0.8, 0.1], "baseRadius": 0.014, "endRadius": 0.014, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_subframe_r_40.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_subframe_r_40);
  nodes["subframe-r"] = node_subframe_r_40;
  const mesh_subframe_r_40Geometry = endpoint_subframe_r_40 ? new THREE.CylinderGeometry(endpoint_subframe_r_40.endRadius, endpoint_subframe_r_40.baseRadius, endpoint_subframe_r_40.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_subframe_r_40) {
    mesh_subframe_r_40Geometry.scale(1, 1, 1);
  }
  const mesh_subframe_r_40 = new THREE.Mesh(
    mesh_subframe_r_40Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_subframe_r_40.name = "Subquadro (r)";
  if (endpoint_subframe_r_40) {
    mesh_subframe_r_40.position.copy(endpoint_subframe_r_40.midpoint);
    mesh_subframe_r_40.quaternion.copy(endpoint_subframe_r_40.quaternion);
  }
  mesh_subframe_r_40.castShadow = options.castShadow ?? true;
  mesh_subframe_r_40.receiveShadow = options.receiveShadow ?? true;
  mesh_subframe_r_40.userData.sculptComponent = { "id": "subframe-r", "name": "Subquadro (r)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Subquadro (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [-0.18, 0.84, 0.1], "localEnd": [-0.62, 0.8, 0.1], "baseRadius": 0.014, "endRadius": 0.014, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_subframe_r_40.add(mesh_subframe_r_40);
  meshes["subframe-r"] = mesh_subframe_r_40;
  colliders["subframe-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_subframe_r_40);
  const attachment_swingarm_r_41 = { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [-0.22, 0.42, 0.1], "localEnd": [-0.67, 0.31, 0.1], "baseRadius": 0.026, "endRadius": 0.026, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_swingarm_r_41 = makeAttachmentEndpoint(attachment_swingarm_r_41);
  const node_swingarm_r_41 = new THREE.Group();
  node_swingarm_r_41.name = "Balanca traseira (r)__pivot";
  node_swingarm_r_41.scale.set(1, 1, 1);
  if (endpoint_swingarm_r_41) {
    node_swingarm_r_41.position.copy(endpoint_swingarm_r_41.start);
    node_swingarm_r_41.rotation.set(0, 0, 0);
  } else {
    node_swingarm_r_41.position.set(0, 0, 0);
    node_swingarm_r_41.rotation.set(0, 0, 0);
  }
  node_swingarm_r_41.userData.sculptComponent = { "id": "swingarm-r", "name": "Balanca traseira (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Balanca traseira (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [-0.22, 0.42, 0.1], "localEnd": [-0.67, 0.31, 0.1], "baseRadius": 0.026, "endRadius": 0.026, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_swingarm_r_41.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_swingarm_r_41);
  nodes["swingarm-r"] = node_swingarm_r_41;
  const mesh_swingarm_r_41Geometry = endpoint_swingarm_r_41 ? new THREE.CylinderGeometry(endpoint_swingarm_r_41.endRadius, endpoint_swingarm_r_41.baseRadius, endpoint_swingarm_r_41.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_swingarm_r_41) {
    mesh_swingarm_r_41Geometry.scale(1, 1, 1);
  }
  const mesh_swingarm_r_41 = new THREE.Mesh(
    mesh_swingarm_r_41Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_swingarm_r_41.name = "Balanca traseira (r)";
  if (endpoint_swingarm_r_41) {
    mesh_swingarm_r_41.position.copy(endpoint_swingarm_r_41.midpoint);
    mesh_swingarm_r_41.quaternion.copy(endpoint_swingarm_r_41.quaternion);
  }
  mesh_swingarm_r_41.castShadow = options.castShadow ?? true;
  mesh_swingarm_r_41.receiveShadow = options.receiveShadow ?? true;
  mesh_swingarm_r_41.userData.sculptComponent = { "id": "swingarm-r", "name": "Balanca traseira (r)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Balanca traseira (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [-0.22, 0.42, 0.1], "localEnd": [-0.67, 0.31, 0.1], "baseRadius": 0.026, "endRadius": 0.026, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_swingarm_r_41.add(mesh_swingarm_r_41);
  meshes["swingarm-r"] = mesh_swingarm_r_41;
  colliders["swingarm-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_swingarm_r_41);
  const attachment_subframe_l_42 = { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [-0.18, 0.84, -0.1], "localEnd": [-0.62, 0.8, -0.1], "baseRadius": 0.014, "endRadius": 0.014, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_subframe_l_42 = makeAttachmentEndpoint(attachment_subframe_l_42);
  const node_subframe_l_42 = new THREE.Group();
  node_subframe_l_42.name = "Subquadro (l)__pivot";
  node_subframe_l_42.scale.set(1, 1, 1);
  if (endpoint_subframe_l_42) {
    node_subframe_l_42.position.copy(endpoint_subframe_l_42.start);
    node_subframe_l_42.rotation.set(0, 0, 0);
  } else {
    node_subframe_l_42.position.set(0, 0, 0);
    node_subframe_l_42.rotation.set(0, 0, 0);
  }
  node_subframe_l_42.userData.sculptComponent = { "id": "subframe-l", "name": "Subquadro (l)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Subquadro (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [-0.18, 0.84, -0.1], "localEnd": [-0.62, 0.8, -0.1], "baseRadius": 0.014, "endRadius": 0.014, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_subframe_l_42.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_subframe_l_42);
  nodes["subframe-l"] = node_subframe_l_42;
  const mesh_subframe_l_42Geometry = endpoint_subframe_l_42 ? new THREE.CylinderGeometry(endpoint_subframe_l_42.endRadius, endpoint_subframe_l_42.baseRadius, endpoint_subframe_l_42.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_subframe_l_42) {
    mesh_subframe_l_42Geometry.scale(1, 1, 1);
  }
  const mesh_subframe_l_42 = new THREE.Mesh(
    mesh_subframe_l_42Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_subframe_l_42.name = "Subquadro (l)";
  if (endpoint_subframe_l_42) {
    mesh_subframe_l_42.position.copy(endpoint_subframe_l_42.midpoint);
    mesh_subframe_l_42.quaternion.copy(endpoint_subframe_l_42.quaternion);
  }
  mesh_subframe_l_42.castShadow = options.castShadow ?? true;
  mesh_subframe_l_42.receiveShadow = options.receiveShadow ?? true;
  mesh_subframe_l_42.userData.sculptComponent = { "id": "subframe-l", "name": "Subquadro (l)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Subquadro (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-spine", "contactType": "socket", "localStart": [-0.18, 0.84, -0.1], "localEnd": [-0.62, 0.8, -0.1], "baseRadius": 0.014, "endRadius": 0.014, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_subframe_l_42.add(mesh_subframe_l_42);
  meshes["subframe-l"] = mesh_subframe_l_42;
  colliders["subframe-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_subframe_l_42);
  const attachment_swingarm_l_43 = { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [-0.22, 0.42, -0.1], "localEnd": [-0.67, 0.31, -0.1], "baseRadius": 0.026, "endRadius": 0.026, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_swingarm_l_43 = makeAttachmentEndpoint(attachment_swingarm_l_43);
  const node_swingarm_l_43 = new THREE.Group();
  node_swingarm_l_43.name = "Balanca traseira (l)__pivot";
  node_swingarm_l_43.scale.set(1, 1, 1);
  if (endpoint_swingarm_l_43) {
    node_swingarm_l_43.position.copy(endpoint_swingarm_l_43.start);
    node_swingarm_l_43.rotation.set(0, 0, 0);
  } else {
    node_swingarm_l_43.position.set(0, 0, 0);
    node_swingarm_l_43.rotation.set(0, 0, 0);
  }
  node_swingarm_l_43.userData.sculptComponent = { "id": "swingarm-l", "name": "Balanca traseira (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Balanca traseira (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [-0.22, 0.42, -0.1], "localEnd": [-0.67, 0.31, -0.1], "baseRadius": 0.026, "endRadius": 0.026, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_swingarm_l_43.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_swingarm_l_43);
  nodes["swingarm-l"] = node_swingarm_l_43;
  const mesh_swingarm_l_43Geometry = endpoint_swingarm_l_43 ? new THREE.CylinderGeometry(endpoint_swingarm_l_43.endRadius, endpoint_swingarm_l_43.baseRadius, endpoint_swingarm_l_43.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_swingarm_l_43) {
    mesh_swingarm_l_43Geometry.scale(1, 1, 1);
  }
  const mesh_swingarm_l_43 = new THREE.Mesh(
    mesh_swingarm_l_43Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_swingarm_l_43.name = "Balanca traseira (l)";
  if (endpoint_swingarm_l_43) {
    mesh_swingarm_l_43.position.copy(endpoint_swingarm_l_43.midpoint);
    mesh_swingarm_l_43.quaternion.copy(endpoint_swingarm_l_43.quaternion);
  }
  mesh_swingarm_l_43.castShadow = options.castShadow ?? true;
  mesh_swingarm_l_43.receiveShadow = options.receiveShadow ?? true;
  mesh_swingarm_l_43.userData.sculptComponent = { "id": "swingarm-l", "name": "Balanca traseira (l)", "level": "meso", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Balanca traseira (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "frame-downtube", "contactType": "socket", "localStart": [-0.22, 0.42, -0.1], "localEnd": [-0.67, 0.31, -0.1], "baseRadius": 0.026, "endRadius": 0.026, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_swingarm_l_43.add(mesh_swingarm_l_43);
  meshes["swingarm-l"] = mesh_swingarm_l_43;
  colliders["swingarm-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_swingarm_l_43);
  const attachment_rear_shock_44 = { "parentSocket": "swingarm-r", "contactType": "socket", "localStart": [-0.33, 0.42, 0.02], "localEnd": [-0.25, 0.66, 0.02], "baseRadius": 0.027, "endRadius": 0.027, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_rear_shock_44 = makeAttachmentEndpoint(attachment_rear_shock_44);
  const node_rear_shock_44 = new THREE.Group();
  node_rear_shock_44.name = "Amortecedor traseiro__pivot";
  node_rear_shock_44.scale.set(1, 1, 1);
  if (endpoint_rear_shock_44) {
    node_rear_shock_44.position.copy(endpoint_rear_shock_44.start);
    node_rear_shock_44.rotation.set(0, 0, 0);
  } else {
    node_rear_shock_44.position.set(0, 0, 0);
    node_rear_shock_44.rotation.set(0, 0, 0);
  }
  node_rear_shock_44.userData.sculptComponent = { "id": "rear-shock", "name": "Amortecedor traseiro", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Amortecedor traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "swingarm-r", "contactType": "socket", "localStart": [-0.33, 0.42, 0.02], "localEnd": [-0.25, 0.66, 0.02], "baseRadius": 0.027, "endRadius": 0.027, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_rear_shock_44.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_rear_shock_44);
  nodes["rear-shock"] = node_rear_shock_44;
  const mesh_rear_shock_44Geometry = endpoint_rear_shock_44 ? new THREE.CylinderGeometry(endpoint_rear_shock_44.endRadius, endpoint_rear_shock_44.baseRadius, endpoint_rear_shock_44.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_rear_shock_44) {
    mesh_rear_shock_44Geometry.scale(1, 1, 1);
  }
  const mesh_rear_shock_44 = new THREE.Mesh(
    mesh_rear_shock_44Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_rear_shock_44.name = "Amortecedor traseiro";
  if (endpoint_rear_shock_44) {
    mesh_rear_shock_44.position.copy(endpoint_rear_shock_44.midpoint);
    mesh_rear_shock_44.quaternion.copy(endpoint_rear_shock_44.quaternion);
  }
  mesh_rear_shock_44.castShadow = options.castShadow ?? true;
  mesh_rear_shock_44.receiveShadow = options.receiveShadow ?? true;
  mesh_rear_shock_44.userData.sculptComponent = { "id": "rear-shock", "name": "Amortecedor traseiro", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Amortecedor traseiro.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "swingarm-r", "contactType": "socket", "localStart": [-0.33, 0.42, 0.02], "localEnd": [-0.25, 0.66, 0.02], "baseRadius": 0.027, "endRadius": 0.027, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_rear_shock_44.add(mesh_rear_shock_44);
  meshes["rear-shock"] = mesh_rear_shock_44;
  colliders["rear-shock"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_rear_shock_44);
  const attachment_footpeg_r_45 = { "parentSocket": "crankcase", "contactType": "socket", "localStart": [-0.05, 0.32, 0.06], "localEnd": [-0.05, 0.32, 0.2], "baseRadius": 0.012, "endRadius": 0.012, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_footpeg_r_45 = makeAttachmentEndpoint(attachment_footpeg_r_45);
  const node_footpeg_r_45 = new THREE.Group();
  node_footpeg_r_45.name = "Pedaleira (r)__pivot";
  node_footpeg_r_45.scale.set(1, 1, 1);
  if (endpoint_footpeg_r_45) {
    node_footpeg_r_45.position.copy(endpoint_footpeg_r_45.start);
    node_footpeg_r_45.rotation.set(0, 0, 0);
  } else {
    node_footpeg_r_45.position.set(0, 0, 0);
    node_footpeg_r_45.rotation.set(0, 0, 0);
  }
  node_footpeg_r_45.userData.sculptComponent = { "id": "footpeg-r", "name": "Pedaleira (r)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Pedaleira (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "crankcase", "contactType": "socket", "localStart": [-0.05, 0.32, 0.06], "localEnd": [-0.05, 0.32, 0.2], "baseRadius": 0.012, "endRadius": 0.012, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_footpeg_r_45.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_footpeg_r_45);
  nodes["footpeg-r"] = node_footpeg_r_45;
  const mesh_footpeg_r_45Geometry = endpoint_footpeg_r_45 ? new THREE.CylinderGeometry(endpoint_footpeg_r_45.endRadius, endpoint_footpeg_r_45.baseRadius, endpoint_footpeg_r_45.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_footpeg_r_45) {
    mesh_footpeg_r_45Geometry.scale(1, 1, 1);
  }
  const mesh_footpeg_r_45 = new THREE.Mesh(
    mesh_footpeg_r_45Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_footpeg_r_45.name = "Pedaleira (r)";
  if (endpoint_footpeg_r_45) {
    mesh_footpeg_r_45.position.copy(endpoint_footpeg_r_45.midpoint);
    mesh_footpeg_r_45.quaternion.copy(endpoint_footpeg_r_45.quaternion);
  }
  mesh_footpeg_r_45.castShadow = options.castShadow ?? true;
  mesh_footpeg_r_45.receiveShadow = options.receiveShadow ?? true;
  mesh_footpeg_r_45.userData.sculptComponent = { "id": "footpeg-r", "name": "Pedaleira (r)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Pedaleira (r).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "crankcase", "contactType": "socket", "localStart": [-0.05, 0.32, 0.06], "localEnd": [-0.05, 0.32, 0.2], "baseRadius": 0.012, "endRadius": 0.012, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_footpeg_r_45.add(mesh_footpeg_r_45);
  meshes["footpeg-r"] = mesh_footpeg_r_45;
  colliders["footpeg-r"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_footpeg_r_45);
  const attachment_footpeg_l_46 = { "parentSocket": "crankcase", "contactType": "socket", "localStart": [-0.05, 0.32, -0.06], "localEnd": [-0.05, 0.32, -0.2], "baseRadius": 0.012, "endRadius": 0.012, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_footpeg_l_46 = makeAttachmentEndpoint(attachment_footpeg_l_46);
  const node_footpeg_l_46 = new THREE.Group();
  node_footpeg_l_46.name = "Pedaleira (l)__pivot";
  node_footpeg_l_46.scale.set(1, 1, 1);
  if (endpoint_footpeg_l_46) {
    node_footpeg_l_46.position.copy(endpoint_footpeg_l_46.start);
    node_footpeg_l_46.rotation.set(0, 0, 0);
  } else {
    node_footpeg_l_46.position.set(0, 0, 0);
    node_footpeg_l_46.rotation.set(0, 0, 0);
  }
  node_footpeg_l_46.userData.sculptComponent = { "id": "footpeg-l", "name": "Pedaleira (l)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Pedaleira (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "crankcase", "contactType": "socket", "localStart": [-0.05, 0.32, -0.06], "localEnd": [-0.05, 0.32, -0.2], "baseRadius": 0.012, "endRadius": 0.012, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_footpeg_l_46.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_footpeg_l_46);
  nodes["footpeg-l"] = node_footpeg_l_46;
  const mesh_footpeg_l_46Geometry = endpoint_footpeg_l_46 ? new THREE.CylinderGeometry(endpoint_footpeg_l_46.endRadius, endpoint_footpeg_l_46.baseRadius, endpoint_footpeg_l_46.length, 16, 6) : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_footpeg_l_46) {
    mesh_footpeg_l_46Geometry.scale(1, 1, 1);
  }
  const mesh_footpeg_l_46 = new THREE.Mesh(
    mesh_footpeg_l_46Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_footpeg_l_46.name = "Pedaleira (l)";
  if (endpoint_footpeg_l_46) {
    mesh_footpeg_l_46.position.copy(endpoint_footpeg_l_46.midpoint);
    mesh_footpeg_l_46.quaternion.copy(endpoint_footpeg_l_46.quaternion);
  }
  mesh_footpeg_l_46.castShadow = options.castShadow ?? true;
  mesh_footpeg_l_46.receiveShadow = options.receiveShadow ?? true;
  mesh_footpeg_l_46.userData.sculptComponent = { "id": "footpeg-l", "name": "Pedaleira (l)", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "cylinder unitario escalado por dimensions para o volume observado de Pedaleira (l).", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "crankcase", "contactType": "socket", "localStart": [-0.05, 0.32, -0.06], "localEnd": [-0.05, 0.32, -0.2], "baseRadius": 0.012, "endRadius": 0.012, "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 1, "height": 1, "depth": 1, "units": "meters", "confidence": 0.75 }, "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-dark-metal"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-dark-metal", "colorMaterialRecipe": { "dominantAlbedo": "rgba(35, 38, 43, 1.0)", "secondaryAlbedo": "rgba(52, 56, 62, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_footpeg_l_46.add(mesh_footpeg_l_46);
  meshes["footpeg-l"] = mesh_footpeg_l_46;
  colliders["footpeg-l"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_footpeg_l_46);
  const attachment_chain_guard_47 = { "parentSocket": "swingarm-l", "contactType": "overlap", "localStart": [-0.42, 0.4, -0.13], "localEnd": [-0.42, 0.4, -0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 };
  const endpoint_chain_guard_47 = makeAttachmentEndpoint(attachment_chain_guard_47);
  const node_chain_guard_47 = new THREE.Group();
  node_chain_guard_47.name = "Protetor de corrente__pivot";
  node_chain_guard_47.scale.set(1, 1, 1);
  if (endpoint_chain_guard_47) {
    node_chain_guard_47.position.copy(endpoint_chain_guard_47.start);
    node_chain_guard_47.rotation.set(0, 0, 0.22);
  } else {
    node_chain_guard_47.position.set(-0.42, 0.4, -0.13);
    node_chain_guard_47.rotation.set(0, 0, 0.22);
  }
  node_chain_guard_47.userData.sculptComponent = { "id": "chain-guard", "name": "Protetor de corrente", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Protetor de corrente.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "swingarm-l", "contactType": "overlap", "localStart": [-0.42, 0.4, -0.13], "localEnd": [-0.42, 0.4, -0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.36, "height": 0.06, "depth": 0.02, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.42, 0.4, -0.13], "rotation": [0, 0, 0.22] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_chain_guard_47.userData.actionProfile = { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } };
  (nodes["root"] ?? root).add(node_chain_guard_47);
  nodes["chain-guard"] = node_chain_guard_47;
  const mesh_chain_guard_47Geometry = endpoint_chain_guard_47 ? new THREE.CylinderGeometry(endpoint_chain_guard_47.endRadius, endpoint_chain_guard_47.baseRadius, endpoint_chain_guard_47.length, 16, 6) : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_chain_guard_47) {
    mesh_chain_guard_47Geometry.scale(0.36, 0.06, 0.02);
  }
  const mesh_chain_guard_47 = new THREE.Mesh(
    mesh_chain_guard_47Geometry,
    materialMap["mat-seat"] ?? new THREE.MeshStandardMaterial({ color: 8947848 })
  );
  mesh_chain_guard_47.name = "Protetor de corrente";
  if (endpoint_chain_guard_47) {
    mesh_chain_guard_47.position.copy(endpoint_chain_guard_47.midpoint);
    mesh_chain_guard_47.quaternion.copy(endpoint_chain_guard_47.quaternion);
  }
  mesh_chain_guard_47.castShadow = options.castShadow ?? true;
  mesh_chain_guard_47.receiveShadow = options.receiveShadow ?? true;
  mesh_chain_guard_47.userData.sculptComponent = { "id": "chain-guard", "name": "Protetor de corrente", "level": "micro", "role": "structure", "importance": 0.7, "confidence": 0.8, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "box unitario escalado por dimensions para o volume observado de Protetor de corrente.", "geometryDescriptor": { "topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": { "type": "none", "bevelRadius": 0, "segments": 1 }, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry" }, "parent": "root", "attachment": { "parentSocket": "swingarm-l", "contactType": "overlap", "localStart": [-0.42, 0.4, -0.13], "localEnd": [-0.42, 0.4, -0.13], "embedDepth": 0.02, "overlap": 0.02, "gapTolerance": 5e-3 }, "dimensions": { "width": 0.36, "height": 0.06, "depth": 0.02, "units": "meters", "confidence": 0.75 }, "transform": { "position": [-0.42, 0.4, -0.13], "rotation": [0, 0, 0.22] }, "actionProfile": { "animationRole": "structure", "pivot": { "mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.5 }, "transformChannels": { "translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true }, "sockets": [], "collider": { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." }, "constraints": [], "destruction": { "breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "mat-seat" } }, "material": "mat-seat", "materialLayers": ["mat-black-plastic"], "deformations": [], "joints": [], "seams": [], "surfaceDetail": { "macroRoughness": 0, "microRoughness": 0, "bumpAmplitude": 0, "normalPattern": "", "displacementPattern": "", "occlusionPattern": "", "edgeWearPattern": "", "notes": "" }, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "materialRef": "mat-black-plastic", "colorMaterialRecipe": { "dominantAlbedo": "rgba(22, 24, 29, 1.0)", "secondaryAlbedo": "rgba(34, 37, 44, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.85, "evidenceRefs": ["analysis.md#layer-5"] } };
  node_chain_guard_47.add(mesh_chain_guard_47);
  meshes["chain-guard"] = mesh_chain_guard_47;
  colliders["chain-guard"] = { "type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it." };
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_chain_guard_47);
  {
    const parent = nodes["hub-front"] ?? root;
    const geo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
    const mat = materialMap["mat-chrome"] ?? new THREE.MeshStandardMaterial({ color: 8947848 });
    const scl = [0.185, 6e-3, 6e-3];
    const axis = new THREE.Vector3(0, 1, 0).normalize();
    const radius = 0.29;
    const seed = Math.abs(axis.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(axis, seed).normalize();
    const cluster = new THREE.InstancedMesh(geo, mat, 36);
    const _m = new THREE.Matrix4();
    const _p = new THREE.Vector3();
    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(scl[0], scl[1], scl[2]);
    for (let i = 0; i < 36; i++) {
      const ang = (0 + i * 360 / 36) * Math.PI / 180;
      const dir = perp.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, ang));
      _p.copy(radius > 0 ? dir.clone().multiplyScalar(radius * 0.5) : new THREE.Vector3());
      _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      _m.compose(_p, _q, _s);
      cluster.setMatrixAt(i, _m);
    }
    cluster.instanceMatrix.needsUpdate = true;
    cluster.castShadow = options.castShadow ?? true;
    cluster.receiveShadow = options.receiveShadow ?? true;
    cluster.name = "rep-spokes-front";
    parent.add(cluster);
  }
  {
    const parent = nodes["hub-rear"] ?? root;
    const geo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
    const mat = materialMap["mat-chrome"] ?? new THREE.MeshStandardMaterial({ color: 8947848 });
    const scl = [0.16, 6e-3, 6e-3];
    const axis = new THREE.Vector3(0, 1, 0).normalize();
    const radius = 0.28;
    const seed = Math.abs(axis.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(axis, seed).normalize();
    const cluster = new THREE.InstancedMesh(geo, mat, 36);
    const _m = new THREE.Matrix4();
    const _p = new THREE.Vector3();
    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(scl[0], scl[1], scl[2]);
    for (let i = 0; i < 36; i++) {
      const ang = (5 + i * 360 / 36) * Math.PI / 180;
      const dir = perp.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, ang));
      _p.copy(radius > 0 ? dir.clone().multiplyScalar(radius * 0.5) : new THREE.Vector3());
      _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      _m.compose(_p, _q, _s);
      cluster.setMatrixAt(i, _m);
    }
    cluster.instanceMatrix.needsUpdate = true;
    cluster.castShadow = options.castShadow ?? true;
    cluster.receiveShadow = options.receiveShadow ?? true;
    cluster.name = "rep-spokes-rear";
    parent.add(cluster);
  }
  {
    const parent = nodes["tire-front"] ?? root;
    const geo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
    const mat = materialMap["mat-rubber"] ?? new THREE.MeshStandardMaterial({ color: 8947848 });
    const scl = [0.014, 0.032, 0.075];
    const axis = new THREE.Vector3(0, 0, 1).normalize();
    const radius = 0.652;
    const seed = Math.abs(axis.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(axis, seed).normalize();
    const cluster = new THREE.InstancedMesh(geo, mat, 28);
    const _m = new THREE.Matrix4();
    const _p = new THREE.Vector3();
    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(scl[0], scl[1], scl[2]);
    for (let i = 0; i < 28; i++) {
      const ang = (0 + i * 360 / 28) * Math.PI / 180;
      const dir = perp.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, ang));
      _p.copy(radius > 0 ? dir.clone().multiplyScalar(radius * 0.5) : new THREE.Vector3());
      _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      _m.compose(_p, _q, _s);
      cluster.setMatrixAt(i, _m);
    }
    cluster.instanceMatrix.needsUpdate = true;
    cluster.castShadow = options.castShadow ?? true;
    cluster.receiveShadow = options.receiveShadow ?? true;
    cluster.name = "rep-tread-front";
    parent.add(cluster);
  }
  {
    const parent = nodes["tire-rear"] ?? root;
    const geo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
    const mat = materialMap["mat-rubber"] ?? new THREE.MeshStandardMaterial({ color: 8947848 });
    const scl = [0.016, 0.04, 0.095];
    const axis = new THREE.Vector3(0, 0, 1).normalize();
    const radius = 0.612;
    const seed = Math.abs(axis.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(axis, seed).normalize();
    const cluster = new THREE.InstancedMesh(geo, mat, 26);
    const _m = new THREE.Matrix4();
    const _p = new THREE.Vector3();
    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(scl[0], scl[1], scl[2]);
    for (let i = 0; i < 26; i++) {
      const ang = (7 + i * 360 / 26) * Math.PI / 180;
      const dir = perp.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, ang));
      _p.copy(radius > 0 ? dir.clone().multiplyScalar(radius * 0.5) : new THREE.Vector3());
      _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      _m.compose(_p, _q, _s);
      cluster.setMatrixAt(i, _m);
    }
    cluster.instanceMatrix.needsUpdate = true;
    cluster.castShadow = options.castShadow ?? true;
    cluster.receiveShadow = options.receiveShadow ?? true;
    cluster.name = "rep-tread-rear";
    parent.add(cluster);
  }
  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups };
  root.userData.lookDevTargets = { "qualityPriority": "reference-fidelity", "materialPass": { "albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": { "requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry" }, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"] }, "lightingPass": { "requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"] }, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."] };
  root.userData.actionReadiness = {
    note: "Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets."
  };
  return root;
}
function createMotoTrailVenezaLookDevLights(mode = "neutral") {
  const lights = new THREE.Group();
  lights.name = "Moto Trail Veneza look-dev lights";
  const hemi = new THREE.HemisphereLight(
    mode === "reference" ? 16773334 : 15922431,
    3554114,
    mode === "grazing" ? 0.28 : mode === "reference" ? 0.72 : 0.85
  );
  lights.add(hemi);
  const key = new THREE.DirectionalLight(
    mode === "reference" ? 16764810 : 16774376,
    mode === "grazing" ? 4.2 : mode === "reference" ? 2.6 : 2.15
  );
  if (mode === "grazing") key.position.set(7.5, 1.1, 4);
  else if (mode === "reference") key.position.set(-4.5, 7.5, 5);
  else key.position.set(-4, 6, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -25e-5;
  key.shadow.normalBias = 0.018;
  key.shadow.radius = 7;
  key.shadow.blurSamples = 24;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -2.6;
  key.shadow.camera.right = 2.6;
  key.shadow.camera.top = 2.6;
  key.shadow.camera.bottom = -2.6;
  key.shadow.camera.updateProjectionMatrix();
  lights.add(key);
  const fill = new THREE.DirectionalLight(11060479, mode === "grazing" ? 0.12 : 0.42);
  fill.position.set(4, 3, 3.5);
  lights.add(fill);
  const rim = new THREE.DirectionalLight(16773572, mode === "grazing" ? 0.28 : 0.85);
  rim.position.set(0.5, 4.5, -6);
  lights.add(rim);
  lights.userData.reviewMode = mode;
  lights.userData.lightingFromPhoto = [{ "id": "key", "type": "directional", "color": "#ffffff", "intensity": 1.6, "position": [3, 4, 2.5], "role": "key" }, { "id": "fill", "type": "directional", "color": "#93c5fd", "intensity": 0.5, "position": [-3, 2, -2], "role": "fill" }, { "id": "rim", "type": "directional", "color": "#dbeafe", "intensity": 0.4, "position": [-1, 3, 3], "role": "rim" }, { "id": "ambient", "type": "ambient", "color": "#ffffff", "intensity": 0.7, "role": "base" }, { "id": "render-intent", "type": "render-settings", "role": "exposure and shadow intent", "notes": "ACESFilmic tone mapping, exposure 1.0, sRGB output; soft contact shadow via radial gradient under wheels (CSS layer) plus ambient occlusion maps per material." }];
  lights.userData.lookDevTargets = { "qualityPriority": "reference-fidelity", "materialPass": { "albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": { "requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry" }, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"] }, "lightingPass": { "requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"] }, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."] };
  return lights;
}
function frameMotoTrailVenezaCamera(camera, object, options = {}) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const margin = options.margin ?? 1.15;
  const maxDim = Math.max(size.x, size.y, size.z) * margin;
  const fov = camera.fov * Math.PI / 180;
  const distance = maxDim / 2 / Math.tan(fov / 2);
  const az = (options.azimuthDeg ?? 0) * Math.PI / 180;
  const el = (options.elevationDeg ?? 0) * Math.PI / 180;
  const dir = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el)
  );
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.near = Math.max(0.01, distance - maxDim);
  camera.far = distance + maxDim * 2;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}
function configureMotoTrailVenezaRenderer(renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}
export {
  configureMotoTrailVenezaRenderer,
  createMotoTrailVenezaLookDevLights,
  createMotoTrailVenezaModel,
  frameMotoTrailVenezaCamera
};
