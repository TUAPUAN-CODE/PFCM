import React, { useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ModalAlert = ({ open, onClose }) => {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 10 }}
    >
      <Alert
        icon={<CheckCircleIcon fontSize="inherit" />}
        severity="success"
        sx={{
          width: '100%',
          backgroundColor: '#41cc4f',
		  boxShadow: "0 0px 3px rgba(1, 1, 1, 0.2)",
          color: 'white',
          '& .MuiAlert-icon': {
            color: 'white'
          }
        }}
      >
        ดำเนินการเสร็จสิ้น
      </Alert>
    </Snackbar>
  );
};

export default ModalAlert;