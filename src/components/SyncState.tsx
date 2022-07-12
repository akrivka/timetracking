import { createMemo } from "solid-js";
import { useNetwork } from "../context/NetworkContext";
import { delay, setDelay } from "../lib/util";

export const SyncState = ({ syncState }) => {
  const hasNetwork = useNetwork();
  const syncStateString = createMemo(() => {
    if (syncState && syncState.local && syncState.remote) {
      const { local, remote } = syncState;
      // test whether user is connected to the internet
      let remoteString: string;
      if (!hasNetwork()) {
        remoteString = "Offline.";
      } else if (!remote.loggedIn()) {
        remoteString = "Not logged in.";
      } else if (remote.syncingUp()) {
        remoteString = "Syncing up... ";
      } else if (remote.syncingDown()) {
        remoteString = "Syncing down... ";
      } else {
        remoteString = "Synced.";
      }

      let localString: string;
      if (!local.initialized()) {
        localString = "Connecting to local database.";
      } else if (local.querying()) {
        localString = "Querying entries.";
      } else if (local.mutating()) {
        localString = "Saving entries locally.";
      } else {
        localString = "Synced.";
      }
      return "Remote: " + remoteString + "\nLocal: " + localString;
    }
  });

  return (
    <div class="w-40 h-28 rounded-sm bg-sky-200 border border-sky-600 px-2 py-1 text-[0.6rem] absolute right-1 top-12 flex flex-col justify-between">
      <div class="uppercase font-semibold text-sky-800">sync state</div>
      <p class="whitespace-pre-wrap"> {syncStateString}</p>
      <div>
        <input
          class="w-6"
          type="text"
          value={delay}
          onchange={(e) => setDelay(parseInt(e.currentTarget.value))}
        />
        ms simulated delay
      </div>
    </div>
  );
};
