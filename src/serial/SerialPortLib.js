export class SerialPortConnection {
  notSupportedError = new Error('Serial not supported');
  BAUD_RATE = 115200;

  constructor(onRead) {
    if (!('serial' in window.navigator)) {
      throw this.notSupportedError;
    }

    this.isOpen = false;
    this.port = null;
    this.reader = null;
    this.writer = null;
    this._onRead = onRead;

  }

  _onDisconnect(e) {
    console.log('Disconnection event');
    console.log(e);
    this.isOpen = false;
 }

  async closePort() {
    try {
      if (this.reader) {
        console.log('Closing reader');
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.writer) {
        console.log('Closing writer');
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        console.log('Closing port');
        await this.port.close();
        this.port = null;
      }
      this.isOpen = false;
    } catch (error) {
      console.log('Disconnect error: ', error);
    }
  }

  async openPort() {
    try {
      if (this.isOpen) {
        console.log('Already connected, disconnecting first');
        await this.closePort();
      }

      console.log('Requesting port');
      this.port = await navigator.serial.requestPort();

      // This means someone unplugged the device
      this.port.addEventListener('disconnect', this._onDisconnect);

      console.log('Opening port');
      await this.port.open({ baudRate: this.BAUD_RATE });

      console.log('Port info', this.port.getInfo());

      this.isOpen = true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async read() {
    try {
      const { value, done } = await this.reader.read();
      if (done) {
        throw new Error('Read operation has been cancelled');
      }
      return value;
    } catch (error) {
      console.error(error);
    }
  }

  async write(data) {
    await this.writer.write(data);
  }

  async close() {
    await this.reader.cancel();
    await this.writer.close();
    await this.port.close();
  }
}
