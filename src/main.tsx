import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'sonner';
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%)',
            border: '2px solid #D4302B',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(212, 48, 43, 0.2)',
            padding: '12px 16px',
            fontSize: '15px',
            fontWeight: '500',
          },
          classNames: {
            toast: 'festival-toast',
            title: 'festival-toast-title',
            description: 'festival-toast-description',
          },
        }}
        icons={{
          success: <span style={{ fontSize: '20px' }}>🎉</span>,
          error: <span style={{ fontSize: '20px' }}>😅</span>,
          info: <span style={{ fontSize: '20px' }}>💡</span>,
          warning: <span style={{ fontSize: '20px' }}>⚠️</span>,
        }}
      />
    </BrowserRouter>
  </StrictMode>
);
