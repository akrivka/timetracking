import { Component, createSignal, For, onMount, Show } from "solid-js";
import { parseString, Rule, splitPrefix } from "../lib/parse";

// type InputProps = {
//   onEnter: any;
//   autofocus?: boolean;
//   [x: string | number | symbol]: unknown;
// };

// export const InputBox: Component<InputProps> = (props) => {
//   const onEnter = props.onEnter;
//   delete props.onEnter;
//   let ref: HTMLInputElement;
//   onMount(() => props.autofocus && ref.focus());
//   return (
//     <input
//       ref={ref}
//       {...props}
//       onkeydown={(e) => e.key === "Enter" && onEnter(e.currentTarget.value)}
//     />
//   );
// };

interface InputBoxProps<T> {
  prefixRule: Rule<T>;
  submit: (x: T, s: string) => void;
  universe: string[];
  [x: string | number | symbol]: unknown;
}

export function InputBox<T>({
  prefixRule,
  submit,
  universe,
  ...props
}: InputBoxProps<T>) {
  const [searchPhrase, setSearchPhrase] = createSignal("");

  const onEnter = (s: string) => {
    const m = parseString(prefixRule, s);
    if (m == "prefix" || m == "fail") {
      submit(null, s);
    } else {
      submit(m[0], m[2].trim());
    }
  };

  const onInput = (s: string) => {
    const [prefix, suffix] = splitPrefix(prefixRule, s);

    setSearchPhrase(suffix);
    console.log(suffix);
  };

  let ref;
  onMount(() => ref.focus());

  return (
    <div>
      <input
        type="text"
        onkeydown={(e) => e.key === "Enter" && onEnter(e.currentTarget.value)}
        oninput={(e) => onInput(e.currentTarget.value)}
        ref={ref}
        {...props}
      />
      <Show when={searchPhrase() !== ""}>
        <For each={universe.filter((x) => x.includes(searchPhrase()))}>
          {(m) => <div>{m}</div>}
        </For>
      </Show>
    </div>
  );
}
