import axios from "axios";
import {
  createContext, createSignal,
  onMount, useContext
} from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { stringToColor } from "../lib/colors";
import { isIterable } from "../lib/util";
import { Label } from "./EntriesContext";
import { useWindow } from "./WindowContext";

export type Credentials = { username: string; hashedPassword: string };

type LabelInfo = {
  color?: string;
  expanded?: boolean;
  lastModified?: Date;
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

// could reuse code better
export function mergeProfiles(profileA: Profile, profileB: Profile) {
  const newLabelInfo = new Map<Label, LabelInfo>();
  if (profileA.labelInfo && isIterable(profileA.labelInfo)) {
    for (const [label, info] of profileA.labelInfo) {
      const otherInfo = profileB.labelInfo.get(label);
      newLabelInfo.set(
        label,
        !otherInfo || info.lastModified > otherInfo.lastModified
          ? info
          : otherInfo
      );
    }
  }
  if (profileB.labelInfo && isIterable(profileB.labelInfo)) {
    for (const [label, info] of profileB.labelInfo) {
      const otherInfo = profileA.labelInfo.get(label);
      newLabelInfo.set(
        label,
        !otherInfo || info.lastModified > otherInfo.lastModified
          ? info
          : otherInfo
      );
    }
  }
  return {
    labelInfo: newLabelInfo,
  };
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

function wrapInfo(
  info: LabelInfo,
  pushProfile
): [LabelInfo, (info: LabelInfo) => void] {
  const [_info, _setInfo] = createStore<LabelInfo>({
    color: info.color,
    expanded: info.expanded,
    lastModified: info.lastModified,
  });
  const setInfo = (_info: LabelInfo) => {
    _setInfo({
      ..._info,
      lastModified: new Date(),
    });
    pushProfile();
  };
  return [_info, setInfo];
}

function wrapProfile(profile: Profile, pushProfile) {
  const wrappedLabelInfo = new Map<
    Label,
    [LabelInfo, (newInfo: LabelInfo) => void]
  >();
  for (const [label, info] of profile.labelInfo) {
    wrappedLabelInfo.set(label, wrapInfo(info, pushProfile));
  }
  return { labelInfo: wrappedLabelInfo };
}

function unwrapProfile(profile) {
  const unwrappedLabelInfo = new Map<Label, LabelInfo>();
  for (const [label, [info, _setInfo]] of profile.labelInfo) {
    unwrappedLabelInfo.set(label, unwrap(info));
  }
  return { labelInfo: unwrappedLabelInfo };
}

async function getRemoteProfile(credentials) {
  const serializedProfile = (
    await axios.get("/api/profile", {
      params: credentials,
    })
  ).data;

  return serializedProfile && deserializeProfile(serializedProfile);
}

export type WrappedInfo = [LabelInfo, (info: Partial<LabelInfo>) => void];

const UserContext = createContext<{
  credentials?: Credentials;
  getLabelInfo?: (label: Label) => WrappedInfo;
}>({});

export const UserProvider = (props) => {
  let user = getLocalUser();
  const { hasNetwork } = useWindow();

  const [profile, setProfile] = createSignal(
    wrapProfile(user.profile, () => syncProfile())
  );

  onMount(async () => {
    if (hasNetwork() && user.credentials) {
      const remoteProfile = await getRemoteProfile(user.credentials);
      const localProfile = user.profile;
      const mergedProfile = remoteProfile
        ? mergeProfiles(localProfile, remoteProfile)
        : localProfile;

      setProfile(wrapProfile(mergedProfile, () => syncProfile()));
    }
  });

  const syncProfile = async () => {
    let remoteProfile;
    if (hasNetwork() && user.credentials) {
      remoteProfile = await getRemoteProfile(user.credentials);
    }
    const localProfile = unwrapProfile(profile());
    const mergedProfile = remoteProfile
      ? mergeProfiles(localProfile, remoteProfile)
      : localProfile;

    user.profile = mergedProfile;
    saveLocalUser(user);
    if (hasNetwork() && user.credentials) {
      await axios.post(
        "/api/profile",
        `profile=${encodeURIComponent(serializeProfile(mergedProfile))}`,
        {
          params: user.credentials,
        }
      );
    }
  };

  const getLabelInfo = (label: Label) => {
    let info = profile().labelInfo.get(label);
    if (!info) {
      const newInfo = wrapInfo(
        {
          color: stringToColor(label),
          expanded: false,
          lastModified: new Date(),
        },
        syncProfile
      );
      profile().labelInfo.set(label, newInfo);
      info = newInfo;

      syncProfile();
    }
    return info;
  };

  return (
    <UserContext.Provider
      value={{
        credentials: user?.credentials,
        getLabelInfo,
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
