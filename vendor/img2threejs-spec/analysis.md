# Image Analysis — moto-hero-3d.png (layered protocol)

Reference: `C:\Users\User\OneDrive\Desktop\Cursor programas\moto-hero-3d.png` (720×1280 approx, object on white background, 3/4 front-right elevated view).

## Layer 1 — Identification & classification

- Observation: a dual-sport ("trail") motorcycle, single-cylinder commuter class, styled like a Honda NXR 160 Bros. Confidence 0.9 (badging unreadable at this resolution — inference from fairing/fender/suspension geometry).
- Work type: motorcycle (dual-sport). Broad classification: wheeled vehicle, mechanical assembly.
- primaryDomain: object.

## Layer 2 — Overall form & silhouette

- Bounding volume: elongated cuboid, length ≈ 2.05 m, height ≈ 1.15 m (to mirror tips ≈ 1.15), width ≈ 0.8 m (handlebar span) narrowing to ≈ 0.25 m at body. Reference dimension: rear wheel diameter ≈ 0.62 m (17" wheel + tire).
- Symmetry: bilateral along the longitudinal plane (single-sided details: side stand near-side, exhaust far-side — inference).
- Shape language: geometric-mechanical with organic-curved shell panels (tank, fender, cowl are lofted/blended surfaces; chassis parts are cylinders/boxes).
- Camera: 3/4 front view from the right, slightly elevated (~15° pitch), front wheel turned slightly toward camera.

## Layer 3 — Macro → meso → micro decomposition

Macro assemblies:
1. Front wheel assembly — tire (knobby, dual-sport tread), spoked rim, hub with disc brake.
2. Front suspension — long telescopic fork, black rubber gaiters (accordion boots), lower triple clamp, high-mounted front fender (blue).
3. Steering group — handlebar (tubular, raised), mirrors on stalks (teardrop housings), lever pair, cable runs.
4. Headlight cowl — angular blue mask with black windscreen wedge and rectangular headlight unit.
5. Body shell — fuel tank (blue, teardrop with knee recesses), black side radiator-style shrouds connecting tank to cowl, stepped black seat (long, dual-level), blue/black rear side panels, raised tail with grab rails.
6. Powertrain — engine block (silver/alloy crankcase, black cylinder), black frame downtube visible, chain case, kick/foot pegs.
7. Rear group — box-section swingarm, rear shock (mono, mostly occluded), spoked rear wheel with same knobby tread, chain guard, rear fender/mudflap descending, tail light (occluded).

Meso: fork = 2 stanchions + 2 gaiters + fender bracket; wheel = tire torus + rim ring + ~36 spokes + hub cylinder + brake disc; engine = crankcase + cylinder + head + side covers (circular clutch cover); seat = two-level cushion; tail = grab-rail loop each side.

Micro: tread blocks on tires, fork gaiter pleats, headlight lens, turn-signal stalks (small, amber, on cowl), engine cooling fins, chain sprocket teeth (occluded).

## Layer 4 — Spatial relationships

- <front wheel, socket, fork lower ends> (axle through hub, contactType socket)
- <fork, attached-to, steering head via triple clamp> (overlap)
- <front fender, attached-to, lower triple clamp above wheel> (bracket, overlap) — high fender, large gap over tire
- <headlight cowl, attached-to, steering head> (front of it), above front fender line
- <tank, behind, cowl; flush-with seat front> (butt joint)
- <seat, behind, tank; above, rear side panels> (overlap)
- <engine, inside, frame cradle; below, tank> (embedded between wheels, closer to front)
- <swingarm, attached-to, frame rear pivot; holds rear axle> (socket)
- <mirrors, attached-to, handlebar ends via stalks> (socket)
- Ground plane: both tires tangent to a single plane; side stand deployed in photo (ignore for model — bike should stand upright).

## Layer 5 — Materials & surface (PBR)

- Blue shell panels (tank, cowl, front fender, tail panels): albedo vivid navy blue (≈ #1e3a8a–#1d4ed8 range, mid-low value), metalness 0.0–0.2 (painted ABS/steel), roughness 0.25–0.35 (gloss paint with clearcoat), clearcoat ≈ 0.6.
- Black plastics (shrouds, seat base, fender underside, gaiters, chain guard): albedo near-black (#111318), metalness 0, roughness 0.7–0.9 (matte textured plastic).
- Seat cushion: black vinyl, roughness 0.85, slight sheen on edges.
- Engine/crankcase/hubs: bare alloy, albedo light gray (#c8ccd2), metalness 0.9, roughness 0.35–0.45 (cast, semi-brushed).
- Spokes/rims: chromed steel, metalness 1.0, roughness 0.15.
- Tires: near-black rubber (#141414), metalness 0, roughness 0.95.
- Fork stanchions (visible above gaiters): black; lower legs black.
- Inference: highlights on tank are studio lighting, not albedo — de-light before any projection.

## Layer 6 — Color & finish

- Two-tone identity: vivid navy blue (mid value, high saturation) + matte black. Alloy silver as accent (engine, wheels).
- Finish: gloss (blue panels), matte (black plastics), metallic (engine/wheel).
- No gradients on panels — flat coats with clearcoat specular. Amber turn signals (small emissive-ish accents).

## Layer 7 — Identity-defining features

1. High front fender with large tire gap (dual-sport signature).
2. Fork gaiters (accordion pleats) — black.
3. Knobby block tread on both tires.
4. Angular headlight cowl with black windscreen wedge.
5. Stepped seat + raised tail with grab rails.
6. Spoked wheels (not alloy mags).
7. Silver crankcase against black cylinder.
8. Long flat exhaust heat shield line (far side, mostly occluded).

## Layer 8 — Uncertainty & single-image limits

- Hidden: entire left (far) side — exhaust muffler shape, shift lever, side stand mount detail. Mirror-symmetric reconstruction assumed; exhaust placed on far side by convention for this model (inference).
- Occluded: rear shock, sprocket/chain detail, tail light, instrument cluster face.
- Uncertain: exact decal/badge graphics (unreadable) — omitted, flat color instead.
- Perspective: front wheel slightly steered; model will be built straight.
- Verdict: suitable for approximate/stylized code-only reconstruction; exact decals and hidden-side hardware are out of scope. This is a stylized hero prop, not photogrammetry.
