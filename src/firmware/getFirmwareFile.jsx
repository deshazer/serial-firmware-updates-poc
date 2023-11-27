
// const withFirmwareFile = (WrappedComponent, firmwareType) => {
//   const WithFirmwareFile = (props) => {
//     const firmwareFile = React.useRef(new Uint8Array());

//     React.useEffect(() => {
//       async function getFirmwareFile() {
//         if (!firmwareType) return;
//         try {
//           // TODO: Get latest firmware versions from API
//           const firmwareUrl =
//             firmwareType === "stm32"
//               ? "https://prod-lion-smart-firmware.s3.amazonaws.com/2.0.0/megarevo/inverter/stm32app/arm/2.22.0.bin"
//               : "https://prod-lion-smart-firmware.s3.amazonaws.com/2.0.0/megarevo/inverter/tms320app/dsp/3.45.0.bin";

//           const response = await fetch(firmwareUrl);
//           if (!response.ok)
//             throw new Error(
//               `Failed to download file (HTTP status ${response.status})`
//             );

//           const firmwareBytes = new Uint8Array(await response.arrayBuffer());
//           console.log(
//             "🚀 ~ file: Serial.jsx:31 ~ getFirmwareFile ~ firmwareBytes:",
//             Array.from(firmwareBytes, (byte) =>
//               byte.toString(16).padStart(2, "0")
//             ).join()
//           );

//           firmwareFile.current = firmwareBytes;
//         } catch (error) {
//           console.log("Error retrieving firmware file");
//           console.log(error);
//         }
//       }
//       getFirmwareFile();
//     }, []);

//     return <WrappedComponent {...props} firmwareFile={firmwareFile} />;
//   };
//   return React.memo(WithFirmwareFile);
// };

// export default withFirmwareFile;

export async function getFirmwareFile(firmwareType) {
  if (!firmwareType) return;
  try {
    // TODO: Get latest firmware versions from API
    const firmwareUrl =
      firmwareType === "stm32"
        ? "https://prod-lion-smart-firmware.s3.amazonaws.com/2.0.0/megarevo/inverter/stm32app/arm/2.22.0.bin"
        : "https://prod-lion-smart-firmware.s3.amazonaws.com/2.0.0/megarevo/inverter/tms320app/dsp/3.45.0.bin";

    const response = await fetch(firmwareUrl);
    if (!response.ok)
      throw new Error(
        `Failed to download file (HTTP status ${response.status})`
      );

    const firmwareBytes = new Uint8Array(await response.arrayBuffer());
    console.log(
      "🚀 ~ file: Serial.jsx:31 ~ getFirmwareFile ~ firmwareBytes:",
      Array.from(firmwareBytes, (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join()
    );

    return firmwareBytes;
  } catch (error) {
    console.log("Error retrieving firmware file");
    console.log(error);
  }
}
