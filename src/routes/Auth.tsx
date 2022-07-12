import {
  Component,
  createSignal,
  Show,
  Accessor,
  createEffect,
} from "solid-js";
import axios from "axios";
import { hashPassword } from "../lib/util";
import { Link, useNavigate, Outlet } from "solid-app-router";
import { Credentials, getLocalCredentials, saveCredentials } from "../lib/auth";

type CredentialsFormProps = {
  onSubmit: (username: string, password: string) => void;
  submitLabel: string;
  clear: Accessor<boolean>;
};

const CredentialsForm: Component<CredentialsFormProps> = ({
  onSubmit,
  submitLabel,
  clear,
}) => {
  let usernameEl, passwordEl;

  createEffect(() => {
    if (clear()) {
      usernameEl.value = "";
      passwordEl.value = "";
    }
  });
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

export const Signup: Component = () => {
  const navigate = useNavigate();

  const signup = async (username: string, password: string) => {
    const credentials = {
      username: username,
      hashedPassword: hashPassword(password),
    };
    const res = await axios.post("/api/signup", null, {
      params: credentials,
    });

    saveCredentials(credentials);
    navigate("/track");
  };
  return (
    <>
      <CredentialsForm
        onSubmit={signup}
        submitLabel="Sign up"
        clear={() => true}
      />
      <div class="h-1" />
      Already have an account?{" "}
      <Link href="/login" class="hover:underline">
        Log in instead.
      </Link>
    </>
  );
};

export const Login: Component = () => {
  const navigate = useNavigate();

  const [invalid, setInvalid] = createSignal(false);

  const login = async (username: string, password: string) => {
    setInvalid(false);

    const credentials = {
      username: username,
      hashedPassword: hashPassword(password),
    };

    const res = await axios.get("/api/login", {
      params: credentials,
    });

    if (res.data == "ok") {
      saveCredentials(credentials);

      navigate("/track");
    } else if (res.data == "username+password not found") {
      setInvalid(true);
    }
  };

  return (
    <>
      <CredentialsForm onSubmit={login} submitLabel="Log in" clear={invalid} />
      <Show when={invalid()}>Invalid username and password.</Show>
      <div class="h-1" />
      Don't have an account?{" "}
      <Link href="/signup" class="hover:underline">
        Sign up instead.
      </Link>
    </>
  );
};

export const Auth: Component = () => {
  return (
    <div class="pl-12 pt-12">
      <Outlet />
    </div>
  );
};
