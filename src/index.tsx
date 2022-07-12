import { render } from "solid-js/web";
import { Route, Router, Routes } from "solid-app-router";

import "./assets/index.css";
import { Auth, Login, Signup } from "./pages/auth";
import { App, Home, WithBackButton } from "./App";
import Track from "./pages/Track";
import Report from "./pages/report";
import Calendar from "./pages/Calendar";
import Mobile from "./pages/Mobile";
import { NetworkProvider } from "./context/NetworkContext";

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
