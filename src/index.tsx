import { Route, Router, Routes } from "solid-app-router";
import { render } from "solid-js/web";

import { App, Home, WithBackButton } from "./App";
import "./assets/index.css";
import { NetworkProvider } from "./context/NetworkContext";
import { Auth, Login, Signup } from "./pages/auth";
import Calendar from "./pages/Calendar";
import Mobile from "./pages/Mobile";
import Report from "./pages/report";
import Track from "./pages/Track";

render(
  () => (
    <NetworkProvider>
      <Router>
        <Routes>
          <Route path="/" component={Auth}>
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
          </Route>
          <Route path="/" component={App}>
            <Route path="/" component={Home} />
            <Route path="/" component={WithBackButton}>
              <Route path="/track" component={Track} />
              <Route path="/report" component={Report} />
              <Route path="/calendar" component={Calendar} />
            </Route>
          </Route>
          <Route path="/mobile" component={Mobile} />
        </Routes>
      </Router>
    </NetworkProvider>
  ),
  document.getElementById("root") as HTMLElement
);
