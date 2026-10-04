import ru from '../content/i18n/ru.json'
import { site } from '../lib/site'
import { managers } from '../lib/links'
import { Logo, MarkS } from './Brand'
import { BOARD_LEN } from './DepartureBoard'
import { Plane, WaIcon } from './Icons'
import { SplitFlap } from './SplitFlap'
import { Globe } from './Globe'

/** 1200×630 composition for og.png (rendered at /?og=1 and captured by scripts/og.mjs). */
export function OgCard() {
  const lines = ru.hero.title_lines
  const city = site.destinations[0]?.city ?? 'PRAHA'
  return (
    <div className="og" lang="ru">
      <Globe active={0} className="og-globe" />
      <div className="og-left">
        <div className="og-brand">
          <Logo mark={52} word={24} />
          <small>{ru.brand.tagline}</small>
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
            <b className="board-from">{site.origin.city}</b>
            <Plane className="board-plane" />
            <SplitFlap text={city} length={BOARD_LEN} animate={false} />
            <b className="board-time">09:40</b>
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
            <span className="mono pass-title">{ru.pass.title}</span>
            <span className="pass-brand">
              <MarkS size={22} />
              <span className="mono">{site.brand}</span>
            </span>
          </header>
          <div className="route">
            <b>{site.origin.code}</b>
            <div className="route-line">
              <span className="route-dash" />
              <span className="route-plane">
                <Plane />
              </span>
            </div>
            <b>EUR</b>
          </div>
          <span className="cta-main">
            <span className="cta-ico">
              <WaIcon size={22} />
            </span>
            <span className="cta-main-text">
              <b>{ru.cta.primary}</b>
              <small>{ru.cta.primary_sub}</small>
            </span>
          </span>
          <div className="managers">
            <p className="label mono">{ru.managers.title}</p>
            <ul>
              {managers(ru).map((mg) => (
                <li key={mg.id} className="manager">
                  <span className={`avatar avatar--${mg.id}`}>{mg.initial}</span>
                  <span className="manager-text">
                    <b>{mg.name}</b>
                    <span className="manager-phone">{mg.phoneLabel}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
