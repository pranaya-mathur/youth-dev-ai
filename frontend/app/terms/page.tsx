import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { POLICY_VERSION_TERMS } from "@/lib/policy";

export const metadata: Metadata = {
  title: "Terms of Use · Youth Dev",
  description: "Rules for using the Youth Dev MVP experience.",
};

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms of Use" version={POLICY_VERSION_TERMS}>
      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">1. What Youth Dev is</h2>
        <p>
          Youth Dev provides an interactive, strengths-first reflection experience. It is{" "}
          <strong className="text-zinc-200">not</strong> therapy, counseling, or medical
          advice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">2. Eligibility and consent</h2>
        <p>
          You must provide accurate information about your age band. If you are in an age
          band that requires guardian involvement, you confirm that a parent or guardian
          has reviewed Youth Dev with you and agrees you may use it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">3. Acceptable use</h2>
        <ul className="list-inside list-disc space-y-2 text-zinc-400">
          <li>No harassment, hate, threats, or sexual content.</li>
          <li>No attempts to obtain harmful instructions or illegal content.</li>
          <li>No misuse of the service to collect information about other people.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">4. AI limitations</h2>
        <p>
          Outputs may be imperfect or generic. You should not rely on Youth Dev outputs
          as a description of your worth, abilities, or future. If you are in crisis,
          contact local emergency services or a trusted adult immediately.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">5. Accounts and availability</h2>
        <p>
          The MVP may change, pause, or reset without notice. Availability is not
          guaranteed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">6. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, Youth Dev is provided{" "}
          <strong className="text-zinc-200">&quot;as is&quot;</strong> without warranties
          of any kind.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">7. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, the operator is not liable for indirect or
          consequential damages arising from use of the service. Your counsel should tune
          this section for your entity and jurisdiction.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">8. Governing law</h2>
        <p>
          Replace with your chosen venue and governing law after legal review (for
          example India / a specific state / arbitration).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">9. Contact</h2>
        <p>
          Replace with a monitored inbox:{" "}
          <strong className="text-zinc-200">legal@yourdomain.example</strong>
        </p>
      </section>
    </PolicyLayout>
  );
}
