import { Outlet } from "solid-app-router";
import { Component } from "solid-js";

const Page: Component = () => {
  return (
    <>
      {/* <div class="flex w-full justify-end">
          <NavLink href="/">Go back</NavLink>
        </div> */}
      <Outlet />
    </>
  );
};

export default Page