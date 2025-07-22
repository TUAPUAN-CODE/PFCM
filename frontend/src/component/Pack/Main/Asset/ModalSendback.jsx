import React, { useState } from 'react';
import { 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  Button,
  Typography,
  Box
} from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const ModalSendback = ({ open, onClose, tro_id, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendback = async () => {
  if (!tro_id) {
    console.error("Missing trolley ID");
    return;
  }

  setIsSubmitting(true);
  try {
    const response = await axios.put(`${API_URL}/api/pack/sendback`, {
      tro_id: tro_id
    });

    if (response.data.success) {
      onClose(); // ปิด Modal ก่อน
      if (onSuccess) {
        await onSuccess(); // แล้วค่อยอัปเดตข้อมูล
      }
    } else {
      console.error("Server error:", response.data.error);
      // สามารถแสดง error ให้ผู้ใช้เห็นได้ที่นี่
    }
  } catch (error) {
    console.error("Error sending back to cold room:", error);
    // แสดง error message ให้ผู้ใช้เห็น
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      PaperProps={{
        style: {
          borderRadius: '10px',
          padding: '10px',
          maxWidth: '500px'
        }
      }}
    >
      <DialogTitle id="alert-dialog-title" sx={{ textAlign: 'center', color: '#4aaaec' }}>
        <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
          <ReplyIcon sx={{ fontSize: 40, color: '#4aaaec', mr: 1 }} />
        </Box>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          ส่งกลับห้องเย็น
        </Typography>
      </DialogTitle>

      <DialogContent>
        <DialogContentText id="alert-dialog-description" sx={{ textAlign: 'center', color: '#787878' }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            คุณต้องการส่งรถเข็น #{tro_id} กลับห้องเย็นใช่หรือไม่?
          </Typography>
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', mb: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: '8px',
            px: 3,
            borderColor: '#4aaaec',
            color: '#4aaaec',
            '&:hover': {
              borderColor: '#3d96d2',
              backgroundColor: 'rgba(74, 170, 236, 0.04)'
            }
          }}
        >
          ยกเลิก
        </Button>
        <Button
          onClick={handleSendback}
          variant="contained"
          disabled={isSubmitting}
          sx={{
            borderRadius: '8px',
            px: 3, 
            backgroundColor: '#4aaaec',
            '&:hover': {
              backgroundColor: '#3d96d2'
            }
          }}
        >
          ยืนยัน
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalSendback;