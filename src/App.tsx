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
  Outlet,
} from "solid-app-router";
import axios from "axios";

import { deleteCredentials, getLocalCredentials } from "./lib/auth";
import { EntriesProvider, useEntries } from "./lib/entries-context";
import { NetworkProvider } from "./lib/network-context";

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
    if (loggedIn() && loggedIn() !== "ok") {
      if (!useMatch(() => "/signup")()) navigate("/login", { replace: true });
    } else if (loggedIn() === "ok") {
      if (useMatch(() => "/login")()) navigate("/track");

      window.addEventListener("focus", () => {
        sync();
      });
    }
  });

  return (
    <>
      <Show when={loggedIn()} fallback={"loading"}>
        <EntriesProvider loggedIn={loggedIn}>
          <Show when={loggedIn() === "ok"}>
            <Navbar />
          </Show>
          <Outlet />
        </EntriesProvider>
      </Show>
    </>
  );
};

export default App;
