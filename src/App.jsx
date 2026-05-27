import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import Results from './pages/Results'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:sessionId" element={<Lobby />} />
        <Route path="/game/:sessionId" element={<Game />} />
        <Route path="/results/:sessionId" element={<Results />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
