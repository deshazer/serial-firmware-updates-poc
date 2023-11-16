import * as React from 'react';
import { SerialPortConnection } from './SerialPortLib';



export const useSerialPort = () => {
  const [serialPort, setSerialPort] = React.useState(null);
  const [isOpening, setIsOpening] = React.useState(false);


  React.useEffect(() => {
    const port = new SerialPortConnection();
    setSerialPort(port);

    return () => {
      if (port) {
        port?.closePort();
      }
    };
  }, []);

  React.useEffect(() => {
    if(serialPort.isOpen){
      console.log("serial port is open")
    } else {
      console.log("serial port is closed")
    }
  }, [serialPort?.isOpen])

  const handleOpenPort = async () => {
    try {
      setIsOpening(true);
      await serialPort.openPort();
    } catch (error) {
      console.error(error);
    } finally {
      setIsOpening(false);
    }
  };

  return {
    serialPort,
    isOpening,
    handleOpenPort,
  };
};
