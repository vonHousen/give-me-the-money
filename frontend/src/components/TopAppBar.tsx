import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface TopAppBarProps {
  title?: string
  hideBack?: boolean
  action?: React.ReactNode
  className?: string
}

export function TopAppBar({
  title = 'Give Me The Money',
  hideBack = false,
  action,
  className,
}: TopAppBarProps) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4',
        'bg-ds-surface-container-low dark:bg-ds-surface-container',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {!hideBack && (
          <button
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-ds-surface-container transition-colors active:scale-95 duration-150"
          >
            <ArrowLeft className="w-5 h-5 text-ds-primary" />
          </button>
        )}
        <h1 className="font-headline font-extrabold text-ds-primary tracking-tight text-xl">
          {title}
        </h1>
      </div>
      {action && <div>{action}</div>}
    </header>
  )
}
