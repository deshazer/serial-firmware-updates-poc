export const byteCommandArrayLength = 60;

function padByteArrayWithZero(byteArray) {
  let paddedByteArray = new Uint8Array(byteCommandArrayLength);
  paddedByteArray.set(byteArray);
  return paddedByteArray;
}

// Fixed commands and responses (responses are suffixed with "Ack")
export const updateCommand_stm32 = padByteArrayWithZero(
  new Uint8Array([0x05, 0x12], byteCommandArrayLength)
);
export const updateCommand_tms320 = padByteArrayWithZero(
  new Uint8Array([0x05, 0x14], byteCommandArrayLength)
);
export const updateCommand_Ack = new Uint8Array([0x03, 0x21, 0x34]);
export const flashEraseCommand_stm32 = padByteArrayWithZero(
  new Uint8Array([0x03, 0x01, 0x00, 0x00, 0x12], byteCommandArrayLength)
);
export const flashEraseCommand_tms320 = padByteArrayWithZero(
  new Uint8Array([0x03, 0x01, 0x00, 0x00, 0x14], byteCommandArrayLength)
);
export const flashEraseCommand_Ack = new Uint8Array([0x03, 0x02, 0x34]);
export const dataWritten_Ack = new Uint8Array([0x03, 0x04, 0x34]);
export const dataCompleteCommand = padByteArrayWithZero(
  new Uint8Array([0x03, 0x05], byteCommandArrayLength)
);
export const dataCompleteCommand_Ack = new Uint8Array([0x03, 0x06, 0x34]);
export const flashVerificationCommand = padByteArrayWithZero(
  new Uint8Array([0x03, 0x07], byteCommandArrayLength)
);
export const flashVerificationCommand_Ack = new Uint8Array([0x03, 0x08, 0x34]);
export const restartInverterCommand = padByteArrayWithZero(
  new Uint8Array([0x03, 0x0b], byteCommandArrayLength)
);
export const restartInverterCommand_Ack = new Uint8Array([0x03, 0x0c, 0x34]);

// Firmware specific commands and variables
let updateCommand;
let flashEraseCommand;
export const startAddr_stm32 = 0x0800d000;
export const startAddr_tms320 = 0x00084000;
let startAddress;
export const lengthByte_stm32 = 0x30;
export const lengthByte_tms320 = 0x18;
let lengthByte;
export const commandAndLengthBytes = new Uint8Array([
  0x03,
  0x03,
  lengthByte_stm32,
  0x00,
]);
