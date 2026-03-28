import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Users, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

function useDarkMode() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  )
  const toggle = () => {
    const next = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDark(next)
  }
  return { isDark, toggle }
}

export default function Home() {
  const navigate = useNavigate()
  const { isDark, toggle } = useDarkMode()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">

      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-ds-surface-container-low transition-colors"
        aria-label="Toggle dark mode"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-ds-on-surface-variant" />
        ) : (
          <Moon className="w-5 h-5 text-ds-on-surface-variant" />
        )}
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="text-center space-y-3">
          <h1 className="font-headline font-extrabold text-4xl text-ds-primary tracking-tight">
            Give Me The Money
          </h1>
          <p className="font-body text-ds-on-surface-variant text-base">
            Split bills without the awkward maths.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <Button
            variant="pill"
            className="w-full py-4 text-base gap-3"
            onClick={() => navigate('/scan')}
          >
            <ScanLine className="w-5 h-5" />
            Scan a Receipt
          </Button>
          <Button
            variant="pill-ghost"
            className="w-full py-4 text-base gap-3"
            onClick={() => navigate('/join')}
          >
            <Users className="w-5 h-5" />
            Join a Split
          </Button>
        </div>
      </div>
    </div>
  )
}
