import { Navigate } from "react-router-dom";

function LedgerAccountCreate() {
  return <Navigate to="/chart-of-accounts?create=1" replace />;
}

export default LedgerAccountCreate;
