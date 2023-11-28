import * as React from "react";
import { Link } from "react-router-dom";
import Serial from "../serial/Serial";
import SerialProvider from "../serial/SerialProvider";

const firmwareTypes = [
  { name: "STM32", value: "stm32" },
  { name: "TMS320", value: "tms320" },
];

const FirmwareUpdater = () => {
  const [firmwareType, setFirmwareType] = React.useState("stm32");

  return (
    <>
      <h1>Firmware Updater</h1>
      <p>
        <Link to="/" style={{ color: "white" }}>
          &lt; Home
        </Link>
      </p>
      <div>
        <select
          onChange={(e) => setFirmwareType(e.target.value)}
          value={firmwareType}
        >
          {firmwareTypes.map((fType) => (
            <option value={fType.value} key={fType.value}>
              {fType.name}
            </option>
          ))}
        </select>
      </div>
      <SerialProvider>
        <Serial firmwareType={firmwareType} />
      </SerialProvider>
    </>
  );
};

export default FirmwareUpdater;
