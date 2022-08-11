import { useLocation, useNavigate } from "solid-app-router";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Portal } from "solid-js/web";
import { useUser } from "../context/UserContext";
import { clickOutside, usePopper } from "../lib/solid-ext";
import { openBulkRenameDialog } from "./BulkRename";

const [state, setState] = createStore(null);

export const openLabelEdit = (info) => {
  setState({ ...info, isOpen: true });
};

export const closeLabelEdit = () => {
  setState({ isOpen: false });
};

// typescript being weird
declare module "solid-js" {
  namespace JSX {
    interface Directives {
      // use:clickOutside
      clickOutside: () => void;
    }
  }
}
false && clickOutside;

const LabelEdit = () => {
  const navigate = useNavigate();
  const { getLabelInfo } = useUser();
  const infoTuple = createMemo(() => getLabelInfo(state.label));
  return (
    <div class="w-40 bg-white rounded shadow text-gray-800 text-sm">
      <div class="text-gray-500 text-[10px] px-2 pt-1">{state.label}</div>
      <div class="divide-y divide-gray-200">
        <div class="px-2 h-6 w-full">
          <div class="flex items-center space-x-1">
            <div>Color: </div>
            <input
              class="w-5 h-5"
              type="color"
              value={infoTuple()[0].color}
              onchange={(e) => infoTuple()[1]({ color: e.currentTarget.value })}
            />
          </div>
        </div>
        <button
          class="hover:bg-gray-100 px-2 h-7 w-full text-left"
          onclick={() => {
            openBulkRenameDialog({ label: state.label });
            closeLabelEdit();
          }}
        >
          Bulk rename
        </button>
        <button
          class="hover:bg-gray-100 px-2 h-7 w-full text-left"
          onclick={() => {
            navigate(`/track`, { state: { entry: state.entry } });
            closeLabelEdit();
          }}
        >
          Jump to Track
        </button>
      </div>
    </div>
  );
};

export const LabelEditContextMenu = () => {
  const [anchor, setAnchor] = createSignal<HTMLElement>();
  const [popper, setPopper] = createSignal<HTMLElement>();
  usePopper(anchor, popper, { placement: "right-start" });

  const location = useLocation();
  createEffect(() => {
    location.pathname;
    closeLabelEdit();
  });

  return (
    <Show when={state.isOpen}>
      <Portal>
        <div
          ref={setAnchor}
          class="absolute z-50"
          style={{ top: state.coord[1] + "px", left: state.coord[0] + "px" }}
        >
          <div ref={setPopper} use:clickOutside={closeLabelEdit}>
            <LabelEdit />
          </div>
        </div>
      </Portal>
    </Show>
  );
};
