import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { CompassIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';

export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (!notFound) console.error(error);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <EmptyState
        title={notFound ? 'Page not found' : 'Something went wrong'}
        icon={notFound ? <CompassIcon /> : <TriangleAlertIcon />}
        action={
          <Button asChild size="lg">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      >
        {notFound
          ? 'This result may have been removed — only the latest 10 results are kept.'
          : 'An unexpected error occurred. Your saved progress is not affected.'}
      </EmptyState>
    </div>
  );
}
