import { Component, onMount } from "solid-js";

type InputProps = {
  onEnter: any;
  autofocus?: boolean;
  [x: string | number | symbol]: unknown;
};

export const Input: Component<InputProps> = (props) => {
  const onEnter = props.onEnter;
  delete props.onEnter;
  let ref: HTMLInputElement;
  onMount(() => props.autofocus && ref.focus());
  return (
    <input
      ref={ref}
      {...props}
      onkeydown={(e) => e.key === "Enter" && onEnter(e.currentTarget.value)}
    />
  );
};
