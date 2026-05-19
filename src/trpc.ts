import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { transformer } from './shared/transformer';
import type { AppRouter } from './server/trpc';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer,
    }),
  ],
});
