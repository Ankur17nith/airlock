import { lazy, Suspense, useEffect, useState } from 'react'
import { Footer, Header } from './components/chrome'
import { Landing } from './landing/Landing'
import './landing/landing.css'

const Checker = lazy(() => import('./app/Checker'))

/** Hash routes: #/ (landing, with #/#section anchors) and #/app. */
function useRoute() {
  const get = () => (location.hash.startsWith('#/app') ? 'app' : 'home')
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => {
      setRoute(get())
      const anchor = location.hash.match(/^#\/#(.+)$/)?.[1]
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export default function App() {
  const route = useRoute()
  return (
    <>
      <Header route={route} />
      {route === 'app' ? (
        <Suspense fallback={<div className="wrap" style={{ padding: 80 }}>Loading…</div>}>
          <Checker />
        </Suspense>
      ) : (
        <Landing />
      )}
      <Footer />
    </>
  )
}
