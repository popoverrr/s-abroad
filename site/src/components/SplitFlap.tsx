import { useEffect, useRef, useState } from 'react'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const rnd = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

type CellProps = { ch: string; delay: number; animate: boolean; onTick?: () => void }

/** One split-flap cell: cycles 3–6 random glyphs (45 ms each), then lands on the target with a longer flip. */
function Cell({ ch, delay, animate, onTick }: CellProps) {
  const [shown, setShown] = useState(ch)
  const [prev, setPrev] = useState(ch)
  const [flip, setFlip] = useState(0)
  const [final, setFinal] = useState(true)
  const shownRef = useRef(ch)
  const tickRef = useRef(onTick)
  tickRef.current = onTick

  useEffect(() => {
    if (ch === shownRef.current) return
    if (!animate) {
      shownRef.current = ch
      setPrev(ch)
      setShown(ch)
      return
    }
    const steps = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, rnd)
    steps.push(ch)
    const timers = steps.map((c, i) =>
      window.setTimeout(() => {
        setPrev(shownRef.current)
        shownRef.current = c
        setShown(c)
        setFinal(i === steps.length - 1)
        setFlip((f) => f + 1)
        tickRef.current?.()
      }, delay + i * 45),
    )
    return () => timers.forEach(clearTimeout)
  }, [ch, delay, animate])

  return (
    <span className="cell">
      <span className="half top">
        <i>{shown}</i>
      </span>
      <span className="half bottom">
        <i>{shown}</i>
      </span>
      {flip > 0 && prev !== shown && (
        <span key={flip} className={`half top flap ${final ? 'flap--final' : ''}`}>
          <i>{prev}</i>
        </span>
      )}
    </span>
  )
}

export function SplitFlap({ text, length, animate, onTick }: { text: string; length: number; animate: boolean; onTick?: () => void }) {
  const chars = text.toUpperCase().padEnd(length, ' ').slice(0, length).split('')
  return (
    <span className="flaps" aria-hidden="true">
      {chars.map((c, i) => (
        <Cell key={i} ch={c === ' ' ? ' ' : c} delay={i * 40} animate={animate} onTick={onTick} />
      ))}
    </span>
  )
}
