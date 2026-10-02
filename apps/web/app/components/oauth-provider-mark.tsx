type OAuthProviderMarkProps = {
  provider: 'google' | 'github' | 'linkedin';
};

/**
 * Provider marks only appear beside a clear sign-in action. They intentionally
 * use each provider's recognized brand treatment instead of VouchNet-styled
 * approximations, so people can identify the authorization destination.
 */
export function OAuthProviderMark({ provider }: OAuthProviderMarkProps) {
  if (provider === 'google') {
    return (
      <svg aria-hidden="true" className="oauth-provider-mark" viewBox="0 0 18 18">
        <path
          d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.842 2.078-1.797 2.716v2.258h2.909c1.702-1.567 2.688-3.874 2.688-6.614Z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.837.859-3.047.859-2.344 0-4.328-1.585-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18Z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.594.102-1.172.282-1.71V4.958H.957A8.998 8.998 0 0 0 0 9c0 1.45.348 2.824.957 4.042l3.007-2.332Z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.32 0 2.507.454 3.44 1.345l2.581-2.582C13.462.891 11.43 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.165 6.656 3.58 9 3.58Z"
          fill="#EA4335"
        />
      </svg>
    );
  }

  if (provider === 'github') {
    return (
      <svg aria-hidden="true" className="oauth-provider-mark" viewBox="0 0 16 16">
        <path
          d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.49c-2.23.49-2.7-.95-2.7-.95-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.65-.89-3.65-3.96 0-.88.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.64 7.64 0 0 1 8 4.8c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.27.83 2.15 0 3.08-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.14.46.55.38A8 8 0 0 0 8 0Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="oauth-provider-mark" viewBox="0 0 24 24">
      <path
        d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35v-11.5h3.41v1.57h.05c.48-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.43v6.35ZM5.34 7.39a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.06H3.56v-11.5h3.56v11.5ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
