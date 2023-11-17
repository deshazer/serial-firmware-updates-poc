import * as React from 'react';
import { useSerial } from './SerialProvider';
import { Link } from 'react-router-dom';
import { updateCommand_stm32, byteCommandArrayLength } from './serialMessages';

const Serial = () => {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [firmwareFile, setFirmwareFile] = React.useState(false);

  const serial = useSerial();
  console.log('🚀 ~ file: Serial.jsx:13 ~ Serial ~ serial:', serial);

  // React.useEffect(() => {
  //   return () => {
  //     console.log('Disconnecting...');
  //     serial?.disconnect();
  //   };
  // }, [serial]);

  React.useEffect(() => {
    let unsubscribe;
    if (serial.portState === 'open') {
      console.log('Subscribing...');
      unsubscribe = serial.subscribe(handleNewSerialMessage);
    }
    return () => {
      if (unsubscribe) {
        console.log('Unsubscribing...');
        unsubscribe();
      }
    };
  }, [serial]);

  if (!serial.canUseSerial) {
    return (
      <>
        <h1>Serial</h1>
        <p>
          <Link to="/" style={{ color: 'white' }}>
            &lt; Home
          </Link>
        </p>
        <p>Web serial is not supported in this browser.</p>
      </>
    );
  }

  async function getFirmwareFile() {
    const firmwareUrl =
      'https://dev-lionenergy-smart-firmware.s3.amazonaws.com/2.0.0/megarevo/inverter/stm32app/arm/2.28.0.bin';

    const response = await fetch(firmwareUrl, { cache: 'no-store' });
    if (!response.ok)
      throw new Error(
        `Failed to download file (HTTP status ${response.status})`
      );

    const firmwareBytes = new Uint8Array(await response.arrayBuffer());
    console.log(
      '🚀 ~ file: Serial.jsx:31 ~ getFirmwareFile ~ firmwareBytes:',
      Array.from(firmwareBytes, (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join()
    );

    return firmwareBytes;
  }

  const handleOpenPort = async () => {
    await serial.connect();
  };

  const handleClosePort = () => {
    serial.disconnect();
  };

  const handleStartFirmwareUpdate = async () => {
    try {
      setIsUpdating(true);

      const firmwareBytes = await getFirmwareFile();
      console.log(
        '🚀 ~ file: Serial.jsx:41 ~ handleStartFirmwareUpdate ~ firmwareBytes:',
        firmwareBytes
      );
      if (firmwareBytes) {
        setFirmwareFile(firmwareBytes);
        serial.write(updateCommand_stm32);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNewSerialMessage = ({ value, timestamp }) => {
    console.log(
      '🚀 ~ file: Serial.jsx:72 ~ handleNewSerialMessage ~ timestamp:',
      timestamp
    );
    console.log(
      '🚀 ~ file: Serial.jsx:72 ~ handleNewSerialMessage ~ value:',
      value
    );
  };

  return (
    <>
      <h1>Serial</h1>
      <p>
        <Link to="/" style={{ color: 'white' }}>
          &lt; Home
        </Link>
      </p>

      <hr />
      {serial.canUseSerial ? (
        <>
          <div>
            <button
              onClick={handleOpenPort}
              disabled={serial.portState !== 'closed'}
            >
              Open Port
            </button>
            <button
              onClick={handleClosePort}
              disabled={serial.portState !== 'open'}
            >
              Close Port
            </button>
            <p>
              COM Port Status: <b>{serial.portState}</b>
            </p>
          </div>
          <hr />
          <div>
            <button onClick={handleStartFirmwareUpdate} disabled={isUpdating}>
              Start Firmware Update
            </button>
            {isUpdating && <p>Updating...</p>}
          </div>
        </>
      ) : (
        <p>Web serial is not supported in this browser.</p>
      )}
    </>
  );
};

export default Serial;
