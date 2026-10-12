import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import {AuthProvider,AuthNotice} from "./auth/AuthProvider";
import {ProjectsProvider,ProjectsNotice} from "./projects/ProjectsProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><ProjectsProvider><App /><ProjectsNotice /></ProjectsProvider><AuthNotice /></AuthProvider>
  </StrictMode>
);
