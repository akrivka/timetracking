import { Component } from "solid-js";

export const MyTextInput: Component<{
  onEnter?: (text: string) => void;
  [key: string]: any;
}> = ({ onEnter, ...props }) => {
  return (
    <input
      onkeydown={(e) => e.key === "Enter" && onEnter(e.currentTarget.value)}
      type="text"
      class={"px-1 border rounded " + props.class}
      {...props}
    />
  );
};
