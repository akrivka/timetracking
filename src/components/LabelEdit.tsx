import { createSignal, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Portal } from "solid-js/web";
import { useUser } from "../context/UserContext";
import { usePopper } from "../lib/solid-ext";

const [state, setState] = createStore(null);

export const openLabelEdit = (info) => {
  setState({ ...info, isOpen: true });
};

const LabelEdit = () => {
  const { getLabelInfo } = useUser();
  const [info, setInfo] = getLabelInfo(state.label);
  return (
    <div class="w-32 bg-white px-2 py-1 rounded shadow">
      <div class="flex">
        <div>Color: </div>
        <input
          class="w-5 h-5"
          type="color"
          value={info.color}
          onchange={(e) => setInfo({ color: e.currentTarget.value })}
        />
      </div>
      <div>Bulk rename</div>
      <div>Jump to Track</div>
    </div>
  );
};

export const LabelEditContextMenu = () => {
  const [anchor, setAnchor] = createSignal<HTMLElement>();
  const [popper, setPopper] = createSignal<HTMLElement>();
  usePopper(anchor, popper, { placement: "right-start" });

  onMount(() => {
    document.addEventListener("click", (e) => {
      setState({ isOpen: false });
    });
  });

  return (
    <Show when={state.isOpen}>
      <Portal>
        <div
          ref={setAnchor}
          class="absolute z-50"
          style={{ top: state.coord[1] + "px", left: state.coord[0] + "px" }}
        >
          <div ref={setPopper}>
            <LabelEdit />
          </div>
        </div>
      </Portal>
    </Show>
  );
};
