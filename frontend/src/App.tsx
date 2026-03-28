import { Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Scan from '@/pages/Scan'
import Review from '@/pages/Review'
import Share from '@/pages/Share'
import JoinSettlement from '@/pages/JoinSettlement'
import JoinSplit from '@/pages/JoinSplit'
import Swipe from '@/pages/Swipe'
import SettlementStatus from '@/pages/SettlementStatus'
import Summary from '@/pages/Summary'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/review" element={<Review />} />
      <Route path="/share/:settlementId" element={<Share />} />
      <Route path="/split/:settlementId" element={<JoinSettlement />} />
      <Route path="/join" element={<JoinSplit />} />
      <Route path="/swipe/:settlementId" element={<Swipe />} />
      <Route path="/settlement/:settlementId/status" element={<SettlementStatus />} />
      <Route path="/summary" element={<Summary />} />
    </Routes>
  )
}
