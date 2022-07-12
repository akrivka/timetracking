import {
  Component,
  createEffect,
  createResource,
  createSignal,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import {
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useMatch,
} from "solid-app-router";
import axios from "axios";

import Track from "./routes/track";
import Report from "./routes/report";
import Calendar from "./routes/calendar";
import Login from "./routes/login";
import Signup from "./routes/signup";
import { deleteCredentials, getLocalCredentials } from "./lib/auth";
import { EntriesProvider, useEntries } from "./lib/entries-context";
import { NetworkProvider } from "./lib/network-context";
import Mobile from "./routes/mobile";

type MyLinkProps = {
  href: string;
  label: string;
};

const MyLink: Component<MyLinkProps> = ({ href, label }) => (
  <NavLink href={href} activeClass="text-blue-800">
    {label}
  </NavLink>
);

const Navbar: Component = () => {
  return (
    <div class="flex">
      <MyLink href="/track" label="Track" />
      <MyLink href="/report" label="Report" />
      <MyLink href="/calendar" label="Calendar" />
      <button
        onClick={() => {
          deleteCredentials();
          location.reload();
        }}
      >
        Log out
      </button>
    </div>
  );
};

const App: Component = () => {
  const navigate = useNavigate();
  const [loggedIn, _] = createResource(async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return "no credentials";
    else return (await axios.get("/api/login", { params: credentials })).data;
  });

  const { sync } = useEntries();

  createEffect(() => {
    console.log(loggedIn());

    if (loggedIn() && loggedIn() !== "ok") {
      if (!useMatch(() => "/signup")()) navigate("/login", { replace: true });
    } else if (loggedIn() === "ok") {
      
      if (useMatch(() => "/login")()) navigate("/track");
      console.log(sync);
      
      window.addEventListener("focus", () => {
        sync();
        console.log("lol");
        
      });
    }
  });

  return (
    <>
      <NetworkProvider>
        <Show when={loggedIn()} fallback={"loading"}>
          <EntriesProvider loggedIn={loggedIn}>
            <Show when={loggedIn() === "ok" && !useMatch(() => "/mobile")()}>
              <Navbar />
            </Show>
            <Routes>
              <Route path="/login" component={Login} />
              <Route path="/signup" component={Signup} />
              <Route path="/track" component={Track} />
              <Route path="/report" component={Report} />
              <Route path="/calendar" component={Calendar} />
              <Route path="/mobile" component={Mobile} />
            </Routes>
          </EntriesProvider>
        </Show>
      </NetworkProvider>
    </>
  );
};

export default App;
