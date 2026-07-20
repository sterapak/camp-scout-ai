import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { initAnalytics } from "./analytics/gtag";
import "./styles/index.css";

// Load GA4 before render so the landing page_view fires for every visitor,
// including ones who bounce at the sign-in gate. No-op without a Measurement ID.
initAnalytics();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);