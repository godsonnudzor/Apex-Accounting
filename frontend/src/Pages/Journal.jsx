import React from 'react'

const Journal = () => {
  return (
        <main className="min-h-screen bg-slate-100 p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Journal</h1><p className="mt-2 text-sm text-slate-500">Enter balanced accounting records and review posted transactions.</p></div>
            {error && <p className="mb-4 rounded bg-red-50 px-4 py-3 text-red-700" role="alert">{error}</p>}
            {message && <p className="mb-4 rounded bg-emerald-50 px-4 py-3 text-emerald-700" role="status">{message}</p>}
            <form onSubmit={saveEntry} className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">Date<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" type="date" name="entryDate" value={form.entryDate} onChange={updateForm} required /></label>
                <label className="text-sm font-medium text-slate-700">Reference<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" name="reference" value={form.reference} onChange={updateForm} /></label>
                <label className="text-sm font-medium text-slate-700">Description<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" name="description" value={form.description} onChange={updateForm} required /></label>
              </div>
              <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Account</th><th className="px-3 py-2">Debit</th><th className="px-3 py-2">Credit</th><th className="px-3 py-2">Memo</th><th /></tr></thead><tbody>{lines.map((line, index) => <tr key={index}><td className="px-2 py-2"><input className="w-full rounded border border-slate-300 px-3 py-2" name="account" value={line.account} onChange={(event) => updateLine(index, event)} required /></td><td className="px-2 py-2"><input className="w-full rounded border border-slate-300 px-3 py-2" name="debit" type="number" min="0" step="0.01" value={line.debit} onChange={(event) => updateLine(index, event)} /></td><td className="px-2 py-2"><input className="w-full rounded border border-slate-300 px-3 py-2" name="credit" type="number" min="0" step="0.01" value={line.credit} onChange={(event) => updateLine(index, event)} /></td><td className="px-2 py-2"><input className="w-full rounded border border-slate-300 px-3 py-2" name="memo" value={line.memo} onChange={(event) => updateLine(index, event)} /></td><td><button type="button" className="text-red-600" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</button></td></tr>)}</tbody></table></div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setLines((current) => [...current, blankLine()])}>Add line</button><span className={Math.abs(totals.debit - totals.credit) < 0.005 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>Debit {totals.debit.toFixed(2)} | Credit {totals.credit.toFixed(2)}</span><button className="rounded bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={Math.abs(totals.debit - totals.credit) >= 0.005}>Post entry</button></div>
            </form>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Lines</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-t border-slate-100"><td className="px-4 py-3">{entry.entry_date}</td><td className="px-4 py-3 font-medium">{entry.description}</td><td className="px-4 py-3 capitalize">{entry.source}</td><td className="px-4 py-3">{entry.reference || "-"}</td><td className="px-4 py-3">{entry.journal_lines?.length || 0}</td></tr>)}{!entries.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No journal entries found.</td></tr>}</tbody></table></div>
          </div>
        </main>
  )
}

export default Journal
