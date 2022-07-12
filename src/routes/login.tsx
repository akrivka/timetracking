import { Component, createSignal, Show } from "solid-js";
import axios from "axios";
import { hashPassword } from "../lib/util";
import { Link, useNavigate } from "solid-app-router";
import { CredentialsForm } from "../components/CredentialsForm";
import { Credentials, getLocalCredentials, saveCredentials } from "../lib/auth";

const Login: Component = () => {
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
      console.log("hey");
      //location.reload()
    }
  };

  return (
    <div class="pl-12 pt-12">
      <CredentialsForm onSubmit={login} submitLabel="Log in" clear={invalid}/>
      <Show when={invalid()}>
        Invalid username and password.
      </Show>
      <div class="h-1" />
      Don't have an account?{" "}
      <Link href="/signup" class="hover:underline">
        Sign up instead.
      </Link>
    </div>
  );
};

export default Login;
