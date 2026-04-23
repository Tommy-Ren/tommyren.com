import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ResumePage from './pages/ResumePage'
import BackgroundPage from './pages/BackgroundPage'
import PortfolioPage from './pages/PortfolioPage'
import ProjectsPage from './pages/ProjectsPage'
import CVPage from './pages/CVPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/resume" element={<ResumePage />} />
      <Route path="/background" element={<BackgroundPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/cv" element={<CVPage />} />
    </Routes>
  )
}
