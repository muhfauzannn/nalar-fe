import { type RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// File-system based routing. Any module in `app/routes` becomes a route.
// See AGENTS.md → "Routing" and the file-route conventions doc for naming rules.
export default flatRoutes() satisfies RouteConfig;
