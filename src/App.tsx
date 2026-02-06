import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Ingredients from "./pages/Ingredients";
import Menus from "./pages/Menus";
import Purchases from "./pages/Purchases";
import Receipts from "./pages/Receipts";
import Productions from "./pages/Productions";
import StockMovements from "./pages/StockMovements";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingredients"
              element={
                <ProtectedRoute requiredPermission="ingredient.read">
                  <Ingredients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/menus"
              element={
                <ProtectedRoute requiredPermission="menu.read">
                  <Menus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute requiredPermission="purchase.read">
                  <Purchases />
                </ProtectedRoute>
              }
            />
            <Route
              path="/receipts"
              element={
                <ProtectedRoute requiredPermission="receipt.read">
                  <Receipts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/productions"
              element={
                <ProtectedRoute requiredPermission="production.read">
                  <Productions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-movements"
              element={
                <ProtectedRoute>
                  <StockMovements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'KEPALA_DAPUR']}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute requiredPermission="report.read">
                  <Reports />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
