LaunchForge AI
Turn product chaos into a business ready to launch.
LaunchForge AI is an AI-powered commerce launch platform built for small sellers, D2C founders, boutiques, wholesalers, and first-time entrepreneurs who often start with one thing: a messy folder of product photos.
Instead of manually organizing images, writing product information, cleaning media, building a storefront, and preparing marketing creatives, LaunchForge turns raw supplier/product media into a structured, launch-ready ecommerce workflow powered by Cloudinary.
Hackathon
Pixels to Products — Cloudinary AI Hackathon 2026
Track: PS-03 — Your Media-Savvy Startup
The Problem
Small sellers often receive inventory as:
- WhatsApp images
- supplier folders
- random phone photos
- duplicate images
- multiple angles of the same product
- inconsistent image quality
- no SKU structure
- no product metadata
- no storefront
- no launch creatives
The media exists, but the business structure does not.
The Solution
LaunchForge reconstructs the commerce structure hidden inside that media.
Core workflow
Raw product media → AI understanding → product catalog → launch intelligence → storefront → campaign → product video
LaunchForge can:
- bulk upload product media
- identify products with Cloudinary AI Vision
- extract category, color, style, material, tags, and descriptions
- reconstruct SKU families from raw media
- detect exact duplicates with ETag
- use pHash as a visual-similarity signal
- identify multiple views of the same product
- check media quality before launch
- manage price and stock in bulk
- export/import catalog data through CSV
- store commerce data as Cloudinary structured metadata
- generate niche-aware storefronts
- create campaign imagery from managed product assets
- generate vertical product videos with Cloudinary transformations
- prepare assets for social publishing workflows
Why LaunchForge Is Different
Many tools start after a catalog already exists.
LaunchForge starts before that.
The seller can begin with an unstructured folder of media and LaunchForge helps reconstruct the actual business inventory behind it.
Give us the mess. We give you the business.

Cloudinary at the Core
Cloudinary is not used as passive image hosting. It is the media intelligence and transformation layer of the product.
Cloudinary capabilities used
Upload & Media Management
- Upload API
- managed media assets
- folders, tags, context, metadata
- optimized delivery
AI Understanding
- Cloudinary AI Vision
- structured product analysis
- product/category/attribute extraction
Catalog Intelligence
- ETag for exact duplicate detection
- perceptual hash (pHash) as a similarity signal
- AI-generated product-family and camera-angle metadata
Media Doctor
- image quality/focus analysis
- launch-readiness checks
- generative restoration where available
Living Commerce Media
- Cloudinary structured metadata
- product name
- price
- stock
- descriptions
- catalog attributes
Creative Generation
- Cloudinary Image Generation where enabled
- product-reference campaign imagery
- Cloudinary transformations
- background/scene generation where supported
- recolor workflows where supported
Video
- Cloudinary image-to-video delivery using motion transformations
- vertical MP4 product videos
- multiple motion styles for social content
Main Product Areas
1. Launch
Upload raw product photos and start a launch project.
2. Catalog
LaunchForge turns media into structured products.
The seller can review or edit:
- product name
- category
- color
- style
- material
- description
- tags
- price
- stock
For larger catalogs, bulk inventory tools and CSV import/export avoid editing products one by one.
3. Launch Intelligence
Launch Intelligence is where LaunchForge converts media into actionable commerce structure.
It includes:
- Smart SKU Builder
- duplicate detection
- multi-angle product grouping
- Media Doctor
- inventory metadata
- market research shortcuts
- campaign generation
- multi-angle product galleries
- Cloudinary capability visibility
- launch-readiness scoring
4. Website Studio
LaunchForge uses the catalog and brand context to generate storefront directions such as:
- Editorial
- Luxe
- Bold
- Minimal
- Tech
The design can adapt to the niche instead of forcing every business into one template.
5. Video Studio
Create product-focused vertical videos for:
- Instagram Reels
- YouTube Shorts
- product launches
- social campaigns
Single-product mode keeps one SKU as the focus, while campaign mode is used only when the seller deliberately selects multiple products.
Example
A seller uploads:
- front image of a black sneaker
- side image of the same sneaker
- back image of the same sneaker
- another supplier photo
- a watch
- a backpack
LaunchForge can turn that into:
- structured sneaker product
- multiple views grouped under the product
- product attributes
- catalog metadata
- price and stock
- storefront listing
- campaign image
- vertical launch video
The seller starts with files and ends with launch-ready commerce assets.
Tech Stack
- Next.js
- TypeScript
- React
- Cloudinary
- Cloudinary Node SDK
- Cloudinary AI Vision
- Cloudinary transformations
- Cloudinary structured metadata
Optional integrations can be configured separately for authentication and publishing workflows.
Local Setup
1. Clone the repository
git clone https://github.com/cherukuriharshadatta-cpu/launchforge-ai.git
cd launchforge-ai
2. Install dependencies
npm install
3. Create .env.local
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
Never commit .env.local or real API secrets.
4. Run the app
npm run dev
Open:
http://localhost:3000
Recommended Demo Flow
1. Upload a small folder containing:
   - multiple views of one product
   - another product
   - one duplicate image
2. Show automatic product understanding.
3. Open Catalog and review the generated attributes.
4. Open Launch Intelligence.
5. Show SKU reconstruction, duplicate handling, media quality, and metadata.
6. Add price/stock.
7. Open Website Studio and generate a storefront.
8. Generate campaign imagery.
9. Open Video Studio and generate a vertical product video.
Security
Secrets are stored locally in .env.local and are excluded from the repository through .gitignore.
Do not expose:
- CLOUDINARY_API_SECRET
- OAuth client secrets
- private access tokens
Repository
https://github.com/cherukuriharshadatta-cpu/launchforge-ai
License
MIT License
