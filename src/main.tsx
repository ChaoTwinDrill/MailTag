import React from "react";
import ReactDOM from "react-dom/client";
import "./global.css";
import Mediagrid from "./components/Mediagrid.tsx";
import Header from "./components/header.tsx";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <main className="flex h-screen flex-col overflow-hidden">
      <Header />
      <Mediagrid />
    </main>
);
