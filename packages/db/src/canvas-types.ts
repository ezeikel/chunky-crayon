/**
 * Shared canvas types — moved to the dependency-free leaf package
 * @one-colored-pixel/canvas-sync so BOTH clients (web via coloring-ui, mobile
 * via a direct dep) and the server import ONE source, and so the React Native
 * Hermes bundle never pulls the Prisma client / `ws` (which importing the db
 * barrel would). db re-exports them here for server convenience.
 */
export * from "@one-colored-pixel/canvas-sync";
