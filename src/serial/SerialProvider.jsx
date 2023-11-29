import { createContext, useContext, useEffect, useRef, useState } from "react";
import { byteCommandArrayLength } from "./serialMessages";
import { sleep } from "../helpers";

// RESOURCES:
// https://web.dev/serial/
// https://reillyeon.github.io/serial/#onconnect-attribute-0
// https://codelabs.developers.google.com/codelabs/web-serial
// credit: https://gist.github.com/joshpensky/426d758c5779ac641d1d09f9f5894153

// export type PortState = "closed" | "closing" | "open" | "opening";

// export type SerialMessage = {
//   value: string;
//   timestamp: number;
// };

// type SerialMessageCallback = (message: SerialMessage) => void;

// export interface SerialContextValue {
//   canUseSerial: boolean;
//   hasTriedAutoconnect: boolean;
//   portState: PortState;
//   connect(): Promise<boolean>;
//   disconnect(): void;
//   subscribe(callback: SerialMessageCallback): () => void;
// }
export const SerialContext = createContext({
  canUseSerial: false,
  hasTriedAutoconnect: false,
  connect: () => Promise.resolve(false),
  disconnect: () => {},
  portState: "closed",
  subscribe: () => () => {},
});

export const useSerial = () => useContext(SerialContext);

