'use client';

import { RouteError } from './components/route-boundary';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <RouteError reset={reset} title="VouchNet needs a moment" />
      </body>
    </html>
  );
}
