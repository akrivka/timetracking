import axios from "axios";
import { getLocalCredentials } from "./auth";
import { Entry, serializeEntries } from "../context/EntriesContext";
import { delay, wait } from "./util";

export async function putEntryRemote(entry: Entry) {
  await wait(delay);

  const credentials = getLocalCredentials();
  const response = await axios.post(
    "/api/update",
    "entries=" + encodeURIComponent(serializeEntries([entry])),
    { params: credentials }
  );

  return response.data;
}
