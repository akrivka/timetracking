import { Accessor, createContext, createSignal, useContext } from "solid-js";
import { now } from "../lib/util";

type WindowContextType = {
  hasNetwork: Accessor<boolean>;
  time: Accessor<number>;
};

declare global {
  interface Window {
    timemarker: any;
  }
}

window.timemarker = window.timemarker || {};

const WindowContext = createContext<WindowContextType>();

export const WindowProvider = (props) => {
  const [hasNetwork, sethasNetwork] = createSignal(navigator.onLine);

  window.addEventListener("offline", () => sethasNetwork(false));
  window.addEventListener("online", () => sethasNetwork(true));

  const [time, setTime] = createSignal(now().getTime());
  setInterval(() => setTime(now().getTime()), 1000);

  return (
    <WindowContext.Provider value={{ hasNetwork, time }}>
      {props.children}
    </WindowContext.Provider>
  );
};

export const useWindow = () => useContext(WindowContext);
