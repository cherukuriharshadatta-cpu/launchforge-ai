# LaunchForge judge proof

## What is technically unique

LaunchForge starts before a clean ecommerce catalog exists. Its Product Graph reconstructs product families from messy supplier media using AI product identity, exact duplicate evidence (ETag), perceptual similarity support (pHash), and camera-view reasoning.

## Deterministic judging

The live deployment exposes **Judge Replay**, a quota-safe path that uses a pre-analyzed Cloudinary-backed launch. The demo route intentionally contains:

- three verified views of one sneaker SKU,
- two additional distinct products,
- one exact duplicate supplier file that is removed by ETag.

This makes the reconstruction story visible even when the hosted AI Vision allowance is exhausted.

## Cloudinary X-Ray

Every reconstructed SKU can expose a Cloudinary X-Ray showing the actual managed asset ID, AI output, ETag, pHash, quality signal, structured commerce metadata, optimized derivative and video pipeline.

## Video pipeline

The final Reel engine uses Cloudinary-native media operations:

1. three independent image-to-video `zoompan` shots,
2. Cloudinary video uploads for derived shots,
3. splice + transitions,
4. product text overlays,
5. vertical MP4 delivery,
6. verified single-shot fallback if advanced composition is unavailable.

## Automated checks

Run:

```bash
npm run verify
```

For a full judge sanity check:

```bash
npm run judge-check
```
