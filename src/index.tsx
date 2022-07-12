import { render } from "solid-js/web";
import { Route, Router, Routes } from "solid-app-router";

import "./index.css";
import { Auth, Login, Signup } from "./routes/auth";
import { App, Home, WithBackButton } from "./App";
import Track from "./routes/Track";
import Report from "./routes/report";
import Calendar from "./routes/Calendar";
import Mobile from "./routes/Mobile";
import { NetworkProvider } from "./lib/network-context";

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
