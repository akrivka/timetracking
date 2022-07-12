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
import { UserProvider, useUser } from "./context/UserContext";

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
  const user = useUser();

  return (
    <div class="flex">
      <MyLink href="/track" label="Track" />
      <MyLink href="/report" label="Report" />
      <MyLink href="/calendar" label="Calendar" />
      <Switch>
        <Match when={!user}>Loading</Match>
        <Match when={!user()?.username}>
          <MyLink href="/signup" label="Sign up" />
        </Match>
        <Match when={true}>
          <p class="ml-1 text-gray-500">({user()?.username})</p>
          <button
            onClick={() => {
              deleteLocalCredentials();
              location.reload();
            }}
          >
            Log out
          </button>
        </Match>
      </Switch>
    </div>
  );
};

export const WithBackButton: Component = () => {
  return (
    <>
      <div class="flex w-full justify-end">
        <NavLink href="/">Go back</NavLink>
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
  return (
    <UserProvider>
      <EntriesProvider>
        <Outlet />
      </EntriesProvider>
    </UserProvider>
  );
};
