import { NavLink, Outlet, useNavigate } from "solid-app-router";
import { Component, Match, Switch } from "solid-js";
import { SyncState } from "./components/SyncState";

import { EntriesProvider } from "./context/EntriesContext";
import { deleteLocalUser, UserProvider, useUser } from "./context/UserContext";

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
  const navigate = useNavigate();

  return (
    <div class="flex">
      <MyLink href="/track" label="Track" />
      <MyLink href="/report" label="Report" />
      <MyLink href="/calendar" label="Calendar" />
      <Switch>
        <Match when={!user}>Loading</Match>
        <Match when={!user()?.credentials}>
          <MyLink href="/signup" label="Sign up" />
        </Match>
        <Match when={true}>
          <p class="ml-1 text-gray-500">({user()?.credentials.username})</p>
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
        <SyncState/>
        <Outlet />
      </EntriesProvider>
    </UserProvider>
  );
};
