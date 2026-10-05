## 🚀 Live Demo

👉 **[Open LaunchForge AI](https://launchforge-ai-65yf.vercel.app/)**


# LaunchForge AI

**Turn product chaos into a business ready to launch.**

LaunchForge AI is a Cloudinary-powered commerce launch studio for small sellers, boutiques, D2C founders and wholesalers who start with an unstructured folder of product photos instead of a clean ecommerce catalog.

**Hackathon:** Pixels to Products — Cloudinary AI Hackathon 2026  
**Track:** PS-03 — Your Media-Savvy Startup

## What LaunchForge does

**Messy supplier media → AI product understanding → structured catalog → launch intelligence → storefront → campaign → cinematic product video**

LaunchForge can:

- bulk-upload product media to Cloudinary
- analyze products with Cloudinary AI Vision
- extract product name, category, material, color, style, tags and camera view
- reconstruct likely SKU families from AI identity + ETag + pHash evidence
- detect exact duplicates
- flag weak media using Cloudinary quality analysis and resolution checks
- manage price and stock at scale, including CSV workflows
- keep commerce data attached to managed media
- generate niche-aware storefront directions
- create campaign imagery from managed product assets
- turn a single product still into a **3-shot vertical Reel** using Cloudinary zoompan, video transitions and text overlays
- optionally publish through Instagram / YouTube integrations when OAuth credentials are configured

> **Give us the mess. We give you the business.**

## Why it stands out

Most ecommerce tools assume the seller already has a clean product catalog. LaunchForge starts **before the catalog exists**.

The media folder itself becomes the input to the business-building workflow. Cloudinary is therefore not passive storage: it is the upload, AI understanding, metadata, transformation, optimization, creative and video layer that the product depends on.

## Cloudinary at the core

| Cloudinary capability | How LaunchForge uses it |
|---|---|
| Upload API | Raw supplier/product media ingestion |
| AI Vision | Structured product understanding and camera/view metadata |
| ETag | Exact duplicate detection |
| pHash | Supporting perceptual-similarity evidence |
| Quality Analysis | Media Doctor focus/quality checks |
| Structured/context metadata | Product and commerce data attached to media |
| Responsive transformations | Catalog, square, portrait and story derivatives |
| `f_auto` / `q_auto` | Optimized delivery |
| Generative transforms | Restore / background / recolor where account access allows |
| Image Generation | Campaign imagery where the add-on is enabled |
| Zoompan | Product still → motion clip |
| Video splice + transitions | 3-shot cinematic Reel composition |
| Video text layers | Product headline/name/CTA overlays |
| Product Gallery / 3D | Optional real 3D/AR asset viewing |

Cloudinary documents zoompan for animating static images, video concatenation/splicing, cross-fade transitions and text/video layers; the final Reel engine combines those primitives into one product-video workflow.

## Judge Demo Mode

The hosted deployment remains fully explorable even if the project owner's Cloudinary AI Vision free-tier allowance is exhausted.

When AI Vision returns a quota/rate-limit response, LaunchForge transparently switches to a **pre-analyzed demo catalog backed by real Cloudinary assets**. Judges can still explore:

- Catalog
- Launch Intelligence
- Media Doctor
- pricing / stock workflows
- Website Studio
- campaign media
- multi-angle product views
- Video Studio
- Publish workflow

The submitted demo video shows the full fresh-upload AI Vision workflow working end-to-end before the allowance was exhausted.

## Bring Your Own Cloudinary Keys

Judges who want to test **fresh AI Vision analysis** can run LaunchForge locally with their own Cloudinary account. Secrets are never committed to the repository.

### 1. Clone

```bash
git clone https://github.com/cherukuriharshadatta-cpu/launchforge-ai.git
cd launchforge-ai
npm install
```

### 2. Create `.env.local`

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Enable the **Cloudinary AI Vision** add-on in that Cloudinary account if you want fresh product analysis.

### 3. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

> Security note: LaunchForge does **not** ask judges to paste their Cloudinary API secret into the public Vercel deployment. BYOK testing is local so the secret stays on the judge's machine/server environment.

## Final Video Studio

Single-product Reel generation uses a deterministic Cloudinary-native storyboard:

1. create three different zoom/pan camera shots from the same managed product image
2. save the derived clips back to Cloudinary
3. splice them into one vertical MP4
4. add Cloudinary transition effects between shots
5. overlay product headline, name and CTA
6. verify the resulting media URL before returning it to the UI
7. automatically fall back to a verified single motion clip if advanced composition is unavailable

This avoids depending on region-gated Image-to-Video beta access while still demonstrating real Cloudinary video editing.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Cloudinary Node SDK
- Cloudinary AI Vision
- Cloudinary image/video transformations
- optional Supabase authentication

## Recommended judge flow

1. Open the live deployment.
2. Use the preloaded judge demo catalog if the hosted AI Vision allowance is exhausted.
3. Open **Catalog** to inspect product data, prices and stock.
4. Open **Launch Intelligence** to inspect SKU evidence, media health and metadata.
5. Open **Website Studio** to switch storefront directions.
6. Open **Video Studio** and generate a cinematic single-product Reel.
7. For fresh AI Vision testing, use the BYOK local setup above.

## Security

`.env.local` is gitignored. Never commit:

- `CLOUDINARY_API_SECRET`
- OAuth client secrets
- private access tokens

## Repository

https://github.com/cherukuriharshadatta-cpu/launchforge-ai

## License

MIT
