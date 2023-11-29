import * as React from "react";
import { useSerial } from "./SerialProvider";
import { Link } from "react-router-dom";
import * as serialMessages from "./serialMessages";
import { getFirmwareFile } from "../firmware/getFirmwareFile";

const MAX_RETRIES = 3;

const UpdateStatus = {
  Ready: "ready",
  Awaiting_UpdateCommand_Ack: "awaitingUpdateCommand_ACK",
  Awaiting_FlashErase_Ack: "awaitingFlashErase_ACK",
  Awaiting_DataWritten_Ack: "awaitingDataWritten_ACK",
  Awaiting_DataComplete_Ack: "awaitingDataComplete_ACK",
  Awaiting_FlashVerification_Ack: "awaitingFlashVerification_ACK",
  Awaiting_RestartInverter_Ack: "awaitingRestartInverter_ACK",
  Done: "done",
  Error: "error",
};

const Serial = React.memo(function Serial({ firmwareType }) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [percentComplete, setPercentComplete] = React.useState(0);
  const [firmwareUpdateStatus, setFirmwareUpdateStatus] = React.useState(
    UpdateStatus.Ready
  );
  const [statusMsg, setStatusMsg] = React.useState("");

  // Use refs to store data that doesn't affect the UI
  const firmwareFile = React.useRef(new Uint8Array());
  const fileIndex = React.useRef(0);
  const currentCommand = React.useRef(new Uint8Array());
  const expectedResponse = React.useRef(new Uint8Array());
  const timerId = React.useRef(0);
  const timeout = 10 * 1000;

  const retries = React.useRef(0);

  let updateCommand = serialMessages.updateCommand_stm32;
  let flashEraseCommand = serialMessages.flashEraseCommand_stm32;
  let startAddr = serialMessages.startAddr_stm32;
  let lengthByte = serialMessages.lengthByte_stm32;

  if (firmwareType === "tms320") {
    updateCommand = serialMessages.updateCommand_tms320;
    flashEraseCommand = serialMessages.flashEraseCommand_tms320;
    startAddr = serialMessages.startAddr_tms320;
    lengthByte = serialMessages.lengthByte_tms320;
  }
  const commandAndLengthBytes = new Uint8Array([0x03, 0x03, lengthByte, 0x00]);

  const serial = useSerial();

  React.useEffect(() => {
    if (
      serial &&
      serial.canUseSerial &&
      !serial.hasManuallyDisconnected &&
      !serial.hasTriedAutoconnect &&
      serial.portState === "closed"
    ) {
      console.log("Auto connecting...");
      serial.autoConnectToPort();
    }

    return () => {
      if (serial && serial.portState === "open") {
        console.log("Disconnecting...");
        serial?.disconnect();
      }
    };
  }, [
    serial.canUseSerial,
    serial.hasManuallyDisconnected,
    serial.hasTriedAutoconnect,
    serial.portState,
  ]);

  React.useEffect(() => {
    let unsubscribe;
    if (serial.portState === "open") {
      console.log("Subscribing...");
      unsubscribe = serial.subscribe(handleNewSerialMessage);
    } else {
      clearTimeout(timerId.current);
    }
    return () => {
      if (unsubscribe) {
        console.log("Unsubscribing...");
        unsubscribe();
      }
    };
  });

  // TODO: This belongs in an onDisconnect event handler passed to the SerialProvider
  // React.useEffect(() => {
  //   if (
  //     serial.portState !== "open" &&
  //     firmwareUpdateStatus !== UpdateStatus.Ready &&
  //     firmwareUpdateStatus !== UpdateStatus.Done
  //   ) {
  //     clearTimeout(timerId.current);
  //     setFirmwareUpdateStatus(UpdateStatus.Error);
  //     setStatusMsg("Device Disconnected. Please try again.");
  //     setIsUpdating(false);
  //     expectedResponse.current = new Uint8Array();
  //   }
  // }, [serial.portState]);

  const handleStartFirmwareUpdate = async () => {
    try {
      setIsUpdating(true);
      setPercentComplete(0);

      setStatusMsg("Downloading firmware file...");
      firmwareFile.current = await getFirmwareFile(firmwareType);

      if (firmwareFile.current?.length) {
        fileIndex.current = 0;
        retries.current = 0;
        setStatusMsg("Initiating firmware update...");
        setFirmwareUpdateStatus(UpdateStatus.Awaiting_UpdateCommand_Ack);
        expectedResponse.current = serialMessages.updateCommand_Ack;
        currentCommand.current = updateCommand;
        await serial.write(currentCommand.current);

        timerId.current = setTimeout(handleTimeout, timeout);
      }
    } catch (error) {
      console.error(error);
      setIsUpdating(false);
      setStatusMsg(error.message);
    }
  };

  const handleOpenPort = async () => {
    await serial.connect();
  };

  const handleClosePort = () => {
    serial.disconnect();
    setStatusMsg("Please open the port and try again.");
    setFirmwareUpdateStatus(UpdateStatus.Ready);
    setIsUpdating(false);
  };

  async function handleTimeout() {
    console.log("Timeout!");
    setStatusMsg("Inverter timed out. Please try again.");
    setFirmwareUpdateStatus(UpdateStatus.Error);
    setIsUpdating(false);
    expectedResponse.current = new Uint8Array();
  }

  function getNextDataWriteCommand() {
    const nextDataWriteCommand = new Uint8Array(
      serialMessages.byteCommandArrayLength
    );

    const fileChunkSize = 48;
    // Calculate Offset
    /*
     * Weird math here. For the tms320 file, you need to send a length of 24 (0x18),
     * even though you're sending 48 bytes of data. And then, you need to increment
     * the destination address by 24 with every new packet (not 48).
     *
     * For the stm32 file, you use a length of 48 (0x30) and increment the destination address as expected.
     */
    const nextAddress =
      startAddr + (fileIndex.current / fileChunkSize) * lengthByte;
    const nextAddrBytes = new Uint8Array(new Uint32Array([nextAddress]).buffer);

    // Make sure you don't start reading past the end of the file
    const chunkSize =
      firmwareFile.current.length - fileIndex.current >= fileChunkSize
        ? fileChunkSize
        : firmwareFile.current.length - fileIndex.current;

    // Put the 2-byte command and 2-byte length at the beginning
    nextDataWriteCommand.set(commandAndLengthBytes, 0);

    // Then the 4-byte destination address
    nextDataWriteCommand.set(nextAddrBytes, commandAndLengthBytes.length);

    // Then the data from the file
    nextDataWriteCommand.set(
      firmwareFile.current.subarray(
        fileIndex.current,
        fileIndex.current + chunkSize
      ),
      commandAndLengthBytes.length + nextAddrBytes.length
    );

    fileIndex.current += chunkSize;

    return nextDataWriteCommand;
  }

  async function handleNewSerialMessage({ value }) {
    //* Let's make a state machine
    const receivedMessage = value;

    if (!expectedResponse.current?.length || !receivedMessage?.length) return;

    if (
      arraysAreEqual(
        receivedMessage.subarray(0, expectedResponse.current.length),
        expectedResponse.current
      )
    ) {
      // We got the expected response
      // console.log(
      //   "🚀 ~ file: Serial.jsx:72 ~ handleNewSerialMessage ~ value:",
      //   `Status: ${firmwareUpdateStatus}`,
      //   Array.from(value, (x) => x.toString(16).padStart(2, "0"))
      // );
      clearTimeout(timerId.current);

      switch (firmwareUpdateStatus) {
        case UpdateStatus.Awaiting_UpdateCommand_Ack: {
          setStatusMsg("Erasing flash...");
          setFirmwareUpdateStatus(UpdateStatus.Awaiting_FlashErase_Ack);
          setPercentComplete(2);
          expectedResponse.current = serialMessages.flashEraseCommand_Ack;
          currentCommand.current = flashEraseCommand;
          await serial.write(currentCommand.current);

          // timerId.current = setTimeout(handleTimeout, timeout);
          break;
        }
        case UpdateStatus.Awaiting_FlashErase_Ack: {
          setStatusMsg("Writing firmware file...");
          setFirmwareUpdateStatus(UpdateStatus.Awaiting_DataWritten_Ack);
          setPercentComplete(5);
          expectedResponse.current = serialMessages.dataWritten_Ack;
          currentCommand.current = getNextDataWriteCommand();
          await serial.write(currentCommand.current);

          // timerId.current = setTimeout(handleTimeout, timeout);
          break;
        }
        case UpdateStatus.Awaiting_DataWritten_Ack: {
          if (fileIndex.current < firmwareFile.current.length) {
            expectedResponse.current = serialMessages.dataWritten_Ack;
            currentCommand.current = getNextDataWriteCommand();

            // We arbitrarily assign 92% of the process to transfering the file (from 5%-97%)
            // This take by far the most time of any part of the process
            const percentIncrement = Math.round(
              92.0 * (fileIndex.current / firmwareFile.current.length)
            );
            setPercentComplete(5 + percentIncrement);
          } else {
            // if no more packets, send "data completed" command
            setFirmwareUpdateStatus(UpdateStatus.Awaiting_DataComplete_Ack);
            expectedResponse.current = serialMessages.dataCompleteCommand_Ack;
            currentCommand.current = serialMessages.dataCompleteCommand;
            setPercentComplete(97);
          }

          await serial.write(currentCommand.current);

          // timerId.current = setTimeout(handleTimeout, timeout);

          break;
        }
        case UpdateStatus.Awaiting_DataComplete_Ack: {
          setStatusMsg("Verifying flash...");
          setFirmwareUpdateStatus(UpdateStatus.Awaiting_FlashVerification_Ack);
          expectedResponse.current =
            serialMessages.flashVerificationCommand_Ack;
          currentCommand.current = serialMessages.flashVerificationCommand;
          await serial.write(currentCommand.current);
          setPercentComplete(98);

          // timerId.current = setTimeout(handleTimeout, timeout);

          break;
        }
        case UpdateStatus.Awaiting_FlashVerification_Ack: {
          setStatusMsg("Restarting inverter...");
          setFirmwareUpdateStatus(UpdateStatus.Awaiting_RestartInverter_Ack);
          setPercentComplete(99);
          expectedResponse.current = serialMessages.restartInverterCommand_Ack;
          currentCommand.current = serialMessages.restartInverterCommand;
          await serial.write(currentCommand.current);

          // timerId.current = setTimeout(handleTimeout, timeout);
          break;
        }
        case UpdateStatus.Awaiting_RestartInverter_Ack: {
          // We're done!
          setStatusMsg(
            "Update complete! Please wait 15 seconds for the inverter to restart."
          );
          setFirmwareUpdateStatus(UpdateStatus.Done);
          setIsUpdating(false);
          setPercentComplete(100);

          clearTimeout(timerId.current);
          break;
        }
        case UpdateStatus.Error:
        case UpdateStatus.Done: {
          setIsUpdating(false);
          clearTimeout(timerId.current);
          return;
        }
        case UpdateStatus.Ready:
          break;
        default: {
          console.error(`Unexpected status ${firmwareUpdateStatus}`);
        }
      }
    } else {
      // We didn't receive the command we expected
      // This actually happens quite a lot. The inverter will continue to send the old response
      // until it receives and processes the next command. So, we just ignore it
      // unless it's a very specific failure response.
      const byteCode = receivedMessage[1];

      const ErrorByteCodes = {
        0x09: "Fatal Error - Resend Image.",
        0xfa: "Flash verify error.",
        0xfb: "Flash unlock failure.",
        0xfd: "Flash erase failure.",
        0xfe: "Flash programming failure.",
      };

      if (byteCode in ErrorByteCodes) {
        console.log(
          "🚀 ~ file: Serial.jsx:72 ~ handleNewSerialMessage ~ value:",
          `Error code: ${ErrorByteCodes[byteCode]}`,
          Array.from(value, (x) => x.toString(16).padStart(2, "0"))
        );

        clearTimeout(timerId.current);
        setFirmwareUpdateStatus(UpdateStatus.Error);
        setIsUpdating(false);
        expectedResponse.current = new Uint8Array();
        setStatusMsg(
          ErrorByteCodes[byteCode] + "\nPlease retry the update process."
        );
      }
    }
  }

  function arraysAreEqual(a, b) {
    if (a.length !== b.length) return false;
    return b.every((value, index) => value === a[index]);
  }

  return (
    <>
      <h3>Serial</h3>
      <hr />
      {serial.canUseSerial ? (
        <>
          <div>
            <button
              onClick={handleOpenPort}
              disabled={serial.portState !== "closed"}
            >
              Open Port
            </button>
            <button
              onClick={handleClosePort}
              disabled={serial.portState !== "open"}
            >
              Close Port
            </button>
            <p>
              COM Port Status: <b>{serial.portState}</b>
            </p>
          </div>
          <hr />
          <div>
            <h3>Firmware Update State</h3>

            <button
              onClick={handleStartFirmwareUpdate}
              disabled={isUpdating || serial.portState !== "open"}
            >
              Start Firmware Update
            </button>
            <div>
              <p>Status: {firmwareUpdateStatus?.toUpperCase()}</p>
              <p>Message: {statusMsg}</p>
              <p>Complete: {percentComplete}%</p>
            </div>
          </div>
        </>
      ) : (
        <p>Web serial is not supported in this browser.</p>
      )}
    </>
  );
});

export default Serial;
