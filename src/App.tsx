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

import { deleteLocalCredentials, getLocalCredentials } from "./lib/auth";
import { EntriesProvider, useEntries } from "./context/EntriesContext";

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
          deleteLocalCredentials();
          location.reload();
        }}
      >
        Log out
      </button>
    </div>
  );
};

type User = {
  username: string | undefined;
};

export const WithBackButton: Component = () => {
  return (
    <>
      <div class="flex w-full justify-end">
        <button onClick={() => {}}>Go back</button>
      </div>
      <Outlet />
    </>
  );
};

export const Home: Component = () => {
  return (
    <div>
      <Navbar />
    </div>
  );
};

export const App: Component = () => {
  const [user, _] = createResource<User>(async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return { username: undefined };
    else {
      const { data } = await axios.post("/api/login", credentials);
      if (data === "ok") {
        return { username: credentials.username };
      } else {
        deleteLocalCredentials();
        return { username: undefined };
      }
    }
  });

  return (
    <>
      <EntriesProvider user={user}>
        <Outlet />
      </EntriesProvider>
    </>
  );
};
