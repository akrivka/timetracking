import axios from "axios";
import { Accessor, createContext, createResource, useContext } from "solid-js";
import { deleteLocalCredentials, getLocalCredentials } from "../lib/auth";

const UserContext = createContext<Accessor<User>>();

type User = {
  username: string | undefined;
};

export const UserProvider = (props) => {
  const [user, _] = createResource<User>(async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return { username: undefined };
    else {
      const { data } = await axios.get("/api/login", { params: credentials });

      if (data === "ok") {
        return { username: credentials.username };
      } else {
        deleteLocalCredentials();
        return { username: undefined };
      }
    }
  });

  return (
    <UserContext.Provider value={user}>{props.children}</UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
