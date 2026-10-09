import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from 'next-themes';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from './app/router';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={150}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
        {/* Vercel Web Analytics: page views only, active when deployed on Vercel. */}
        <Analytics />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
