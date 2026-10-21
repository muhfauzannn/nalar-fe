/**
 * App-wide navigation data. Keep labels/hrefs here (not hard-coded in the
 * Navbar/Footer components) — same rule as `siteConfig`.
 */

export type NavItem = {
  label: string;
  href: string;
};

/** Public top-nav links shown before a student signs in. */
export const mainNav: readonly NavItem[] = [
  { label: "Beranda", href: "/" },
] as const;

/** Primary student navigation shared by the public navbar and LMS shell. */
export const studentNav: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Course saya", href: "/courses" },
  { label: "Kelola course", href: "/manage" },
] as const;

/** Where a student lands right after signing in or registering. */
export const postAuthPath = "/dashboard";

/** Footer link columns — three groups beside the brand block. */
export const footerNav: readonly { title: string; items: readonly NavItem[] }[] =
  [
    {
      title: "About",
      items: [
        { label: "Our Story", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Press", href: "/press" },
      ],
    },
    {
      title: "Product",
      items: [
        { label: "Features", href: "/features" },
        { label: "Question Bank", href: "/features#question-bank" },
        { label: "Mock Test", href: "/features#mock-test" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Help",
      items: [
        { label: "Support", href: "/support" },
        { label: "FAQ", href: "/faq" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ] as const;

/** Text-based social links (this Lucide build ships no brand marks). */
export const socialLinks: readonly NavItem[] = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "X", href: "https://x.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
] as const;
