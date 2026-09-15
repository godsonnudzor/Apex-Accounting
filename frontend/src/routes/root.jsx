import { NavLink, Outlet } from "react-router-dom";

export default function TaxRoot() {
  return <div className="tax-shell"><header className="tax-header"><NavLink to="/tax-analyzer" className="tax-brand"><span>◒</span> Ledgerline</NavLink><nav className="tax-nav" aria-label="Tax analyzer navigation"><NavLink to="/tax-analyzer" end>Calculator</NavLink><NavLink to="/tax-analyzer/brackets">Bracket library</NavLink></nav><span className="tax-year">2025 estimates</span></header><main className="tax-main"><Outlet /></main></div>;
}