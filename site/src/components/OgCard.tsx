import ru from '../content/i18n/ru.json'
import { site } from '../lib/site'
import { gateLinks } from '../lib/links'
import { Mark } from './Mark'
import { Plane, BOARD_LEN } from './DepartureBoard'
import { SplitFlap } from './SplitFlap'
import { Globe } from './Globe'

/** 1200×630 composition for og.png (rendered at /?og=1 and captured by scripts/og.mjs). */
export function OgCard() {
  const lines = ru.hero.title_lines
  const links = gateLinks(ru).slice(0, 3)
  const city = site.destinations[0]?.city ?? 'PRAHA'
  return (
    <div className="og" lang="ru">
      <Globe active={0} className="og-globe" />
      <div className="og-left">
        <div className="og-brand">
          <Mark size={44} />
          <span>
            <b>{site.brand}</b>
            <small>{ru.brand.tagline}</small>
          </span>
        </div>
        <h1 className="og-slogan">
          {lines.map((l, i) => (
            <span key={i}>
              {i === lines.length - 1 && l.endsWith('.') ? (
                <>
                  {l.slice(0, -1)}
                  <span className="accent-dot">.</span>
                </>
              ) : (
                l
              )}
            </span>
          ))}
        </h1>
        <div className="board og-board">
          <div className="board-row">
            <span className="board-col board-from">
              <small>{ru.board.from}</small>
              <b>{site.origin.city}</b>
            </span>
            <Plane className="board-plane" />
            <span className="board-col board-to">
              <small>{ru.board.to}</small>
              <SplitFlap text={city} length={BOARD_LEN} animate={false} />
            </span>
            <span className="board-col board-time">
              <small>{ru.board.time}</small>
              <b>09:40</b>
            </span>
            <span className="board-status">
              <i className="dot" />
              <span>{ru.board.status}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="og-pass">
        <div className="pass">
          <header className="pass-head">
            <span className="mono">{ru.pass.title}</span>
            <span className="pass-brand">
              <Mark size={18} />
              {site.brand}
            </span>
          </header>
          <div className="route">
            <div className="route-end">
              <b>{site.origin.code}</b>
              <small>{ru.pass.from_city}</small>
            </div>
            <div className="route-line">
              <span className="route-dash" />
              <span className="route-plane">
                <Plane />
              </span>
            </div>
            <div className="route-end route-end--to">
              <b>EUR</b>
              <small>{ru.pass.to_city}</small>
            </div>
          </div>
          <div className="gates">
            <p className="gates-title mono">{ru.pass.gates}</p>
            <ol>
              {links.map((l, i) => (
                <li key={l.id}>
                  <span className={`gate ${l.primary ? 'gate--primary' : ''}`}>
                    <span className="gate-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="gate-text">
                      <span className="gate-label">
                        {l.label}
                        {l.primary && <span className="badge">{ru.badge.free}</span>}
                      </span>
                      {l.sub && <span className="gate-sub">{l.sub}</span>}
                    </span>
                    <span className="gate-arrow">
                      <svg viewBox="0 0 16 16" width="14" height="14">
                        <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
