import { NavLink, Outlet, useNavigation } from 'react-router-dom';
import { BarChart3Icon, GraduationCapIcon, LayoutDashboardIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
  { to: '/stats', label: 'Statistics', icon: BarChart3Icon, end: false },
];

export function AppLayout() {
  const navigation = useNavigation();
  return (
    <div className="min-h-svh bg-[radial-gradient(ellipse_90%_45%_at_50%_-5%,color-mix(in_oklch,var(--primary)_6%,transparent),transparent)] bg-no-repeat">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCapIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span>STET Test Series</span>
              <span className="text-xs font-normal text-muted-foreground">Computer Science</span>
            </span>
          </NavLink>
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main
        className={cn('mx-auto max-w-7xl px-4 py-8 transition-opacity sm:px-6', navigation.state === 'loading' && 'opacity-60')}
        aria-busy={navigation.state === 'loading'}
      >
        <Outlet />
      </main>
    </div>
  );
}

/** Exam screens hide global navigation to minimise distractions. */
export function ExamLayout() {
  return (
    <div className="min-h-svh bg-background">
      <Outlet />
    </div>
  );
}
