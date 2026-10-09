import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const NEXT_THEME = { system: 'light', light: 'dark', dark: 'system' } as const;
type ThemeName = keyof typeof NEXT_THEME;

const ICONS = { system: MonitorIcon, light: SunIcon, dark: MoonIcon } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current: ThemeName = theme === 'light' || theme === 'dark' ? theme : 'system';
  const Icon = ICONS[current];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(NEXT_THEME[current])}
          aria-label={`Theme: ${current}. Switch to ${NEXT_THEME[current]}`}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Theme: {current}</TooltipContent>
    </Tooltip>
  );
}
