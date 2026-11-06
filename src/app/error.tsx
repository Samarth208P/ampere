"use client";

export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className="report-panel" role="alert">
      <h1>The console could not render.</h1>
      <p>
        Your saved recording is still on disk. Retry the view; if the error
        persists, check the collector output and preserve .ampere/recording.json
        before repairing it.
      </p>
      <button className="primary-button" onClick={retry}>
        Retry console
      </button>
    </main>
  );
}
