import { Accessor, createContext, createSignal, useContext } from "solid-js";

const NetworkContext = createContext<Accessor<boolean>>();

export const NetworkProvider = (props) => {
  let [hasNetwork, setHasNetwork] = createSignal(navigator.onLine);

  window.addEventListener("offline", () => setHasNetwork(false));
  window.addEventListener("online", () => setHasNetwork(true));

  return (
    <NetworkContext.Provider value={hasNetwork}>
      {props.children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
