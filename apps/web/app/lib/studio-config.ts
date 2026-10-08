export const studioPackages = {
  FOUNDATION: {
    name: 'Foundation site',
    depositCents: 35000,
    priceEnvironment: 'STRIPE_STUDIO_FOUNDATION_DEPOSIT_PRICE_ID',
    detail: 'A focused marketing site, launch page, or portfolio with a clear conversion path.',
  },
  PRODUCT: {
    name: 'Product redesign',
    depositCents: 75000,
    priceEnvironment: 'STRIPE_STUDIO_PRODUCT_DEPOSIT_PRICE_ID',
    detail:
      'A production-minded redesign for a web product with key flows and a reusable UI system.',
  },
  PLATFORM: {
    name: 'Platform build',
    depositCents: 150000,
    priceEnvironment: 'STRIPE_STUDIO_PLATFORM_DEPOSIT_PRICE_ID',
    detail:
      'A scoped application build with architecture, implementation, and launch-readiness work.',
  },
  CUSTOM: {
    name: 'Custom engagement',
    depositCents: null,
    priceEnvironment: null,
    detail: 'For complex, ongoing, or unusual work that needs a written quote before payment.',
  },
} as const;

export type StudioPackageId = keyof typeof studioPackages;

export function isStudioPackageId(value: string): value is StudioPackageId {
  return value in studioPackages;
}

export function studioPriceEnvironment(packageId: Exclude<StudioPackageId, 'CUSTOM'>): string {
  return studioPackages[packageId].priceEnvironment;
}
