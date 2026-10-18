"use client";

export default function ErrorPage({ retry }: { readonly error: Error & { digest?: string }; readonly retry: () => void }) {
  return (
    <main className="system-page">
      <div className="page-container">
        <p className="eyebrow">Something interrupted the journey</p>
        <h1>We could not complete this page request.</h1>
        <p>No booking or account action was submitted. You can safely try rendering the page again.</p>
        <button className="button button-primary" onClick={retry} type="button">Try again</button>
      </div>
    </main>
  );
}
