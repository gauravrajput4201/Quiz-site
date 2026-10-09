import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../quiz/pages/DashboardPage';
import {
  dashboardLoader,
  resultLoader,
  sessionLoader,
  statisticsLoader,
} from '../quiz/pages/loaders';
import { QuizSessionPage } from '../quiz/pages/QuizSessionPage';
import { ResultPage } from '../quiz/pages/ResultPage';
import { RouteErrorPage } from '../quiz/pages/RouteErrorPage';
import { AppLayout, ExamLayout } from './AppLayout';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage />, loader: dashboardLoader },
      { path: 'results/:resultId', element: <ResultPage />, loader: resultLoader, errorElement: <RouteErrorPage /> },
      {
        path: 'stats',
        loader: statisticsLoader,
        // Charts (recharts) are only needed here, so they load on demand.
        lazy: async () => ({ Component: (await import('../quiz/pages/StatisticsPage')).StatisticsPage }),
      },
      { path: '*', element: <RouteErrorPage />, loader: () => { throw new Response('Not found', { status: 404 }); } },
    ],
  },
  {
    element: <ExamLayout />,
    errorElement: <RouteErrorPage />,
    children: [{ path: 'session', element: <QuizSessionPage />, loader: sessionLoader }],
  },
]);
