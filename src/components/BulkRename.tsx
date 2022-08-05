import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPanel,
  DialogTitle,
  Transition,
} from "solid-headless";
import { Component, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { useEntries } from "../context/EntriesContext";
import { MyButton } from "./MyButton";
import { MyTextInput } from "./MyTextInput";

const [state, setState] = createStore(null);

export const openBulkRenameDialog = (info) => {
  setState({ ...info, isOpen: true });
};

export const BulkRename: Component = () => {
  const { dispatch } = useEntries();
  const [newName, setNewName] = createSignal("");
  const [moveChildren, setMoveChildren] = createSignal(true);

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
  return (
    <Transition appear show={state.isOpen}>
      <Dialog
        isOpen={state.isOpen}
        onClose={() => setState({ isOpen: false })}
        class="fixed inset-0 z-10 overflow-y-auto"
      >
        <div class="min-h-screen flex items-center justify-center">
          <DialogOverlay class="fixed inset-0 bg-gray-800 opacity-25" />
          <DialogPanel class="inline-block w-96 bg-white px-4 py-3 rounded border-2 shadow z-20 space-y-1">
            <div class="flex">
              <label class="w-28">Label:</label>
              {state.label}
            </div>
            <div class="flex">
              <label class="w-28">Rename to:</label>
              <MyTextInput
                oninput={(e) => setNewName(e.currentTarget.value)}
                onEnter={onSubmit}
              />
            </div>
            <div class="flex">
              <label class="w-28">Move children:</label>
              <input
                type="checkbox"
                checked
                onchange={(e) => setMoveChildren(e.currentTarget.checked)}
              />
            </div>
            <MyButton onclick={onSubmit}>Done</MyButton>
          </DialogPanel>
        </div>
      </Dialog>
    </Transition>
  );
};
