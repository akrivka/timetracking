import { Component, JSXElement } from "solid-js";

type ButtonProps = {
  children: JSXElement;
  onclick?: () => void;
  class?: string;
  [other: string]: any;
};

export const MyButton: Component<ButtonProps> = ({
  children,
  onclick,
  ...props
}) => {
  return (
    <button
      {...props}
      onClick={onclick}
      class={"px-2 py-1 border rounded hover:bg-gray-50 " + props.class}
    >
      {children}
    </button>
  );
};
