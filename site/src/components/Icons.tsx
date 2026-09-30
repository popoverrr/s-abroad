// Simple monochrome icons (currentColor). Brand colours of the networks are intentionally not used.
type P = { size?: number }

export function WaIcon({ size = 20 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.8 2.7 4.3 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z"
      />
    </svg>
  )
}

export function PhoneIcon({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M6.6 3.5h2.6l1.5 4-1.9 1.3a11 11 0 0 0 6.4 6.4l1.3-1.9 4 1.5v2.6a2.1 2.1 0 0 1-2.3 2.1A16.7 16.7 0 0 1 4.5 5.8a2.1 2.1 0 0 1 2.1-2.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function InstagramIcon({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TikTokIcon({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M14 3.5v11.3a3.7 3.7 0 1 1-3.7-3.7M14 3.5c.4 2.6 2.3 4.4 5 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ThreadsIcon({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M16.9 11.2c-.6-3-3-4.1-5.3-3.9-2 .2-3.4 1.4-3.4 3 0 1.8 1.8 2.9 3.8 2.7 2.8-.3 3.7-2.5 3.4-5M16.9 11.2c2.5 1 3 3.8 1.6 5.8-1.4 2.2-4 3.2-6.8 3.1-4.8-.2-7.5-3.4-7.5-8.1S7 3.9 12 3.9c3.4 0 5.7 1.6 6.8 4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const SOCIAL_ICON = { instagram: InstagramIcon, tiktok: TikTokIcon, threads: ThreadsIcon }

export function Plane({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.5 11.2 14 7.1V3.4a1.6 1.6 0 0 0-3.2 0v3.7L3.4 11.2a.8.8 0 0 0-.4.7v1.2l7.8-2.3v4.9l-2.2 1.6v1.3l3.8-1.1 3.8 1.1v-1.3l-2.2-1.6v-4.9l7.8 2.3v-1.2a.8.8 0 0 0-.3-.7Z"
        transform="rotate(90 12 12)"
      />
    </svg>
  )
}
