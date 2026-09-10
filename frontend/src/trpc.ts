import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@bookslot/trpc-types";

const endpoint = import.meta.env.VITE_TRPC_URL ?? "http://localhost:3000/dev/api/trpc";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: endpoint,
      headers() {
        const token = window.localStorage.getItem("bookslot-token");

        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
