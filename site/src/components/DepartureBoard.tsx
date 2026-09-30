import { useI18n } from '../i18n'
import { useSound } from '../audio/SoundProvider'
import { site } from '../lib/site'
import { SplitFlap } from './SplitFlap'
import { Plane } from './Icons'

export const BOARD_LEN = Math.max(8, ...site.destinations.map((d) => d.city.length))

export function DepartureBoard({ text, time, animate }: { text: string; time: string; animate: boolean }) {
  const { t } = useI18n()
  const { click } = useSound()
  return (
    <div className="board">
      <p className="sr-only" aria-live="off">
        {t.board.sr}
      </p>
      <div className="board-row" aria-hidden="true">
        <b className="board-from">{site.origin.city}</b>
        <Plane className="board-plane" />
        {/* Without motion the whole word is remounted and fades in instead of flipping. */}
        <SplitFlap key={animate ? 'flip' : text} text={text} length={BOARD_LEN} animate={animate} onTick={click} />
        <b className="board-time">{time}</b>
        <span className="board-status">
          <i className="dot" />
          <span className="t-fade">{t.board.status}</span>
        </span>
      </div>
    </div>
  )
}
