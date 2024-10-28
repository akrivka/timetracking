import { Accessor, createEffect, createSignal, For, Show } from "solid-js";
import { parseString, Rule, splitPrefix } from "../lib/parse";
import { wait } from "../lib/util";
interface InputBoxProps<T> {
  prefixRule: Rule<T>;
  submit: (x: T, s: string) => void;
  oninput?: (s: string) => void;
  onchange?: (s: string) => void;
  universe: string[];
  focusSignal?: Accessor<any>;
  clearAndRefocus?: boolean;
  [x: string | number | symbol]: unknown;
}

export function InputBox<T>(props: InputBoxProps<T>) {
  //console.log("rendering InputBox");
  const {
    prefixRule,
    submit,
    oninput,
    onchange,
    focusSignal,
    clearAndRefocus = false,
    universe: _,
    ...otherProps
  } = props;

  const [searchPhrase, setSearchPhrase] = createSignal("");
  const [command, setCommand] = createSignal("");

  const clear = () => {
    setSearchPhrase("");
    setCommand("");
    setSelected(-1);
    if (clearAndRefocus) ref.value = "";
  };

  const onEnter = (s: string) => {
    const m = parseString(prefixRule, s);
    if (m == "prefix" || m == "fail") {
      submit(null, s.trim());
    } else {
      submit(m[0], m[2].trim());
    }
    clear();
  };

  const onInput = (s: string) => {
    const [prefix, suffix] = splitPrefix(prefixRule, s);
    setSearchPhrase(suffix);
    setCommand(prefix);
  };

  let ref: HTMLInputElement;
  if (focusSignal) {
    createEffect(() => {
      if (focusSignal() === -1) clear();
      else if (focusSignal() !== null) ref.focus();
    });
  }

  const [selected, setSelected] = createSignal(-1);

  const filteredUniverse = () =>
    props.universe.filter((x) => x.includes(searchPhrase()));

  const onkeydown = (e) => {
    if (searchPhrase() !== "" && e.key !== "Escape") {
      e.stopPropagation();
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab") {
        e.preventDefault();

        if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
          setSelected(Math.max(selected() - 1, 0));
        }
        if (e.key === "ArrowDown" || e.key === "Tab") {
          setSelected(Math.min(selected() + 1, filteredUniverse().length - 1));
        }

        if (selected() >= 0) {
          let s =
            (command() && command() + " ") + filteredUniverse()[selected()];
          ref.value = s;
          if(onchange) onchange(s);
        }
      }
    }
  };

  return (
    <div class="relative inline-block" onkeydown={onkeydown}>
      <input
        type="text"
        id="InputBox"
        autocomplete="off"
        onkeydown={async (e) => {
          if (
            e.key === "Enter" &&
            !e.ctrlKey &&
            !e.shiftKey &&
            !e.altKey &&
            !e.metaKey
          ) {
            onEnter(e.currentTarget.value);
            if (clearAndRefocus) {
              ref.value = "";
              await wait(10);
              ref.focus();
            }
          }
        }}
        ref={ref}
        {...otherProps}
        oninput={(e) => {
          onInput(e.currentTarget.value);
          if (oninput) oninput(e.currentTarget.value);
        }}
        class={"" + props.class}
      />

      <Show when={searchPhrase() !== ""}>
        <div class="absolute z-10 left-0 right-0 border-x border-gray-200">
          <For each={filteredUniverse()}>
            {(m, i) => (
              <div
                class={
                  "p-2 w-full cursor-pointer border-b border-gray-200 hover:bg-blue-200 z-20 " +
                  (selected() === i()
                    ? "bg-blue-400 text-gray-50"
                    : "bg-white text-gray-900")
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelected(i());
                  let s =
                    (command() && command() + " ") +
                    filteredUniverse()[selected()];
                  ref.value = s;
                  if(onchange) onchange(s);
                  onEnter(command() + " " + m);
                }}
              >
                <span class="text-gray-600">{command()}</span>
                {" " + m}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
