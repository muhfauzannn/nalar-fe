/**
 * Public API of the `home` feature. Everything outside the feature imports from
 * this barrel — never reach into `./pages/*`, `./components/*` or `./api/*`.
 */
export { HomePage } from "./pages/home-page";
export { getHomeContent, type HomeContent } from "./api/get-home-content";
