import 'server-only';
import { studioPriceEnvironment, type StudioPackageId } from './studio-config';

export function configuredStudioPriceId(packageId: Exclude<StudioPackageId, 'CUSTOM'>): string {
  const value = process.env[studioPriceEnvironment(packageId)]?.trim();
  if (value === undefined || value.length === 0) throw new Error('STUDIO_PRICE_NOT_CONFIGURED');
  return value;
}
