import axios from "axios";
import { Accessor, createContext, createResource, useContext } from "solid-js";
import { isIterable } from "../lib/util";
import { Label } from "./EntriesContext";

export type Credentials = { username: string; hashedPassword: string };

type LabelInfo = {
  color: string;
  expanded: boolean;
  lastModified: Date;
};

type Profile = {
  labelInfo: Map<Label, LabelInfo>;
};

type User = {
  credentials?: Credentials;
  profile: Profile;
};

function makeUser(): User {
  return {
    credentials: null,
    profile: { labelInfo: new Map<Label, LabelInfo>() },
  };
}

export function serializeProfile(profile: Profile): string {
  return JSON.stringify({
    labelInfo: Array.from(profile.labelInfo.entries()),
  });
}

export function deserializeProfile(
  serializedProfile: string | undefined
): Profile | null {
  if (!serializeProfile) return null;
  const parsed = JSON.parse(serializedProfile);
  const labelInfo = new Map<Label, LabelInfo>(
    parsed.labelInfo.map(([label, info]) => [
      label,
      { ...info, lastModified: new Date(info.lastModified) },
    ])
  );

  return { labelInfo };
}

function serializeUser(user: User): string {
  return JSON.stringify({ ...user, profile: serializeProfile(user.profile) });
}

export function deserializeUser(user: string): User {
  const parsed = JSON.parse(user);
  return { ...parsed, profile: deserializeProfile(parsed.profile) };
}

function getLocalUser(): User | undefined {
  const userString = localStorage.getItem("user");
  const user = userString ? deserializeUser(userString) : makeUser();
  if (!userString) saveLocalUser(user);
  return user;
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

export function mergeProfiles(profileA: Profile, profileB: Profile) {
  const newLabelInfo = new Map<Label, LabelInfo>();
  if (profileA.labelInfo && isIterable(profileA.labelInfo)) {
    for (const [label, info] of profileA.labelInfo) {
      const otherInfo = profileB.labelInfo.get(label);
      newLabelInfo.set(
        label,
        info.lastModified > otherInfo.lastModified ? info : otherInfo
      );
    }
  }
  if (profileB.labelInfo && isIterable(profileB.labelInfo)) {
    for (const [label, info] of profileB.labelInfo) {
      const otherInfo = profileA.labelInfo.get(label);
      newLabelInfo.set(
        label,
        info.lastModified > otherInfo.lastModified ? info : otherInfo
      );
    }
  }
  return {
    labelInfo: newLabelInfo,
  };
}

const UserContext = createContext();

// TODO: change to sign out only if online and unauthenticated
// otherwise just return the local user (or create it if it doesn't exist)

// TODO: add functions to manipulate the labels<->colors map
// tradeoff: keep the `labels` and `expanded` Map/Sets separate
// or put them into one map `labelInfo` with an object with keys `color`
// and `expanded` in them (would probably have to wrap this in a solid store)
//
// should trigger a push to remote
// question: what should the merge process be?
// for each label take the info object which was modified later?
// implies: LabelInfo { color: string, expanded: boolean, lastModified: Date }
// makes sense...
export const UserProvider = (props) => {
  let user = getLocalUser();

  const getLabelColor = (label: Label): string | undefined => {
    return user.profile.labelInfo.get(label)?.color;
  };

  const setLabelColor = (label: Label, color: string) => {
    const prevInfo = user.profile.labelInfo.get(label);
    user.profile.labelInfo.set(label, {
      ...prevInfo,
      color,
      lastModified: new Date(),
    });
    saveLocalUser(user);
    sync();
  };

  const sync = async () => {
    const remoteProfile = deserializeProfile(
      (
        await axios.get("/api/profile", {
          params: user.credentials,
        })
      ).data
    );

    const localProfile = getLocalUser().profile;

    const mergedProfile = remoteProfile
      ? mergeProfiles(localProfile, remoteProfile)
      : localProfile;

    const res = await axios.post(
      "/api/profile",
      `profile=${encodeURIComponent(serializeProfile(mergedProfile))}`,
      {
        params: user.credentials,
      }
    );
    console.log(res.data);
  };
  // const [user, _] = createResource<User>(async () => {

  // } else if (user.credentials) {
  //   const { data } = await axios.get("/api/login", {
  //     params: user.credentials,
  //   });

  //   if (data === "ok") {
  //     return user;
  //   } else {
  //     user.credentials = null;
  //     saveLocalUser(user);
  //     return user;
  //   }
  // } else {
  //   return user;
  // }

  return (
    <UserContext.Provider value={{ user, getLabelColor, setLabelColor }}>
      {props.children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
