import { Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Scan from '@/pages/Scan'
import Review from '@/pages/Review'
import Swipe from '@/pages/Swipe'
import Summary from '@/pages/Summary'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/review" element={<Review />} />
      <Route path="/swipe" element={<Swipe />} />
      <Route path="/summary" element={<Summary />} />
    </Routes>
  )
}
