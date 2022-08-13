import axios from "axios";
import { Credentials } from "../context/UserContext";
import { deserializeEntries, Entry, serializeEntries } from "./entries";
import { delay, wait } from "./util";

export async function getEntriesRemote(
  credentials: Credentials,
  {
    modifiedAfter,
    includeDeleted,
  }: { modifiedAfter?: number; includeDeleted?: boolean } = {
    includeDeleted: false,
  }
) {
  const response = await axios.get("/api/entries", {
    params: { ...credentials, modifiedAfter, includeDeleted },
  });

  // store entries in localDB
  return deserializeEntries(decodeURIComponent(response.data));
}

export async function putEntriesRemote(
  credentials: Credentials,
  entries: Entry[]
) {
  await wait(delay);

  const response = await axios.post(
    "/api/update",
    "entries=" + encodeURIComponent(serializeEntries(entries)),
    { params: credentials }
  );

  return response.data;
}
