import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/unbounded/wght.css'
import '@fontsource-variable/onest/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
// Kazakh: Unbounded and JetBrains Mono lack ә ғ қ ң ұ һ — KZ uses Montserrat + IBM Plex Mono.
import '@fontsource-variable/montserrat/wght.css'
import '@fontsource/ibm-plex-mono/cyrillic-500.css'
import '@fontsource/ibm-plex-mono/cyrillic-ext-500.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './styles/index.css'
import { LazyMotion, domAnimation } from 'motion/react'
import App from './App'
import { OgCard } from './components/OgCard'
import { I18nProvider } from './i18n'
import { SoundProvider } from './audio/SoundProvider'

const og = new URLSearchParams(location.search).has('og')
if (og) document.documentElement.classList.add('is-og')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {og ? (
      <OgCard />
    ) : (
      <LazyMotion features={domAnimation} strict>
        <I18nProvider>
          <SoundProvider>
            <App />
          </SoundProvider>
        </I18nProvider>
      </LazyMotion>
    )}
  </StrictMode>,
)
