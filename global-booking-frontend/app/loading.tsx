export default function Loading() {
  return (
    <main className="loading-page" aria-busy="true" aria-label="Loading page">
      <div className="page-container">
        <div className="loading-line loading-line-short" />
        <div className="loading-line loading-line-title" />
        <div className="loading-line" />
      </div>
    </main>
  );
}
