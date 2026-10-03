export type ProductAI = {
  name: string;
  category: string;
  color: string;
  material: string;
  style: string;
  description: string;
  tags: string[];
  headline: string;
  caption: string;
  cta: string;
  productFamily?: string;
  view?: string;
};

export type AIStatus = "enabled" | "fallback";

export type ProductAsset = {
  publicId: string;
  assetId?: string;
  original: string;
  catalog: string;
  square: string;
  portrait: string;
  story: string;
  backgroundRemoved: string;
  marketingSquare: string;
  marketingStory: string;
  ai: ProductAI;
  aiStatus: AIStatus;
  aiMessage?: string;
  price?: string;
  stock?: string;
  etag?: string;
  phash?: string;
  width?: number;
  height?: number;
  bytes?: number;
  focusScore?: number;
  mediaHealth?: "great" | "good" | "needs-fix";
  restored?: string;
  livingCreative?: string;
  accessibilityScore?: number;
  provenanceUrl?: string;
  model3d?: { publicId: string; secureUrl: string; format?: string };
};

export type SiteTheme = "auto" | "editorial" | "luxe" | "bold" | "minimal" | "tech";

export type BrandStrategy = {
  niche: string;
  audience: string;
  personality: string;
  collectionName: string;
  heroLine: string;
  campaignAngle: string;
  accent: string;
  secondary: string;
  background: string;
  recommendedTheme: Exclude<SiteTheme, "auto">;
};
