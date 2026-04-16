import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/PolicyLayout";
import { POLICY_VERSION_TERMS } from "@/lib/policy";

export const metadata: Metadata = {
  title: "Parent verification · Youth Dev",
  description: "Planned verified parental consent flow.",
};

export default function ParentPage() {
  return (
    <PolicyLayout title="Verified parental consent" version={POLICY_VERSION_TERMS}>
      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">Status: planned</h2>
        <p>
          The current MVP uses a <strong className="text-zinc-200">guardian attestation</strong>{" "}
          checkbox during consent. That is not the same as cryptographically or legally
          verified parental consent required in many jurisdictions (for example parts of
          COPPA, India DPDP, and other frameworks).
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">What a production flow typically adds</h2>
        <ul className="list-inside list-disc space-y-2 text-zinc-400">
          <li>Verified parent email or phone OTP, or payment-card micro-charge verification.</li>
          <li>Separate parent dashboard with controls for data, AI use, and deletion.</li>
          <li>Audit logs, policy versioning, and region-specific age rules.</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">Next engineering steps</h2>
        <p>
          Wire an auth provider, a minimal parent account type, and a backend table linking
          child sessions to verified guardians. Until then, treat Youth Dev as a supervised
          prototype.
        </p>
        <p>
          <Link className="text-aqua-400 underline" href="/consent">
            Return to consent
          </Link>
        </p>
      </section>
    </PolicyLayout>
  );
}
