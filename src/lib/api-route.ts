// Shim for @tanstack/react-start/api createAPIFileRoute
// Delegates to @tanstack/react-router's createFileRoute which provides
// all needed route methods (.update, ._addFileChildren, etc.)

import { createFileRoute } from "@tanstack/react-router";

type MethodHandler = (ctx: { request: Request }) => Promise<Response>;

type ApiHandlers = {
  GET?: MethodHandler;
  POST?: MethodHandler;
  PUT?: MethodHandler;
  DELETE?: MethodHandler;
  PATCH?: MethodHandler;
};

/**
 * createAPIFileRoute creates a file-based API route.
 * 
 * In @tanstack/react-start, this is called as:
 *   createAPIFileRoute("/api/path")({ GET, POST })
 * 
 * We delegate to createFileRoute which returns a proper route object
 * with .update(), ._addFileChildren(), etc.
 */
export function createAPIFileRoute(path: string) {
  return (handlers: ApiHandlers) => {
    // createFileRoute returns a builder; call it with the handlers
    // to get a proper TanStack Router route object
    const route = createFileRoute(path)({
      ...handlers,
      // API routes don't need a component
      component: undefined as unknown as () => null,
    });
    return route;
  };
}
