import React from 'react';
import { Dialog } from '@mui/material';
import EditPrinter from './EditPrinter';
import SendColdPrinter from './SendColdPrinter';
import SuccessPrinter from './SuccessPrinter';

const PrinterConponent = ({ open, onClose, data }) => {
    
  if (!data) return null;
  
  const destination = data.dest || '';
  
  console.log("PrinterContainer received data with destination:", destination);
  console.log(data);
  
  // Render the appropriate printer component based on destination
  switch (destination) {
    case 'จุดเตรียม':
      return (
        <EditPrinter 
          open={open} 
          onClose={onClose} 
          data={data}
          status={"รอแก้ไข"}
          onSave={() => {
            // Implement save functionality if needed
            console.log("Edit saved");
            onClose();
          }} 
        />
      );
    
    case 'เข้าห้องเย็น':
      return (
        <SendColdPrinter 
          open={open} 
          onClose={onClose} 
          data={data}
          status={"รอแก้ไข"}
          onSave={() => {
            // Implement save functionality if needed
            console.log("Cold storage entry saved");
            onClose();
          }} 
        />
      );
    
    default:
      return (
        <SuccessPrinter 
          open={open} 
          onClose={onClose} 
          data={data} 
        />
      );
  }
};

export default PrinterConponent;