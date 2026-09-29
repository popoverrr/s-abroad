import { useI18n } from '../i18n'
import { useSound } from '../audio/SoundProvider'
import { site } from '../lib/site'
import { SplitFlap } from './SplitFlap'

export const BOARD_LEN = Math.max(8, ...site.destinations.map((d) => d.city.length))

export function Plane({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.5 11.2 14 7.1V3.4a1.6 1.6 0 0 0-3.2 0v3.7L3.4 11.2a.8.8 0 0 0-.4.7v1.2l7.8-2.3v4.9l-2.2 1.6v1.3l3.8-1.1 3.8 1.1v-1.3l-2.2-1.6v-4.9l7.8 2.3v-1.2a.8.8 0 0 0-.3-.7Z"
        transform="rotate(90 12 12)"
      />
    </svg>
  )
}

export function DepartureBoard({ text, time, animate }: { text: string; time: string; animate: boolean }) {
  const { t } = useI18n()
  const { click } = useSound()
  return (
    <div className="board">
      <p className="sr-only" aria-live="off">
        {t.board.sr}
      </p>
      <div className="board-row" aria-hidden="true">
        <span className="board-col board-from">
          <small className="t-fade">{t.board.from}</small>
          <b>{site.origin.city}</b>
        </span>
        <Plane className="board-plane" />
        <span className="board-col board-to">
          <small className="t-fade">{t.board.to}</small>
          {/* Without motion the whole word is remounted and fades in instead of flipping. */}
          <SplitFlap key={animate ? 'flip' : text} text={text} length={BOARD_LEN} animate={animate} onTick={click} />
        </span>
        <span className="board-col board-time">
          <small className="t-fade">{t.board.time}</small>
          <b>{time}</b>
        </span>
        <span className="board-status">
          <i className="dot" />
          <span className="t-fade">{t.board.status}</span>
        </span>
      </div>
    </div>
  )
}
