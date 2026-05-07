import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Register service worker (vite-plugin-pwa)。scope は Vite の base に追従
import { registerSW } from "virtual:pwa-register";
registerSW({
  immediate: true,
  scope: import.meta.env.BASE_URL,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
