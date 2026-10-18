import Link from "next/link";

import { PRIMARY_NAVIGATION } from "@/config/navigation";
import { ROUTES } from "@/config/routes";

export function MobileNavigation() {
  return (
    <details className="mobile-navigation">
      <summary aria-label="Open navigation">
        <span />
        <span />
      </summary>
      <nav aria-label="Mobile navigation">
        {PRIMARY_NAVIGATION.map((item) => (
          <Link href={item.href} key={item.href}>{item.label}</Link>
        ))}
        <Link href={ROUTES.login}>Sign in</Link>
        <Link className="button button-primary" href={ROUTES.book}>Book now</Link>
      </nav>
    </details>
  );
}
