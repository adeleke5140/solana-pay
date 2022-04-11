import { useEffect, useState } from 'react'
import {
  buildStyles,
  CircularProgressbarWithChildren,
} from 'react-circular-progressbar'
import Confetti from 'react-dom-confetti'
import 'react-circular-progressbar/dist/styles.css'

const confettiConfig = {
  angle: 90,
  spread: 100,
  startVelocity: 34,
  elementCount: 81,
  dragFriction: 0.11,
  duration: 3000,
  stagger: 3,
  width: '10px',
  height: '10px',
  colors: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'],
}

export default function Confirmed() {
  const [percentage, setPercentage] = useState(0)
  const [text, setText] = useState('🍚')
  const [confetti, showConfetti] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setPercentage(100), 100)
    const t2 = setTimeout(() => {
      setText('✅')
      showConfetti(true)
    }, 600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <CircularProgressbarWithChildren
      value={percentage}
      text={text}
      styles={buildStyles({
        pathColor: '#00BA00',
      })}
    >
      <Confetti active={confetti} config={confettiConfig} />
    </CircularProgressbarWithChildren>
  )
}
