import HomePage from './pages/HomePage'
import { Analytics } from '@vercel/analytics/react'

export default function App() {
  return (
    <>
      <HomePage />
      <Analytics />
    </>
  )
}
