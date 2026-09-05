import { Theme } from "@radix-ui/themes";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
		<html>
			<body>
				<Theme>
					<App />
				</Theme>
			</body>
		</html>
  </React.StrictMode>,
);
