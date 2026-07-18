/**
 * Public API of the `auth` feature. Everything outside the feature imports from
 * this barrel — never reach into `./pages/*` or `./components/*`.
 */
export { AuthShell } from "./components/auth-shell";
export { LoginPage } from "./pages/login-page";
export { RegisterPage } from "./pages/register-page";
