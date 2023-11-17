import * as React from 'react';
import { Link } from 'react-router-dom';
import Serial from '../serial/Serial';
import SerialProvider from '../serial/SerialProvider';
import withFirmwareFile from './withFirmwareFile';

const FirmwareUpdater = () => {
  const [firmwareType, setFirmwareType] = React.useState('');

  const SerialWithFirmware = React.memo(withFirmwareFile(Serial, firmwareType));
  return (
    <>
      <h1>Firmware Updater</h1>
      <p>
        <Link to="/" style={{ color: 'white' }}>
          &lt; Home
        </Link>
      </p>
      <div>
        <button onClick={() => setFirmwareType('stm32')}>
          Download STM32 Firmware
        </button>
        <button onClick={() => setFirmwareType('tms320')}>
          Download TMS320 Firmware
        </button>
      </div>
      <SerialProvider>
        <SerialWithFirmware />
      </SerialProvider>
    </>
  );
};

export default FirmwareUpdater;
