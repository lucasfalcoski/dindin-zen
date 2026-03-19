import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewProvider } from "@/contexts/ViewContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import IncomePage from "./pages/Income";
import AccountsPage from "./pages/Accounts";
import CreditCardsPage from "./pages/CreditCards";
import Groups from "./pages/Groups";
import Reports from "./pages/Reports";
import BudgetPage from "./pages/Budget";
import FamilySettings from "./pages/FamilySettings";
import FamilyBalances from "./pages/FamilyBalances";
import FamilyBudgetPage from "./pages/FamilyBudget";
import InvitePage from "./pages/InvitePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Tags from "./pages/Tags";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <ViewProvider>
      <AppLayout>{children}</AppLayout>
    </ViewProvider>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/expenses" element={<ProtectedPage><Expenses /></ProtectedPage>} />
            <Route path="/income" element={<ProtectedPage><IncomePage /></ProtectedPage>} />
            <Route path="/accounts" element={<ProtectedPage><AccountsPage /></ProtectedPage>} />
            <Route path="/credit-cards" element={<ProtectedPage><CreditCardsPage /></ProtectedPage>} />
            <Route path="/groups" element={<ProtectedPage><Groups /></ProtectedPage>} />
            <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
            <Route path="/budget" element={<ProtectedPage><BudgetPage /></ProtectedPage>} />
            <Route path="/family" element={<ProtectedPage><FamilySettings /></ProtectedPage>} />
            <Route path="/family/balances" element={<ProtectedPage><FamilyBalances /></ProtectedPage>} />
            <Route path="/family/budget" element={<ProtectedPage><FamilyBudgetPage /></ProtectedPage>} />
            <Route path="/invite/:token" element={<InvitePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
