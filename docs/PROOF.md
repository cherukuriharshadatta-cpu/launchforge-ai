# Evidence, not claims

This document is a fast audit map for judges who want to verify LaunchForge's Cloudinary implementation in source.

| Claim | Source | What to inspect |
|---|---|---|
| Raw supplier media is uploaded into Cloudinary | `app/api/product/route.ts` | `cloudinary.uploader.upload(...)`, inventory folder, `phash: true`, `quality_analysis: true` |
| Product understanding uses Cloudinary AI Vision | `lib/aiVision.ts` | `/analyze/ai_vision_general`, structured schema, `productFamily`, camera `view` |
| Exact duplicate detection is based on Cloudinary ETag | `app/page.tsx`, `app/api/demo-catalog/route.ts` | ETag de-duplication and removal of duplicate uploaded assets |
| pHash supports Product Graph reconstruction | `app/page.tsx` | `hammingHex`, `sameSkuEvidence`, conservative pHash threshold |
| Product Graph does not merge on visual similarity alone | `app/page.tsx` | category guard, closure/silhouette/shape guards, token overlap requirements |
| Reconstruction confidence is explainable | `app/page.tsx` | `groupProof(...)`, evidence labels and confidence score |
| Cloudinary proof is visible in-product | `app/page.tsx` | `CloudinaryXRayModal` with source/transformed/Reel links |
| Commerce values stay attached to assets | `app/api/product/update/route.ts`, `lib/commerceMetadata.ts` | structured metadata + context for name, price, stock, description |
| Optimized delivery stays Cloudinary-native | `app/api/product/route.ts`, `app/api/demo-catalog/route.ts` | `q_auto`, `f_auto`, gravity-aware catalog/social derivatives |
| Campaign generation uses managed product references | `app/api/campaign-image/route.ts` | Cloudinary `image_to_image`, `managed_asset` reference images |
| Product motion uses Cloudinary | `app/api/reel/route.ts` | `e_zoompan`, three derived clips |
| Reel editing uses Cloudinary | `app/api/reel/route.ts` | `fl_splice`, transitions, `l_text`, MP4 delivery |
| Reel failure does not break judging | `app/api/reel/route.ts` | verified middle-shot fallback |
| Hosted AI quota does not break judging | `app/page.tsx`, `app/api/demo-catalog/route.ts` | 429 detection → deterministic replay catalog |
| Fresh AI testing is supported safely | `README.md` | BYOK setup; secrets stay in the judge's own `.env.local` |
| Automated evidence checks | `tests/judge-readiness.test.mjs`, `tests/final-edge.test.mjs` | Product Graph, demo fixture integrity, Cloudinary pipeline, Reel, fallback, secret hygiene |

## Reconstruction contract used in Judge Replay

The bundled judge fixture deliberately contains:

- 6 raw supplier files
- 3 different views of the same black sneaker
- 1 byte-identical duplicate of the sneaker front image
- 1 different sneaker
- 1 watch

Expected reconstruction:

```text
6 raw files
→ 1 exact duplicate rejected
→ 5 unique media assets
→ 3 real SKU families
→ 1 multi-angle SKU with 3 trusted views
```

The important claim is not that LaunchForge can make a prettier photo.

The claim is that **LaunchForge can reconstruct the commerce objects hidden inside unstructured product media and then keep those objects connected to Cloudinary through launch.**
