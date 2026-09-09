import { Theme } from "@radix-ui/themes";
import React from "react";
import ReactDOM from "react-dom/client";
import "./global.css";
import Mediagrid from "./components/Mediagrid.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Theme>
      <Mediagrid />
    </Theme>
  </React.StrictMode>,
);
