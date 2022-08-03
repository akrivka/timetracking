import { NavLink, Outlet, useNavigate } from "solid-app-router";
import { Component, Match, onMount, Show, Switch } from "solid-js";
import { SyncState } from "./components/SyncState";

import { EntriesProvider, useEntries } from "./context/EntriesContext";
import { deleteLocalUser, UserProvider, useUser } from "./context/UserContext";
import { debug } from "./lib/util";

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
  const { credentials } = useUser();
  const navigate = useNavigate();

  return (
    <div class="flex">
      <MyLink href="/track" label="Track" />
      <MyLink href="/report" label="Report" />
      <MyLink href="/calendar" label="Calendar" />
      <Switch>
        <Match when={!credentials}>
          <MyLink href="/signup" label="Sign up" />
        </Match>
        <Match when={true}>
          <p class="ml-1 text-gray-500">({credentials.username})</p>
          <button
            onClick={() => {
              deleteLocalUser();
              navigate("/login");
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
      {/* <div class="flex w-full justify-end">
        <NavLink href="/">Go back</NavLink>
      </div> */}
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
  const navigate = useNavigate();
  onMount(() => {
    document.addEventListener("keydown", (e) => {
      if (e.altKey) {
        e.code === "Digit1" && navigate("/track");
        e.code === "Digit2" && navigate("/report");
        e.code === "Digit3" && navigate("/calendar");
        e.code === "Backquote" && navigate("/");
      }
    });
  });
  return (
    <UserProvider>
      <EntriesProvider>
        <Show when={debug}>
          <SyncState />
        </Show>
        <WithProviders />
      </EntriesProvider>
    </UserProvider>
  );
};

const WithProviders: Component = () => {
  const { syncState } = useEntries();
  return (
    <Show when={syncState.local.initialized()} fallback="Loading...">
      <Outlet />
    </Show>
  );
};
