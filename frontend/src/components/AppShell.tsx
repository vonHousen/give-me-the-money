interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-ds-surface relative overflow-hidden">
      <div className="fixed -top-32 -right-32 w-96 h-96 bg-ds-primary rounded-full blur-[120px] opacity-15 pointer-events-none" />
      <div className="fixed -bottom-32 -left-32 w-96 h-96 bg-ds-secondary-container rounded-full blur-[120px] opacity-20 pointer-events-none" />
      {children}
    </div>
  )
}
