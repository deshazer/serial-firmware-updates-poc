import axios from "axios";
import SemVer from "semver";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getFirmwareFile(firmwareType) {
  if (!firmwareType) return;
  try {
    // Use correct API endpoint for environment
    const { data: firmwareList } = await axios(
      "https://lion-api.lionenergy.com/firmwares"
    );

    if (!firmwareList || !firmwareList.length)
      throw new Error("Unable to fetch firmware list from server.");

    const wcmHardwareList = firmwareList.find(
      (manufacturer) => manufacturer.name === "megarevo"
    )?.hardware;

    if (!wcmHardwareList)
      throw new Error("No WCM hardware found in firmware list.");

    // In production: Get version info from WCM and select the correct version
    // const correctWcmHardware = wcmHardwareList.find(hardware => hardware.hardware_version === wcm_hw_v);

    // In development: Use the latest version
    // Sort descending by version number
    wcmHardwareList.sort((a, b) =>
      SemVer.compare(b.hardware_version, a.hardware_version)
    );

    const correctWcmHardware = wcmHardwareList[0];

    const firmwareUrl = correctWcmHardware.types.find(
      (type) => type.name === `${firmwareType}app_inverter`
    )?.url;

    if (!firmwareUrl) throw new Error("No firmware file found");

    const { data: firmwareArrayBuffer } = await axios(firmwareUrl, {
      responseType: "arraybuffer",
    });

    const firmwareBytes = new Uint8Array(firmwareArrayBuffer);

    return firmwareBytes;
  } catch (error) {
    console.log("Error retrieving firmware file");
    console.log(error);
    throw error;
  }
}
