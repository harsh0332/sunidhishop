import { CreatorContentType, Product } from './product';

export interface CreatorContent {
  id: string; // e.g. "reel_027" or "reel-027"
  type: CreatorContentType;
  title: string;
  url?: string;
  thumbnail?: string;
  campaignId?: string;
  campaignName?: string;
  status: 'published' | 'draft' | 'archived';
  products: Product[];
  publishedAt?: string;
}

export interface Campaign {
  id: string; // e.g. "festive_2026" or "festive-2026"
  name: string;
  description?: string;
  status: 'published' | 'draft' | 'archived';
  contents: CreatorContent[];
  products: Product[];
  featuredProducts?: Product[];
}
