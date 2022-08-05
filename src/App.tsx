import * as R from "remeda";
import { NavLink, Outlet, useNavigate } from "solid-app-router";
import {
  Accessor,
  Component,
  createContext,
  Match,
  onMount,
  Setter,
  Show,
  Switch,
  useContext,
} from "solid-js";
import { createStore, SetStoreFunction, StoreSetter } from "solid-js/store";
import { BulkRename } from "./components/BulkRename";
import { LabelEditContextMenu } from "./components/LabelEdit";
import { SyncState } from "./components/SyncState";

import { EntriesProvider, useEntries } from "./context/EntriesContext";
import { deleteLocalUser, UserProvider, useUser } from "./context/UserContext";
import { debug } from "./lib/util";
import { defaultCalendarState } from "./pages/Calendar";
import { defaultReportState } from "./pages/Report";
import { defaultTrackState } from "./pages/Track";

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

export const Page: Component = () => {
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

const defaultUIState = {
  track: defaultTrackState,
  report: defaultReportState,
  calendar: defaultCalendarState,
};

const UIState = createStore(defaultUIState);

const UIStateContext = createContext(UIState);

export function useUIState<T>(...path): [get: Accessor<T>, set: Setter<T>] {
  const [UIState, setUIState] = useContext(UIStateContext);
  // @ts-ignore
  const cursor: Accessor<T> = () => R.pathOr(UIState, path, "error");
  // @ts-ignore
  const setCursor: Setter<T> = (...args: any[]) => setUIState(...path, ...args);
  return [cursor, setCursor];
}

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
        <UIStateContext.Provider value={UIState}>
          <Show when={debug}>
            <SyncState />
          </Show>
          <Outlet />
          <LabelEditContextMenu />
          <BulkRename />
        </UIStateContext.Provider>
      </EntriesProvider>
    </UserProvider>
  );
};
