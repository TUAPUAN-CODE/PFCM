import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';

const DeleteModal = ({ 
  open, 
  onClose, 
  itemId, 
  onConfirm, 
  tableType 
}) => {
  const handleConfirm = () => {
    onConfirm(itemId);
    onClose();
  };

  const getTitle = () => 
    tableType === 'md' ? 'ยืนยันการลบเครื่องตรวจจับ' : 'ยืนยันการลบพื้นที่';
  
  const getMessage = () => 
    tableType === 'md'
      ? `คุณต้องการลบเครื่องตรวจจับโลหะหมายเลข "${itemId}" ใช่หรือไม่?`
      : `คุณต้องการลบพื้นที่รหัส "${itemId}" ใช่หรือไม่?`;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{getTitle()}</DialogTitle>
      <DialogContent>
        <DialogContentText>{getMessage()}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button onClick={handleConfirm} color="error" variant="contained">
          ยืนยันการลบ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteModal;