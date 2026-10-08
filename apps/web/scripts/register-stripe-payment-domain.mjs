import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
const appUrl = process.env.APP_URL?.trim();
const optional = process.argv.includes('--if-configured');
if (!secretKey || !appUrl) {
  if (optional) {
    process.stdout.write(
      'Stripe payment domain registration skipped: Stripe or APP_URL configuration is unavailable.\n',
    );
    process.exit(0);
  }
  throw new Error('STRIPE_SECRET_KEY and APP_URL are required.');
}
const domainName = new URL(appUrl).hostname;
const stripe = new Stripe(secretKey);

const existing = await stripe.paymentMethodDomains.list({ domain_name: domainName, limit: 1 });
const domain =
  existing.data[0] ?? (await stripe.paymentMethodDomains.create({ domain_name: domainName }));
const validated = await stripe.paymentMethodDomains.validate(domain.id);
if (validated.apple_pay?.status !== 'active')
  throw new Error(
    `Apple Pay is not active for ${domainName}: ${validated.apple_pay?.status ?? 'unknown'}`,
  );
process.stdout.write(`Apple Pay payment domain active: ${domainName}\n`);
