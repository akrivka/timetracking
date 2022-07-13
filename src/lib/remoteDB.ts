import axios from "axios";
import { Entry, serializeEntries } from "../context/EntriesContext";
import { Credentials } from "../context/UserContext";
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
