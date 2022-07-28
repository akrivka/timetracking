import { Component } from "solid-js";

export const MyTextInput: Component<{
  onEnter?: (text: string) => void;
  [key: string]: any;
}> = (props) => {
  return (
    <input
      onkeydown={(e) => e.key === "Enter" && props.onEnter(e.currentTarget.value)}
      type="text"
      value={props.value}
      class={"px-1 border rounded " + props.class}
      {...props}
    />
  );
};
