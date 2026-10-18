import Link from "next/link";

import { IndustryCard } from "@/components/industries/industry-card";
import { PageContainer } from "@/components/layout/page-container";
import { INDUSTRIES } from "@/config/industries";
import { ROUTES } from "@/config/routes";
import type { BookingJourneyStep } from "@/types/booking";

const JOURNEY_STEPS: readonly BookingJourneyStep[] = [
  { number: "01", title: "Choose your category", description: "Start with the service language and journey that fits your needs." },
  { number: "02", title: "Find the right service", description: "Review a business and its services once approved directory APIs are connected." },
  { number: "03", title: "Request your time", description: "Complete a clear booking flow with backend-validated availability." },
];

export default function HomePage() {
  return (
    <main>
      <section className="home-hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <PageContainer className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-light"><span /> One platform, language that fits</p>
            <h1>Booking, thoughtfully <em>connected.</em></h1>
            <p className="hero-lead">
              A refined booking foundation for healthcare, personal care, vehicle services,
              professional consultations, and the businesses in between.
            </p>
            <div className="button-row">
              <Link className="button button-gold" href={ROUTES.book}>Find a service</Link>
              <Link className="button button-ghost" href={ROUTES.features}>Explore the platform <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="hero-principles" aria-label="Platform principles">
              <span>Category-aware</span>
              <span>Tenant-ready</span>
              <span>Privacy-minded</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Booking journey preview">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="booking-preview">
              <div className="preview-topline">
                <span className="preview-mark">GB</span>
                <span>Booking journey</span>
                <span className="status-dot">Foundation</span>
              </div>
              <div className="preview-main">
                <p>Choose a service category</p>
                <h2>Your time, your service, one clear path.</h2>
                <div className="preview-options">
                  <span>Healthcare</span>
                  <span>Personal care</span>
                  <span>Professional</span>
                </div>
              </div>
              <div className="preview-progress">
                <span className="active" />
                <span />
                <span />
              </div>
            </div>
            <div className="floating-note floating-note-one"><strong>Patient-first</strong><span>Medical terminology</span></div>
            <div className="floating-note floating-note-two"><strong>Server-side API</strong><span>Clear system boundary</span></div>
          </div>
        </PageContainer>
      </section>

      <section className="statement-strip">
        <PageContainer>
          <p>Built for businesses that value time, clarity, and the right words.</p>
          <div><span>Patients</span><i /> <span>Customers</span><i /> <span>Vehicle Owners</span><i /> <span>Clients</span></div>
        </PageContainer>
      </section>

      <section className="home-section industries-section">
        <PageContainer>
          <div className="section-heading">
            <div><p className="eyebrow">Explore by industry</p><h2>One foundation.<br /><em>Purposeful journeys.</em></h2></div>
            <p>Shared booking concepts meet the language and scheduling expectations of each service category.</p>
          </div>
          <div className="industry-grid">
            {INDUSTRIES.map((industry) => <IndustryCard industry={industry} key={industry.slug} />)}
          </div>
          <div className="center-action"><Link className="text-arrow" href={ROUTES.industries}>View all industry routes <span>→</span></Link></div>
        </PageContainer>
      </section>

      <section className="home-section journey-section">
        <PageContainer className="journey-grid">
          <div className="journey-copy">
            <p className="eyebrow eyebrow-light">A clearer journey</p>
            <h2>From intent to appointment, without the noise.</h2>
            <p>GLOBAL BOOKING is structured to make every step understandable while leaving sensitive decisions and authorization where they belong: in the backend.</p>
            <Link className="button button-ghost" href={ROUTES.howItWorks}>See how it works</Link>
          </div>
          <div className="journey-steps">
            {JOURNEY_STEPS.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.description}</p></div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="home-section feature-section">
        <PageContainer>
          <div className="section-heading compact">
            <div><p className="eyebrow">Designed with boundaries</p><h2>A strong foundation for what comes next.</h2></div>
          </div>
          <div className="feature-grid">
            <article><span>01</span><h3>Terminology that respects context</h3><p>Medical categories use Patient. Other journeys use Customer, Vehicle Owner, or Client where appropriate.</p></article>
            <article><span>02</span><h3>Independent frontend and API</h3><p>Next.js and Fastify remain separate projects, connected through a small server-side HTTP boundary.</p></article>
            <article><span>03</span><h3>Security remains authoritative</h3><p>Frontend routes never substitute for backend authentication, tenant isolation, or role-based authorization.</p></article>
          </div>
        </PageContainer>
      </section>

      <section className="home-section cta-section">
        <PageContainer>
          <div className="cta-panel">
            <div><p className="eyebrow eyebrow-light">Start a conversation</p><h2>Build a booking experience people can trust.</h2></div>
            <div><p>Share the service journey you need to support. Inquiry submission will be connected only after its backend contract is approved.</p><Link className="button button-gold" href={ROUTES.contact}>Contact the team</Link></div>
          </div>
        </PageContainer>
      </section>
    </main>
  );
}
