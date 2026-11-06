import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { ParticleOrb } from "@/components/particle-orb";

export const metadata: Metadata = {
  title: "How it works — AMPERE",
  description:
    "See how AMPERE records node requests, puts measurements in context, and preserves signed evidence.",
};

const workflow = [
  {
    title: "Record the exchange.",
    text: "The collector runs beside your node, recording bounded JSON-RPC requests: method, duration, response size, and outcome. Request parameters stay out of the recording.",
  },
  {
    title: "Find the change.",
    text: "Follow the timeline, filter by network or method, and inspect individual requests. Compare the first five and latest five successful requests to see how latency has changed.",
  },
  {
    title: "Keep the evidence.",
    text: "Export the retained recording as a signed JSON report. Check its digest and signature later to see whether its contents have changed.",
  },
];

export default function HowItWorks() {
  return (
    <div className="explainer">
      <a className="skip-link" href="#project">
        Skip to project
      </a>
      <header className="app-header site-header">
        <Brand />
        <nav className="site-nav" aria-label="Project">
          <a href="#workflow">Workflow</a>
          <a href="#measurements">Measurements</a>
          <a href="#reports">Reports</a>
        </nav>
        <Link className="primary-button" href="/">
          Open app <ArrowUpRight size={17} />
        </Link>
      </header>

      <main id="project" className="explainer-main">
        <section className="project-hero" aria-labelledby="project-title">
          <div className="hero-copy">
            <p className="section-label">Infrastructure flight recorder</p>
            <h1 id="project-title">
              Trace the request.
              <br />
              Keep the evidence.
            </h1>
            <p className="hero-description">
              A clearer view of your blockchain node. Record requests,
              understand latency changes, and preserve what happened.
            </p>
            <Link className="primary-button" href="/">
              Open the recorder <ArrowUpRight size={18} />
            </Link>
          </div>
          <ParticleOrb className="hero-orb" />
          <a className="explore-link" href="#workflow">
            Explore how it works <ArrowDown size={16} />
          </a>
        </section>

        <section
          id="workflow"
          className="workflow-section"
          aria-labelledby="workflow-title"
        >
          <div className="section-intro">
            <p className="section-label">How it works</p>
            <h2 id="workflow-title">
              From an exchange
              <br />
              to an explanation.
            </h2>
            <p>
              AMPERE connects the request, the node, and the record. Each
              measurement comes with the context needed to interpret it.
            </p>
            <div
              className="evidence-path"
              aria-label="RPC request to collector to signed report"
            >
              <span>
                <i />
                RPC request
              </span>
              <span>
                <i />
                Collector
              </span>
              <span>
                <i />
                Signed report
              </span>
            </div>
          </div>
          <ol className="workflow-steps">
            {workflow.map((step, index) => (
              <li key={step.title}>
                <span className="step-number">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="measurements"
          className="measurements-section"
          aria-labelledby="measurements-title"
        >
          <div className="section-intro measurement-intro">
            <p className="section-label">Measurement scope</p>
            <h2 id="measurements-title">
              See the signal.
              <br />
              Know its limits.
            </h2>
            <p>
              Useful evidence starts with knowing what was measured. The console
              keeps those boundaries visible.
            </p>
          </div>
          <div className="measurement-list">
            <article>
              <h3>Request latency</h3>
              <p>
                Wall-clock round-trip time for AMPERE probes and benchmarks. It
                includes network travel and node processing; it does not isolate
                server CPU cost.
              </p>
            </article>
            <article>
              <h3>Node resources</h3>
              <p>
                Connection state, container counters, and host telemetry.
                Container measurements cover the node as a whole. Host
                measurements cover the collector’s machine.
              </p>
            </article>
            <article>
              <h3>Capacity &amp; admission</h3>
              <p>
                Disk-growth forecasts need at least 60 seconds of history.
                Experimental frame-transaction verdicts come from the sidecar
                and retain their reported scope.
              </p>
            </article>
          </div>
        </section>

        <section
          id="reports"
          className="report-explainer"
          aria-labelledby="reports-title"
        >
          <div>
            <p className="section-label">Portable evidence</p>
            <h2 id="reports-title">
              The view is live.
              <br />
              The record is yours.
            </h2>
            <p>
              A report packages the retained recording, measurement scope, a
              SHA-256 digest, and an Ed25519 signature in one JSON file.
            </p>
            <Link className="primary-button" href="/">
              Open app <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="integrity-details">
            <ShieldCheck size={36} strokeWidth={1.25} />
            <h3>Inspectable. Verifiable.</h3>
            <ul>
              <li>
                <Check size={16} />
                Recording and measurement context
              </li>
              <li>
                <Check size={16} />
                Digest, signature, and public key
              </li>
              <li>
                <Check size={16} />
                No raw request parameters or private keys
              </li>
            </ul>
            <p>
              A valid signature proves integrity and possession of a key. It
              does not prove operator identity or measurement truth.
            </p>
          </div>
        </section>

        <section
          className="getting-started"
          aria-labelledby="getting-started-title"
        >
          <div>
            <p className="section-label">Start here</p>
            <h2 id="getting-started-title">Your node. Your next request.</h2>
          </div>
          <div>
            <p>
              Open the console to inspect your recording. Select{" "}
              <strong>Example</strong> for clearly labeled synthetic data, or
              use <code>npm run collect</code> in your local checkout to capture
              measurements.
            </p>
            <Link className="text-link" href="/">
              Go to the recorder <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>

        <footer className="project-footer">
          <Brand />
          <p>Evidence before conclusions.</p>
          <Link href="/">
            Back to app <ArrowUpRight size={16} />
          </Link>
        </footer>
      </main>
    </div>
  );
}
