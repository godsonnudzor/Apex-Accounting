import { useEffect, useState } from "react";
import { getApiUrl, readApiResponse } from "../context/auth";

const money = (value) =>
  `GHC ${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getLineTotals = (snapshot) => {
  const lines = snapshot?.lines || [];
  if (!lines.length) {
    return {
      debit: Number(snapshot?.debitTotal || 0),
      credit: Number(snapshot?.creditTotal || 0),
    };
  }
  return lines.reduce(
    (totals, line) => ({
      debit: totals.debit + Number(line.debit || 0),
      credit: totals.credit + Number(line.credit || 0),
    }),
    { debit: 0, credit: 0 },
  );
};

const amountSummary = (snapshot) => {
  const totals = getLineTotals(snapshot);
  return `Debit ${money(totals.debit)} / Credit ${money(totals.credit)}`;
};

const lineAmountDetails = (snapshot) =>
  (snapshot?.lines || []).map((line, index) => (
    <div key={`${line.account}-${index}`} className="mt-1 whitespace-normal">
      {line.account}: Dr {money(line.debit)} / Cr {money(line.credit)}
    </div>
  ));

const AuditTrail = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch(getApiUrl("/api/audit-trail"), {
          credentials: "include",
        });
        const result = await readApiResponse(response);
        if (!response.ok) {
          throw new Error(result.message || "Unable to load the audit trail");
        }
        setEvents(result.events || []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
            Accounting
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Audit Trail</h1>
          <p className="mt-2 text-sm text-slate-600">
            Journal edits and voids, including who changed them, when, the ledger page, and before-and-after values.
          </p>
        </div>
        {error ? (
          <p className="mb-4 rounded bg-red-50 px-4 py-3 text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date and time</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Page altered</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Previous amount</th>
                <th className="px-4 py-3">New amount</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-slate-500">
                    Loading audit history…
                  </td>
                </tr>
              ) : events.length ? (
                events.map((event) => (
                  <tr key={event.id} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{event.actor_name || "Unknown user"}</td>
                    <td className="max-w-xs whitespace-normal px-4 py-3">{event.page}</td>
                    <td className="px-4 py-3 capitalize">
                      {event.action} · entry {event.entry_id}
                    </td>
                    <td className="px-4 py-3">
                      {amountSummary(event.previous_values)}
                      {lineAmountDetails(event.previous_values)}
                    </td>
                    <td className="px-4 py-3">
                      {amountSummary(event.new_values)}
                      {lineAmountDetails(event.new_values)}
                    </td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer font-semibold text-teal-800">
                          View changes
                        </summary>
                        <div className="mt-2 grid gap-3 text-xs md:grid-cols-2">
                          <section>
                            <h2 className="font-semibold">Previous values</h2>
                            <pre className="mt-1 max-w-md overflow-auto rounded bg-slate-50 p-2">
                              {JSON.stringify(event.previous_values, null, 2)}
                            </pre>
                          </section>
                          <section>
                            <h2 className="font-semibold">New values</h2>
                            <pre className="mt-1 max-w-md overflow-auto rounded bg-slate-50 p-2">
                              {JSON.stringify(event.new_values, null, 2)}
                            </pre>
                          </section>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-slate-500">
                    No journal changes have been recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default AuditTrail;
