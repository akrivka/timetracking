import axios from "axios";
import { Credentials } from "../context/UserContext";
import { deserializeEntries, Entry, serializeEntries } from "./entries";
import { delay, wait } from "./util";

export async function putEntryRemote(entry: Entry, credentials: Credentials) {
  await wait(delay);

  const response = await axios.post(
    "/api/update",
    "entries=" + encodeURIComponent(serializeEntries([entry])),
    { params: credentials }
  );

  return response.data;
}

export async function getEntriesRemote(
  { after }: { after: number },
  credentials: Credentials
) {
  const response = await axios.get("/api/entries", {
    params: { ...credentials, after: after },
  });

  // store entries in localDB
  return deserializeEntries(decodeURIComponent(response.data));
}
