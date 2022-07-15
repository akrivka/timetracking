import { Component } from "solid-js";

const Report: Component = () => {
  return (
    <div>
      <div class="flex">
        <label class="w-24">Start</label>
        <input class="" type="text" />
      </div>
      <div class="flex">
        <label class="w-24">End</label>
        <input class="" type="text" />
      </div>
      <div class="flex">
        <label class="w-24">Labels</label>
        <input class="" type="text" />
      </div>
      <div class="flex">
        <label class="w-24">Edit</label>
        <input class="" type="checkbox" />
      </div>
      <div class="flex">
        <label class="w-24">Show</label>
        <input class="" type="radio" />
      </div>
      <div class="flex">
        <button>Generate</button>
        <button>Export</button>
      </div>
      <div>main thing</div>
    </div>
  );
};

export default Report;
