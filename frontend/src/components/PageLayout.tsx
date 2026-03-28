import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main className={cn('pt-8 pb-16 px-6 max-w-md mx-auto', className)}>
      {children}
    </main>
  )
}
