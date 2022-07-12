import { clear } from "console";
import { Accessor, Component, createEffect } from "solid-js";

type CredentialsFormProps = {
  onSubmit: (username: string, password: string) => void;
  submitLabel: string;
  clear: Accessor<boolean>;
};

export const CredentialsForm: Component<CredentialsFormProps> = ({
  onSubmit,
  submitLabel,
  clear
}) => {
  let usernameEl, passwordEl;

  createEffect(() => {
    if(clear()) {
      usernameEl.value = "";
      passwordEl.value = "";
    }
  })
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(usernameEl.value, passwordEl.value);
      }}
      class="flex flex-col border-2 border-black rounded w-96 p-4"
    >
      <div class="flex">
        <label class="w-24">Username: </label>
        <input type="text" ref={usernameEl} class="border px-1" />
      </div>
      <div class="h-1"></div>
      <div class="flex">
        <label class="w-24">Password: </label>
        <input type="password" ref={passwordEl} class="border px-1" />
      </div>
      <div class="h-2"></div>
      <div>
        <button
          type="submit"
          class="border border-black rounded px-2 py-1 hover:bg-gray-100"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
