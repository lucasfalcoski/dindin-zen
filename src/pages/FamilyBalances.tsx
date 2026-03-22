import { Navigate } from 'react-router-dom';

// Redirect to family page which now has the balance tab
export default function FamilyBalances() {
  return <Navigate to="/family" replace />;
}
