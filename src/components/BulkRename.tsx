import {
  Dialog, DialogOverlay,
  DialogPanel, Transition
} from "solid-headless";
import {
  Component,
  createEffect, createSignal
} from "solid-js";
import { createStore } from "solid-js/store";
import { labelFrom, useEntries } from "../context/EntriesContext";
import { coarseLabel } from "../lib/labels";
import { listPairs, revit } from "../lib/util";
import { MyButton } from "./MyButton";
import { MyTextInput } from "./MyTextInput";

const [state, setState] = createStore(null);

export const openBulkRenameDialog = (info) => {
  setState({ ...info, isOpen: true });
};

export const BulkRename: Component = () => {
  const { dispatch, entries } = useEntries();
  const [newName, setNewName] = createSignal(state.label);
  const [moveChildren, setMoveChildren] = createSignal(true);
  createEffect(() => {
    if (state.isOpen) setNewName(state.label);
  });

  const onSubmit = () => {
    dispatch([
      "bulkRename",
      {
        from: state.label,
        to: newName(),
        moveChildren: moveChildren(),
      },
    ]);
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

  return (
    <Transition appear show={state.isOpen}>
      <Dialog
        isOpen={state.isOpen}
        onClose={() => setState({ isOpen: false })}
        class="fixed inset-0 z-10 overflow-y-auto"
      >
        <div class="min-h-screen flex items-center justify-center">
          <DialogOverlay class="fixed inset-0 bg-gray-800 opacity-25" />
          <DialogPanel class="inline-block w-96 bg-white px-4 py-3 rounded-lg border-1 shadow z-20 space-y-1">
            <div class="font-bold">Bulk Rename</div>
            <div class="flex">
              <label class="w-12">From:</label>
              <div>
                {state.label}
                <div class="text-[10px] text-gray-600 -translate-y-1">
                  {labelFrequencies().get(state.label) || 0} existing entries
                </div>
              </div>
            </div>
            <div class="flex">
              <label class="w-12">To:</label>
              <div class="w-full">
                <MyTextInput
                  oninput={(e) => setNewName(e.currentTarget.value)}
                  onEnter={onSubmit}
                  value={state.label}
                  class="w-full"
                />
                <div class="text-[10px] text-gray-600">
                  {labelFrequencies().get(newName()) || 0} existing entries
                </div>
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
          </DialogPanel>
        </div>
      </Dialog>
    </Transition>
  );
};
