import axios from "axios";
import { Accessor, createContext, createResource, useContext } from "solid-js";

export type Credentials = { username: string; hashedPassword: string };

type Profile = {};

type User = {
  credentials?: Credentials;
  profile: Profile;
};

function makeUser(): User {
  return {
    credentials: null,
    profile: {},
  };
}

function serializeUser(user: User): string {
  return JSON.stringify(user);
}

function deserializeUser(user: string): User {
  return JSON.parse(user);
}

function getLocalUser(): User {
  return deserializeUser(localStorage.getItem("user"));
}

function saveLocalUser(user: User) {
  localStorage.setItem("user", serializeUser(user));
}

export function deleteLocalUser() {
  localStorage.removeItem("user");
}

export function saveLocalCredentials(credentials: Credentials) {
  const user = getLocalUser();
  user.credentials = credentials;
  saveLocalUser(user);
}

const UserContext = createContext<Accessor<User>>();

export const UserProvider = (props) => {
  const [user, _] = createResource<User>(async () => {
    const user = getLocalUser();    
    if (!user) {
      const newUser = makeUser();
      saveLocalUser(newUser);
      return newUser;
    } else if (user.credentials) {
      const { data } = await axios.get("/api/login", {
        params: user.credentials,
      });

      if (data === "ok") {                
        return user;
      } else {
        user.credentials = null;
        saveLocalUser(user);
        return user;
      }
    } else {
      return user;
    }
  });

  return (
    <UserContext.Provider value={user}>{props.children}</UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
