import { ImageResponse } from 'next/og';

export const alt = 'VouchNet — Professional context, not professional noise';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** A native social card keeps shared links recognizable without an external image service. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: 'linear-gradient(135deg, #08162e 0%, #102b61 58%, #175d94 100%)',
          color: '#f8fbff',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '68px 76px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'rgba(142, 177, 255, 0.14)',
            border: '1px solid rgba(194, 215, 255, 0.3)',
            borderRadius: 26,
            display: 'flex',
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '-0.8px',
            padding: '18px 24px',
            width: 'auto',
          }}
        >
          <span
            style={{
              alignItems: 'center',
              background: '#4e7fff',
              borderRadius: 14,
              display: 'flex',
              fontSize: 32,
              fontWeight: 900,
              height: 50,
              justifyContent: 'center',
              marginRight: 14,
              width: 50,
            }}
          >
            V
          </span>
          VouchNet
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 920 }}>
          <span
            style={{
              color: '#a8c0ff',
              display: 'flex',
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: '3px',
              textTransform: 'uppercase',
            }}
          >
            Professional network for proof of work
          </span>
          <span
            style={{
              display: 'flex',
              fontSize: 77,
              fontWeight: 800,
              letterSpacing: '-4px',
              lineHeight: 1.02,
              marginTop: 20,
            }}
          >
            Professional context, not professional noise.
          </span>
        </div>

        <div
          style={{
            color: '#d5e3ff',
            display: 'flex',
            fontSize: 27,
            fontWeight: 600,
            gap: 30,
          }}
        >
          <span>Proof of work</span>
          <span>Peer signals</span>
          <span>Transparent opportunities</span>
        </div>
      </div>
    ),
    size,
  );
}
