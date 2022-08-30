import { NavLink, useNavigate } from "solid-app-router";
import { Component, Match, Switch } from "solid-js";
import { deleteLocalUser, useUser } from "../context/UserContext";
import { renderTime } from "../lib/format";

const MyLink: Component<{
  href: string;
  label: string;
}> = (props) => (
  <NavLink href={props.href} activeClass="text-blue-800">
    {props.label}
  </NavLink>
);

const Navbar: Component = () => {
  const { credentials } = useUser();
  const navigate = useNavigate();

  return (
    <div class="flex space-x-2">
      <MyLink href="/track" label="Track" />
      <MyLink href="/report" label="Report" />
      <MyLink href="/calendar" label="Calendar" />
      <MyLink href="/help" label="Help" />
      <MyLink href="/mobile" label="Mobile" />
      <div class="w-4" />
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

const Home: Component = () => {
  const lastFull = JSON.parse(localStorage.lastFull || "{}");
  return (
    <div>
      <Navbar />
      <div class="text-xs text-gray-500">
        Last full update and validation performed at{" "}
        <span class="italic">{renderTime(new Date(lastFull?.time))}</span> (
        {JSON.stringify(lastFull?.result, null, 2)})
      </div>
    </div>
  );
};

export default Home;
