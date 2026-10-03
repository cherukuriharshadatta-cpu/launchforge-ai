# LaunchForge AI

# LaunchForge AI V7.6

**Submission-safe video patch:** the region-gated Cloudinary Image-to-Video beta is removed from the demo UI. Single-product videos now use Cloudinary's documented zoompan image→MP4 delivery transformation and are verified server-side before being shown.

# LaunchForge AI V7 — Launch Intelligence

**Give LaunchForge the messy supplier folder. It reconstructs the business hidden inside it.**

LaunchForge V7 turns raw product media into launch-ready commerce: duplicate detection, SKU reconstruction, multi-angle grouping, media-quality scoring, structured inventory metadata, 360-ready product experiences, Brand DNA, storefronts, campaign imagery, vertical video, and optional social publishing.

**Hackathon:** Pixels to Products — Cloudinary AI Hackathon 2026  
**Track:** PS-03 — Your Media-Savvy Startup

## The V7 differentiator

Most media tools start after a seller already has a clean catalog. LaunchForge starts *before* the catalog exists.

A seller can upload a chaotic WhatsApp/supplier folder and LaunchForge tries to answer:

- Which files are exact duplicates?
- Which photos are probably the same SKU from different angles?
- Which photos are color variants of the same product family?
- Which assets are blurry or too small for launch?
- Which products are missing price or stock?
- Which multi-angle groups are ready for a 360 product experience?
- What kind of brand/storefront should this inventory become?
- What launch creative/video can be generated from the exact product media?

## Cloudinary capabilities used

### Smart SKU Builder
- Upload API `etag` for exact duplicate detection.
- Upload API `phash: true` for perceptual fingerprints.
- Cloudinary AI Vision for `productFamily`, category, visible color and camera/view angle.
- LaunchForge combines these signals to group multi-angle media and variants.

### Media Doctor
- `quality_analysis: true` returns a Cloudinary focus score.
- Resolution checks identify weak supplier media.
- `e_gen_restore` + `e_improve` create rescue versions for poor-quality images.

### Living Commerce Media
V7 automatically creates LaunchForge structured metadata fields when the seller first saves commerce data:
- `ss_name`
- `ss_price`
- `ss_stock`
- `ss_description`

Edits are written back to Cloudinary. The resulting living creative reads metadata during delivery and can conditionally render `SOLD OUT` when stock reaches zero.

### 360-ready Product Gallery
When a SKU has enough distinct views, LaunchForge:
1. creates ordered Cloudinary frame assets,
2. applies one spin tag,
3. opens Cloudinary Product Gallery with `{ mediaType: "spin" }`.

If client-side asset lists are not enabled, V7 keeps a frame-scrubber fallback so the demo remains usable.

### Generative Product Lab
- `e_gen_background_replace` creates merchant-directed lifestyle/campaign scenes while preserving the foreground product.
- `e_gen_recolor` previews merchant-approved colorways from a real SKU photo.
- Both are progressive enhancements: LaunchForge keeps the original product available if the generative transformation is unavailable or pending.

### Accessibility + provenance (optional beta features)
If your Cloudinary account has access, V7 can request color-blind accessibility analysis at upload time and surface the score in Media Doctor. V7 can also expose a `fl_c2pa` signed delivery link for product media when C2PA access is enabled.

### AI Launch Director
Cloudinary Image Generation can use the existing product `asset_id` as a managed reference image. LaunchForge sends an art-direction prompt to the `image_to_image` endpoint and stores the result back in Cloudinary.

This requires the **Cloudinary Image Generation add-on**. The rest of V7 works without it.

### Website / Brand DNA
Cloudinary AI Vision analyzes the full catalog and LaunchForge derives:
- niche
- target audience
- brand personality
- collection name
- hero line
- campaign angle
- palette
- recommended storefront direction

Store directions: Editorial, Luxe, Bold, Minimal, Tech.

### Video Studio
- Single product by default.
- Optional multi-product campaign mode.
- Cloudinary zoom/pan transformations for deterministic MP4s.
- Optional Cloudinary Image-to-Video beta for prompt-driven AI Motion.

### Publish
Optional OAuth integrations for Instagram professional accounts and YouTube.

---

## Required `.env.local`

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Enable **Cloudinary AI Vision** for product understanding.

No extra environment variables are required for pHash, ETag, basic quality analysis, structured metadata, transformations, or the Product Gallery tag preparation.

## Optional add-ons

### Image Generation
Enable Cloudinary **Image Generation** to use AI Launch Director.

### Image to Video
Enable **Image to Video** to use the AI Motion mode in Video Studio.

### Generative transformations
`gen_restore`, generative background replacement/recolor and related transformations may consume special transformation/add-on quota depending on your plan.

### Optional accessibility + C2PA betas
Only enable these if Cloudinary has activated them for your account:

```env
CLOUDINARY_ACCESSIBILITY_ANALYSIS=true
CLOUDINARY_C2PA_ENABLED=true
```

Leave both `false`/unset otherwise.

## Optional login via Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

If omitted, use the clearly labeled local demo studio.

## Optional Instagram publishing

```env
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/social/instagram/callback
META_GRAPH_VERSION=v25.0
```

## Optional YouTube publishing

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/social/youtube/callback
```

## Run

```bash
npm install
npm run dev
```

Windows PowerShell fallback:

```cmd
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

## Best V7 demo flow

1. Upload a deliberately messy set: duplicates + 3 angles of one product + another color + a second product.
2. Show exact duplicates disappearing automatically.
3. Open **Launch Intelligence**.
4. Show SKU families, view angles, variants and media-health results.
5. If one SKU has 3+ useful views, click **Create 360 view**.
6. Edit a product and add price + stock; return to Launch Intelligence and show the **Living Commerce Media** creative.
7. Change stock to `0` and demonstrate the metadata-driven SOLD OUT creative after Cloudinary/CDN refresh.
8. Try **Generative Product Lab**: create a new scene or colorway for one SKU.
9. Use **AI Launch Director** if Image Generation is enabled.
10. Generate Brand DNA and show a niche-aware storefront.
11. Generate a single-product Reel / Short.
12. Show Publish connections.

## Why Cloudinary is the product core

Cloudinary is used for media storage, immutable asset IDs, ETags, pHash fingerprints, AI Vision, quality analysis, tags/context, structured metadata, smart crop, auto quality/format, background removal, generative restoration, generative scene replacement/recolor, conditional metadata transformations, ordered spin frames, Product Gallery, image generation, optional accessibility/C2PA analysis, still-to-video, AI image-to-video, and final delivery.

LaunchForge is not a website builder that happens to upload images. The business is reconstructed *from media*, and nearly every output is created or driven by the Cloudinary media graph.
