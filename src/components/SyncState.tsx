import { delay, setDelay } from "../lib/util";

export const SyncState = (props) => {
  return (
    <div class="w-40 h-28 rounded-sm bg-sky-200 border border-sky-600 px-2 py-1 text-[0.6rem] absolute right-1 top-1 flex flex-col justify-between">
      <div class="uppercase font-semibold text-sky-800">sync state</div>
      <p class="whitespace-pre-wrap"> {JSON.stringify(props.syncState)}</p>
      <div>
        <input
          class="w-6"
          type="text"
          value={delay}
          onchange={(e) => setDelay(parseInt(e.target.value))}
        />
        ms simulated delay
      </div>
    </div>
  );
};
