import { createAPIFileRoute } from '@tanstack/react-start/api';
import { logMetrics } from '../../lib/server-functions';

export const APIRoute = createAPIFileRoute('/api/log')({
  POST: async ({ request }) => {
    try {
      const data = await request.json();
      const result = await logMetrics({ data });
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
});
