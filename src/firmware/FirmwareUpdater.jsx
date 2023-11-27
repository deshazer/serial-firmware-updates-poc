import * as React from "react";
import { Link } from "react-router-dom";
import Serial from "../serial/Serial";
import SerialProvider from "../serial/SerialProvider";

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
          <option value="stm32">STM32</option>
          <option value="tms320">TMS320</option>
        </select>
      </div>
      <SerialProvider>
        <Serial firmwareType={firmwareType} />
      </SerialProvider>
    </>
  );
};

export default FirmwareUpdater;
