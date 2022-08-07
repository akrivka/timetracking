import { Route, Router, Routes } from "solid-app-router";
import { lazy } from "solid-js";
import { render } from "solid-js/web";

import { App, Home, Page } from "./App";
import "./assets/index.css";
import { WindowProvider } from "./context/WindowContext";
import { Auth, Login, Signup } from "./pages/Auth";
import Calendar from "./pages/Calendar";
import Mobile from "./pages/Mobile";
import ReportPage from "./pages/Report";
import Track from "./pages/Track";

import PublicReportData from "./pages/PublicReportData";
const PublicReportPage = lazy(() => import("./pages/PublicReportPage"));

render(
  () => (
    <WindowProvider>
      <Router>
        <Routes>
          <Route path="/" component={Auth}>
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
          </Route>
          <Route path="/" component={App}>
            <Route path="/" component={Home} />
            <Route path="/" component={Page}>
              <Route path="/track" component={Track} />
              <Route path="/report" component={ReportPage} />
              <Route path="/calendar" component={Calendar} />
            </Route>
          </Route>
          <Route
            path="/r/:id"
            component={PublicReportPage}
            data={PublicReportData}
          ></Route>
          <Route path="/mobile" component={Mobile} />
        </Routes>
      </Router>
    </WindowProvider>
  ),
  document.getElementById("root") as HTMLElement
);
