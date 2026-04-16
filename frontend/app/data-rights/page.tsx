"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PolicyLayout } from "@/components/PolicyLayout";
import { Button } from "@/components/Button";
import { POLICY_VERSION_PRIVACY } from "@/lib/policy";
import {
  deleteServerUserData,
  fetchHealth,
  fetchMeExportBlob,
  type HealthResponse,
} from "@/lib/api";
import { downloadDeviceDataExport } from "@/lib/local-data-export";
import { clearSession } from "@/lib/session";

export default function DataRightsPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await fetchHealth();
        if (!cancelled) {
          setHealth(h);
          setHealthErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setHealthErr(e instanceof Error ? e.message : "Could not reach the app service");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dbOn = health?.database_configured === true;

  return (
    <PolicyLayout title="Data & rights" version={POLICY_VERSION_PRIVACY}>
      {healthErr && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Connection: {healthErr} — you can still download this device&apos;s copy or clear data below.
        </p>
      )}
      {health && (
        <p className="text-sm text-zinc-500">
          Cloud sync: <strong className="text-zinc-300">{dbOn ? "on" : "off"}</strong>
          {dbOn
            ? " — profile history, journal, coach chat, and XP can also be stored online for this pilot."
            : " — right now everything stays on this device only."}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">Download a copy</h2>
        <p>
          Export what this app holds on <strong className="text-zinc-200">this device</strong> (session
          storage + browser local storage). Use this for portability or before you clear data.
        </p>
        <Button
          type="button"
          variant="soft"
          disabled={!!busy}
          onClick={() => {
            setActionErr(null);
            setActionMsg(null);
            setBusy("device");
            try {
              downloadDeviceDataExport();
              setActionMsg("Device export downloaded.");
            } catch (e) {
              setActionErr(e instanceof Error ? e.message : "Export failed");
            } finally {
              setBusy(null);
            }
          }}
        >
          Download device copy (JSON)
        </Button>
        {dbOn && (
          <>
            <p className="text-sm text-zinc-500">
              Because cloud sync is on, you can also download everything we keep online for this
              browser (profiles, journal, coach chat, XP) as one file.
            </p>
            <Button
              type="button"
              variant="soft"
              disabled={!!busy}
              onClick={async () => {
                setActionErr(null);
                setActionMsg(null);
                setBusy("server-export");
                try {
                  const blob = await fetchMeExportBlob();
                  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `youth-dev-cloud-export-${stamp}.json`;
                  a.rel = "noopener";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                  setActionMsg("Cloud copy downloaded.");
                } catch (e) {
                  setActionErr(e instanceof Error ? e.message : "Cloud export failed");
                } finally {
                  setBusy(null);
                }
              }}
            >
              Download cloud copy (JSON)
            </Button>
          </>
        )}
      </section>

      {dbOn && (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-white">Delete cloud copy</h2>
          <p>
            Removes the online copy tied to this browser (profiles, journal, coach chat, progress).
            This cannot be undone. Your device may still keep a local copy until you clear below.
          </p>
          <Button
            type="button"
            variant="soft"
            disabled={!!busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Delete all cloud-stored data for this browser? This cannot be undone.",
                )
              ) {
                return;
              }
              setActionErr(null);
              setActionMsg(null);
              setBusy("server-delete");
              try {
                const { had_server_rows } = await deleteServerUserData();
                setActionMsg(
                  had_server_rows
                    ? "Cloud copy deleted."
                    : "Nothing was stored online for this browser yet.",
                );
              } catch (e) {
                setActionErr(e instanceof Error ? e.message : "Delete failed");
              } finally {
                setBusy(null);
              }
            }}
          >
            Delete cloud data for this browser
          </Button>
        </section>
      )}

      {(actionMsg || actionErr) && (
        <p
          className={
            actionErr
              ? "text-sm text-red-300"
              : "text-sm text-emerald-300/90"
          }
        >
          {actionErr ?? actionMsg}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">Clear data on this device</h2>
        <p>
          This removes onboarding, consent, answers, and cached results from Youth Dev session
          storage in <em>this</em> browser, plus local profile / XP / journal caches and the
          anonymous device id.
        </p>
        <Button
          type="button"
          variant="primary"
          disabled={!!busy}
          onClick={() => {
            clearSession();
            router.push("/");
          }}
        >
          Clear all Youth Dev data in this browser
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">Access, correction, deletion</h2>
        <p>
          This MVP uses a device-scoped id, not accounts. Use the downloads and delete actions above
          for access and erasure on this device and in the cloud when sync is on. For verified
          processes later (school pilots, guardians), add a support channel your counsel approves —
          placeholder:{" "}
          <strong className="text-zinc-200">privacy@yourdomain.example</strong>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">Withdraw consent</h2>
        <p>
          You can stop using Youth Dev at any time. Clearing session storage removes the consent
          snapshot stored locally. Deleting cloud data when sync is on stops further use of that
          online copy.
        </p>
      </section>
    </PolicyLayout>
  );
}
