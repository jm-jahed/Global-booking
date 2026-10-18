import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { ROUTES } from "@/config/routes";

export default function NotFound() {
  return (
    <main className="system-page">
      <PageContainer>
        <p className="system-code">404</p>
        <p className="eyebrow">Route not found</p>
        <h1>This path is not part of the booking journey.</h1>
        <p>Return home or explore the controlled industry categories.</p>
        <div className="button-row">
          <Link className="button button-primary" href={ROUTES.home}>Return home</Link>
          <Link className="button button-secondary" href={ROUTES.industries}>Explore industries</Link>
        </div>
      </PageContainer>
    </main>
  );
}
