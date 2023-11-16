import * as React from 'react';
import { useSerial } from './SerialProvider';

const Serial = () => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const serial = useSerial();
  React.useEffect(() => serial?.disconnect, [serial]);
  console.log('🚀 ~ file: Serial.jsx:13 ~ Serial ~ serial:', serial);

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

  const handleStartFirmwareUpdate = async () => {
    try {
      setIsUpdating(true);

      const firmwareBytes = await getFirmwareFile();
      console.log(
        '🚀 ~ file: Serial.jsx:41 ~ handleStartFirmwareUpdate ~ firmwareBytes:',
        firmwareBytes
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <h1>Serial</h1>

      <div>
        <button
          onClick={handleOpenPort}
          disabled={serial.portState !== 'closed'}
        >
          Open Port
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
      </div>
    </>
  );
};

export default Serial;
