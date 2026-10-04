import { useState } from 'react'

// Manager photos from assets/team (synced to src/assets/team) — hashed by Vite.
const files = import.meta.glob('../assets/team/*.{jpg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const SIZES = [96, 192, 288]
const src = (photo: string, w: number, ext: 'jpg' | 'webp') => files[`../assets/team/${photo}-${w}.${ext}`]
const srcset = (photo: string, ext: 'jpg' | 'webp') =>
  SIZES.map((w) => (src(photo, w, ext) ? `${src(photo, w, ext)} ${w}w` : ''))
    .filter(Boolean)
    .join(', ')

/**
 * Manager avatar (v7): photo in a circle with an ink stroke and a hard offset shadow.
 * The coloured circle with the initial stays underneath — it shows if there is no photo or it fails to load.
 */
export function Avatar({ id, photo, initial, name, size, lazy = false }: { id: string; photo?: string; initial: string; name: string; size: number; lazy?: boolean }) {
  const [failed, setFailed] = useState(false)
  const has = !!photo && !!src(photo, 192, 'jpg') && !failed
  return (
    <span className={`avatar avatar--${id} ${has ? 'has-photo' : ''}`} style={{ width: size, height: size }}>
      <span className="avatar-initial" aria-hidden="true">
        {initial}
      </span>
      {has && (
        <picture>
          <source type="image/webp" srcSet={srcset(photo, 'webp')} sizes={`${size}px`} />
          <img
            src={src(photo, 192, 'jpg')}
            srcSet={srcset(photo, 'jpg')}
            sizes={`${size}px`}
            width={size}
            height={size}
            alt={name}
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            onError={() => setFailed(true)}
          />
        </picture>
      )}
    </span>
  )
}
