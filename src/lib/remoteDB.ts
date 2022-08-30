import axios from "axios";
import { Credentials } from "../context/UserContext";
import { deserializeEntries, Entry, serializeEntries } from "./entries";
import { delay, wait } from "./util";

export async function getEntriesRemote(
  credentials: Credentials,
  {
    modifiedAfter,
    syncedAfter,
    includeDeleted,
  }: {
    modifiedAfter?: number;
    syncedAfter?: number;
    includeDeleted?: boolean;
  } = {
    includeDeleted: false,
  }
) {
  const response = await axios.get("/api/entries", {
    params: { ...credentials, modifiedAfter, syncedAfter, includeDeleted },
  });

  // store entries in localDB
  return deserializeEntries(decodeURIComponent(response.data));
}

export async function putEntriesRemote(
  credentials: Credentials,
  clientID,
  entries: Entry[]
) {
  await wait(delay);

  const response = await axios.post(
    "/api/update",
    "entries=" + encodeURIComponent(serializeEntries(entries)),
    { params: { ...credentials, clientID } }
  );

  return response.data;
}