// interface SerialProviderProps {}
const SerialProvider = ({ children }) => {
  const [canUseSerial] = useState(() => "serial" in navigator);

  const [portState, setPortState] = useState("closed"); // "closed" | "closing" | "open" | "opening";
  const [hasTriedAutoconnect, setHasTriedAutoconnect] = useState(false);
  const [hasManuallyDisconnected, setHasManuallyDisconnected] = useState(false);

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const readerClosedPromiseRef = useRef(Promise.resolve());

  const currentSubscriberIdRef = useRef(0);
  const subscribersRef = useRef(new Map());
  /**
   * Subscribes a callback function to the message event.
   *
   * @param callback the callback function to subscribe
   * @returns an unsubscribe function
   */
  const subscribe = (callback) => {
    const id = currentSubscriberIdRef.current;
    subscribersRef.current.set(id, callback);
    currentSubscriberIdRef.current++;

    return () => {
      subscribersRef.current.delete(id);
    };
  };

  /**
   * Reads from the given port until it's been closed.
   *
   * @param port the port to read from
   */
  const readUntilClosed = async (port) => {
    if (port.readable) {
      readerRef.current = port.readable.getReader();

      let chunk = new Uint8Array(0);
      try {
        while (true) {
          const { value, done } = await readerRef.current.read();

          if (done) {
            break;
          }
          const processData = (data) => {
            const timestamp = Date.now();
            Array.from(subscribersRef.current).forEach(([, callback]) => {
              callback({ value: data, timestamp });
            });
          };

          if (value && value.length < byteCommandArrayLength) {
            const newChunk = new Uint8Array(chunk.length + value.length);
            newChunk.set(chunk);
            newChunk.set(value, chunk.length);
            chunk = newChunk;

            if (chunk.length >= byteCommandArrayLength) {
              processData(chunk);
              chunk = new Uint8Array(0);
            }
          } else {
            processData(value);
            chunk = new Uint8Array(0);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        readerRef.current.releaseLock();
      }

      // await port.close().catch(() => {}); // Ignore the error
    }
  };

  /**
   *
   * @param {Uint8Array} data
   */
  const writeData = async (data) => {
    const port = portRef.current;

    if (portState === "open" && port.writable) {
      let writer;
      let retries = 3;
      while (!writer && retries--) {
        try {
          writer = port.writable.getWriter();
        } catch (error) {
          console.error(error);
          await sleep(10);
        }
      }
      // const writer = port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
    }
  };

  /**
   * Attempts to open the given port.
   */
  const openPort = async (port) => {
    try {
      if (portState === "closed") {
        await port.open({ baudRate: 115200, bufferSize: 60 });
        portRef.current = port;
        setPortState("open");
        setHasManuallyDisconnected(false);
      }
    } catch (error) {
      setPortState("closed");
      console.error("Could not open port");
    }
  };

  const manualConnectToPort = async () => {
    if (canUseSerial && portState === "closed") {
      setPortState("opening");
      const filters = [
        // Can identify the vendor and product IDs by plugging in the device and visiting: chrome://device-log/
        // the IDs will be labeled `vid` and `pid`, respectively
        // {
        //   usbVendorId: 0x1a86,
        //   usbProductId: 0x7523,
        // },
      ];
      try {
        const port = await navigator.serial.requestPort({ filters });
        await openPort(port);
        return true;
      } catch (error) {
        setPortState("closed");
        console.error("User did not select port");
      }
    }
    return false;
  };

  const autoConnectToPort = async () => {
    if (canUseSerial && portState === "closed") {
      setPortState("opening");
      // If you try to auto-reconnect too soon after disconnect, it will fail
      await sleep(500);
      try {
        const availablePorts = await navigator.serial.getPorts();
        if (availablePorts.length) {
          const port = availablePorts[0];
          await openPort(port);
          return true;
        } else {
          setPortState("closed");
        }
      } catch (error) {
        setPortState("closed");
      } finally {
        setHasTriedAutoconnect(true);
      }
    }
    return false;
  };

  const manualDisconnectFromPort = async () => {
    if (canUseSerial && portState === "open") {
      const port = portRef.current;
      if (port) {
        try {
          setPortState("closing");

          // Cancel any reading from port
          readerRef.current?.cancel();
          await readerClosedPromiseRef.current;
          readerRef.current = null;

          // Close and nullify the port
          await port.close().catch(() => {});
          portRef.current = null;
        } catch (error) {
          console.error(error);
        } finally {
          // Update port state
          setHasManuallyDisconnected(true);
          setHasTriedAutoconnect(false);
          setPortState("closed");
        }
      }
    }
  };

  /**
   * Event handler for when the port is disconnected unexpectedly.
   */
  const onPortDisconnect = async () => {
    // Wait for the reader to finish it's current loop
    await readerClosedPromiseRef.current;
    // Update state
    readerRef.current = null;
    readerClosedPromiseRef.current = Promise.resolve();
    portRef.current = null;
    setHasTriedAutoconnect(false);
    setPortState("closed");
  };

  function startReadUntilClosed() {
    const port = portRef.current;
    if (portState === "open" && port) {
      // When the port is open, read until closed
      const aborted = { current: false };
      readerRef.current?.cancel();
      readerClosedPromiseRef.current.then(() => {
        if (!aborted.current) {
          readerRef.current = null;
          readerClosedPromiseRef.current = readUntilClosed(port);
        }
      });
    }
  }

  // Handles attaching the reader and disconnect listener when the port is open
  useEffect(() => {
    const port = portRef.current;
    if (portState === "open" && port) {
      // When the port is open, read until closed
      const aborted = { current: false };
      readerRef.current?.cancel();
      readerClosedPromiseRef.current.then(() => {
        if (!aborted.current) {
          readerRef.current = null;
          readerClosedPromiseRef.current = readUntilClosed(port);
        }
      });

      // Attach a listener for when the device is disconnected
      navigator.serial.addEventListener("disconnect", onPortDisconnect);

      return () => {
        aborted.current = true;
        navigator.serial.removeEventListener("disconnect", onPortDisconnect);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portState]);

  // Tries to auto-connect to a port, if possible
  useEffect(() => {
    if (
      canUseSerial &&
      !hasManuallyDisconnected &&
      !hasTriedAutoconnect &&
      portState === "closed"
    ) {
      autoConnectToPort();
    }

    return () => {
      if (portState === "open") {
        console.log("Disconnecting...");
        manualDisconnectFromPort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseSerial, hasManuallyDisconnected, hasTriedAutoconnect, portState]);

  return (
    <SerialContext.Provider
      value={{
        canUseSerial,
        hasTriedAutoconnect,
        hasManuallyDisconnected,
        autoConnectToPort,
        subscribe,
        portState,
        connect: manualConnectToPort,
        disconnect: manualDisconnectFromPort,
        write: writeData,
      }}
    >
      {children}
    </SerialContext.Provider>
  );
};

export default SerialProvider;
