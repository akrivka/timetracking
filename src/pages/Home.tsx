import { NavLink, useNavigate } from "solid-app-router";
import { Component, Match, Switch } from "solid-js";
import { deleteLocalUser, useUser } from "../context/UserContext";

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
    <div class="flex">
      <MyLink href="/track" label="Track" />
      <MyLink href="/report" label="Report" />
      <MyLink href="/calendar" label="Calendar" />
      <MyLink href="/mobile" label="Mobile" />
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
  return (
    <div>
      <Navbar />
    </div>
  );
};

export default Home;
