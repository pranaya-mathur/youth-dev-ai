import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { POLICY_VERSION_PRIVACY } from "@/lib/policy";

export const metadata: Metadata = {
  title: "Privacy Policy · Youth Dev",
  description: "How Youth Dev handles personal data, AI processing, and minors.",
};

export default function PrivacyPage() {
  return (
    <PolicyLayout title="Privacy Policy" version={POLICY_VERSION_PRIVACY}>
      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">1. Who this applies to</h2>
        <p>
          Youth Dev is designed for adolescents roughly{" "}
          <strong className="text-zinc-200">11–18 years old</strong>. If you are younger
          than the digital consent age in your country, you should use Youth Dev{" "}
          <strong className="text-zinc-200">together with a parent or guardian</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">2. What we collect (MVP)</h2>
        <ul className="list-inside list-disc space-y-2 text-zinc-400">
          <li>
            <strong className="text-zinc-200">Age band</strong> (for example 11–13) so
            language and flows can stay age-appropriate.
          </li>
          <li>
            <strong className="text-zinc-200">Optional nickname</strong> you choose (not
            your legal name).
          </li>
          <li>
            <strong className="text-zinc-200">Assessment responses</strong> (multiple
            choice selections and any optional short text you add).
          </li>
          <li>
            <strong className="text-zinc-200">Consent records</strong> (what you agreed
            to, policy version identifiers, and a timestamp) so we can demonstrate
            transparency.
          </li>
        </ul>
        <p>
          In this MVP slice, data is stored{" "}
          <strong className="text-zinc-200">in your browser</strong> unless your organisation
          turns on <strong className="text-zinc-200">secure cloud sync</strong> for a pilot. A
          production version should clearly say where any online copy is kept (for example which
          country or provider) in an updated policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">3. AI processing</h2>
        <p>
          When you request a profile, your responses (and optional notes) may be sent to
          an external model provider (for example OpenAI) to generate strength-based
          feedback. We apply automated{" "}
          <strong className="text-zinc-200">content moderation</strong> before and/or
          alongside generation to reduce harmful or disallowed content.
        </p>
        <p>
          Do <strong className="text-zinc-200">not</strong> paste sensitive personal data
          (government IDs, exact addresses, medical records, passwords, or other
          people&apos;s private information) into optional fields.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">4. Legal bases (high level)</h2>
        <p>
          Depending on your jurisdiction, processing may rely on{" "}
          <strong className="text-zinc-200">consent</strong>,{" "}
          <strong className="text-zinc-200">legitimate interests</strong> (operating and
          securing the service), and/or{" "}
          <strong className="text-zinc-200">parental authorization</strong> for minors.
          Your counsel should map these to local law (for example India DPDP, GDPR where
          relevant, and US state privacy laws).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">5. Retention</h2>
        <p>
          Session data in the browser generally clears when you close the browser tab or
          window (depending on browser settings). Production retention windows should be
          defined explicitly (for example &quot;90 days then delete&quot;) and enforced in
          backend systems.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">6. Your rights</h2>
        <p>
          Depending on applicable law, you may have rights to access, correct, delete, or
          export personal data, and to withdraw consent. See also the{" "}
          <a className="text-aqua-400 underline" href="/data-rights">
            Data &amp; rights
          </a>{" "}
          page for practical steps in this MVP.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">7. International transfers</h2>
        <p>
          AI providers may process data in regions outside your country. A production
          policy should list sub-processors and describe transfer safeguards.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">8. Contact</h2>
        <p>
          Replace this placeholder with a monitored inbox:{" "}
          <strong className="text-zinc-200">privacy@yourdomain.example</strong>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">9. Changes</h2>
        <p>
          When these practices change materially, we will update the policy version and
          ask you to review and accept the update before continuing to use Youth Dev.
        </p>
      </section>
    </PolicyLayout>
  );
}
