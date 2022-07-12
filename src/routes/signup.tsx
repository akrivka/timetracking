import { Component } from "solid-js";
import axios from "axios";
import { hashPassword } from "../lib/util";
import { Link, useNavigate } from "solid-app-router";
import { CredentialsForm } from "../components/CredentialsForm";
import { saveCredentials } from "../lib/auth";

const Signup: Component = () => {
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
    <div class="pl-12 pt-12">
      <CredentialsForm onSubmit={signup} submitLabel="Sign up" clear={() => true}/>
      <div class="h-1" />
      Already have an account?{" "}
      <Link href="/login" class="hover:underline">
        Log in instead.
      </Link>
    </div>
  );
};

export default Signup;
