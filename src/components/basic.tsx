import { Component, onMount } from "solid-js";

type InputProps = {
  onEnter: any;
  class: string;
  autofocus?: boolean;
};

export const Input: Component<InputProps> = (props) => {
  const onEnter = props.onEnter;
  delete props.onEnter;
  let ref;
  onMount(() => props.autofocus && ref.focus());
  return (
    <input
      ref={ref}
      {...props}
      onkeydown={(e) => e.key === "Enter" && onEnter(e.target.value)}
    />
  );
};
