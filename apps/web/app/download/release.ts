const version = '1.5.0';
const githubReleaseBase = `https://github.com/theworker02/VouchNet/releases/download/v${version}`;

export const desktopRelease = {
  version,
  releasedAt: '2026-10-28',
  platform: 'Windows x64',
  nsis: {
    fileName: `VouchNetSetup-${version}-x64.exe`,
    href: `${githubReleaseBase}/VouchNetSetup-${version}-x64.exe`,
  },
  msi: {
    fileName: `VouchNet-${version}-x64.msi`,
    href: `${githubReleaseBase}/VouchNet-${version}-x64.msi`,
  },
  checksumsHref: `${githubReleaseBase}/VouchNet-${version}-x64.sha256`,
  notesPath: `/releases/${version}`,
} as const;
