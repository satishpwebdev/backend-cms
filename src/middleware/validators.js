import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const siteSchema = z.object({
  name: z.string().min(1),
  wpUrl: z.string().url(),
  wpUsername: z.string().min(1),
  wpPassword: z.string().min(1),
});

export const rowSchema = z.object({
  siteId: z.string().cuid().optional(),
  pageId: z.string().default(''),
  slug: z.string().default(''),
  course: z.string().default(''),
  details: z.string().default(''),
  content: z.string().default(''),
  tabs_links: z.string().default(''),
  tabsLinks: z.string().default(''),
  banner_url: z.string().default(''),
  bannerUrl: z.string().default(''),
});
