import {
  Component,
  Accessor,
  createSignal,
  For,
  onMount,
  Show,
  createEffect,
} from "solid-js";
import { parseString, Rule, splitPrefix } from "../lib/parse";
import { wait } from "../lib/util";

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
  focusSignal: Accessor<any>;
  [x: string | number | symbol]: unknown;
}

export function InputBox<T>({
  prefixRule,
  submit,
  universe,
  focusSignal,
  ...props
}: InputBoxProps<T>) {
  console.log("rendering InputBox");

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
    //console.log(suffix);
  };

  let ref: HTMLInputElement;
  createEffect(() => {
    if (focusSignal() != null) ref.focus();
  });

  const [selected, setSelected] = createSignal(-1);

  const filteredUniverse = () =>
    universe.filter((x) => x.includes(searchPhrase()));

  const onkeydown = (e) => {
    if (searchPhrase() !== "") {
      e.stopPropagation();
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();

        if (e.key === "ArrowUp") {
          setSelected(Math.max(selected() - 1, -1));
        }
        if (e.key === "ArrowDown") {
          setSelected(Math.min(selected() + 1, universe.length - 1));
        }

        if (selected() >= 0) {
          ref.value = filteredUniverse()[selected()];
        }
      }
    }
  };

  return (
    <div class="relative inline-block w-48" onkeydown={onkeydown}>
      <input
        type="text"
        onkeydown={async (e) => {
          if (e.key === "Enter") {
            onEnter(e.currentTarget.value);
            ref.value = "";
            setSearchPhrase("");
            await wait(10)
            ref.focus();
          }
        }}
        oninput={(e) => onInput(e.currentTarget.value)}
        ref={ref}
        {...props}
        class={"w-full " + props.class}
      />

      <Show when={searchPhrase() !== ""}>
        <div class="absolute z-10 left-0 right-0 border-x border-gray-200">
          <For each={filteredUniverse()}>
            {(m, i) => (
              <div
                class={
                  "p-2 w-full cursor-pointer border-b border-gray-200 " +
                  (selected() === i() ? "bg-blue-400" : "")
                }
              >
                {m}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
