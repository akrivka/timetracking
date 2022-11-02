import { Dialog, DialogOverlay, DialogPanel, Transition } from "solid-headless";
import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show
} from "solid-js";
import { createStore } from "solid-js/store";
import { useEntries } from "../context/EntriesContext";
import { labelFrom } from "../lib/entries";
import { coarseLabel } from "../lib/labels";
import { emptyRule } from "../lib/parse";
import { listPairs, revit } from "../lib/util";
import { InputBox } from "./InputBox";
import { MyButton } from "./MyButton";
import { SpinnerIcon } from "./SpinnerIcon";

const [state, setState] = createStore(null);

export const openBulkRenameDialog = (info) => {
  setState({ ...info, isOpen: true });
};

export const BulkRename: Component = () => {
  const { dispatch, entries, labels } = useEntries();
  const [newName, setNewName] = createSignal("");
  const [newNameDelayed, setNewNameDelayed] = createSignal("");
  const [moveChildren, setMoveChildren] = createSignal(true);
  const [loading, setLoading] = createSignal(false);

  const onSubmit = async () => {
    setLoading(true);
    await dispatch([
      "bulkRename",
      {
        from: state.label,
        to: newName(),
        moveChildren: moveChildren(),
      },
    ]);
    setLoading(false);
    setState({ isOpen: false });
    //triggerRerender();
  };

  const labelFrequencies = () => {
    const m = new Map<Label, number>();
    if (state.isOpen) {
      for (const [start, end] of listPairs(revit(entries))) {
        let label = labelFrom(start, end);
        m.set(label, (m.get(label) || 0) + 1);
        if (moveChildren()) {
          while ((label = coarseLabel(label))) {
            m.set(label, (m.get(label) || 0) + 1);
          }
        }
      }
    }
    return m;
  };

  let timeoutID;
  createEffect(() => {
    clearTimeout(timeoutID);
    const name = newName();
    timeoutID = setTimeout(() => {
      setNewNameDelayed(name);
    }, 200);
  });

  const keydown = (e) => {
    // if cmd/ctrl+enter pressed
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      onSubmit();
    }
  };
  onMount(() => {
    window.addEventListener("keydown", keydown);
  });
  onCleanup(() => {
    window.removeEventListener("keydown", keydown);
  });
  return (
    <Transition appear show={state.isOpen}>
      <Dialog
        isOpen={state.isOpen}
        onClose={() => setState({ isOpen: false })}
        class="fixed inset-0 z-10 overflow-y-auto"
      >
        <div class="min-h-screen flex items-center justify-center">
          <DialogOverlay class="fixed inset-0 bg-gray-800 opacity-25" />
          <DialogPanel class="inline-block w-[36rem] bg-white px-4 py-3 rounded-lg border-1 shadow z-20 space-y-1 h-48">
            <Show
              when={!loading()}
              fallback={
                <div class="flex w-full h-full justify-center items-center">
                  <SpinnerIcon />
                </div>
              }
            >
              <div class="font-bold">Bulk Rename</div>
              <div class="flex space-x-1 items-center">
                <label class="w-12">From:</label>
                <div class="w-72">{state.label}</div>
                <div class="text-[10px] text-gray-600 -translate-y-1">
                  {labelFrequencies().get(state.label) || 0} existing entries
                </div>
              </div>
              <div class="flex space-x-1 items-center">
                <label class="w-12">To:</label>
                <InputBox
                  class="w-72 px-1 border rounded"
                  prefixRule={emptyRule}
                  universe={labels}
                  submit={(_, n) => setNewName(n)}
                  oninput={(s) => setNewName(s)}
                  onchange={(s) => setNewName(s)}
                />
                <div class="text-[10px] text-gray-600">
                  {labelFrequencies().get(newNameDelayed()) || 0} existing
                  entries
                </div>
              </div>
              <div class="flex">
                <label class="w-28">With children:</label>
                <input
                  type="checkbox"
                  checked
                  onchange={(e) => setMoveChildren(e.currentTarget.checked)}
                />
              </div>
              <div class="flex justify-end space-x-2">
                <MyButton onclick={() => setState({ isOpen: false })}>
                  Cancel
                </MyButton>
                <MyButton onclick={onSubmit}>Rename</MyButton>
              </div>
            </Show>
          </DialogPanel>
        </div>
      </Dialog>
    </Transition>
  );
};
