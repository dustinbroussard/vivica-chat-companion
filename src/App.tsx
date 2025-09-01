import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/ThemeProvider";
import InstallPrompt from "./components/InstallPrompt";
import { Suspense, lazy } from "react";
import { Diagnostics } from "@/components/Diagnostics";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Create router with future flags to suppress warnings
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const queryClient = new QueryClient();

const AppContent = () => {
  console.log("App component rendering...");

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <Diagnostics />
      <BrowserRouter future={routerFutureFlags}>
        <Suspense fallback={<div />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
