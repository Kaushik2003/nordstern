import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Apple touch icon — NordStern purple tile with the comet mark.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #8B7EE0 0%, #6F5FD6 100%)',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="25" r="13" stroke="#FFFFFF" strokeWidth="2.6" opacity="0.95" />
          <path
            d="M37 11C29 17.5 24.6 20.7 19.8 27.1c-2.7 3.7-2.1 6.7 1.9 5.3C26.4 30.1 31.1 23.8 37 11Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
