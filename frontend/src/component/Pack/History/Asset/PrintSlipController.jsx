import React, { useState } from 'react';
import { Dialog, Box, Button, Tabs, Tab } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import SuccessPrintSlip from './SuccessPrintSlip';
import RepairPrintSlip from '../RepairPrintSlip';
import ColdStoragePrintSlip from './ColdStoragePrintSlip';

const PrintSlipController = ({ open, onClose, data, initialSlipType }) => {
  const [slipType, setSlipType] = useState(initialSlipType || 'success');

  if (!data) return null;

  const handleTabChange = (event, newValue) => {
    setSlipType(newValue);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }}
      sx={{
        '& .MuiDialog-paper': {
          width: '90%',
          maxWidth: '640px',
          minWidth: '300px',
          maxHeight: '90vh',
          margin: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          backgroundColor: "#fff",
          width: "95%",
          height: "95%",
          borderRadius: "4px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          '@media print': {
            width: '72.1mm',
            height: 'auto',
            padding: "0",
            margin: "0",
            overflow: "visible",
            '@page': {
              size: '80mm auto',
              margin: '0',
            }
          }
        }}
        className="print-content"
      >
        {/* Control buttons and tabs - hide when printing */}
        <Box sx={{
          '@media print': { display: 'none' }
        }}>
          {/* Buttons */}
          <Box sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            width: "100%",
            justifyContent: "center",
            gap: "10px",
            mb: 2
          }}>
            <Button
              variant="contained"
              onClick={onClose}
              startIcon={<CancelIcon />}
              sx={{
                flex: 1,
                maxWidth: "250px",
                height: "50px",
                backgroundColor: "#ff4444",
                fontSize: "16px",
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handlePrint}
              startIcon={<PrintIcon />}
              sx={{
                flex: 1,
                maxWidth: "250px",
                height: "50px",
                backgroundColor: "#2388d1",
                fontSize: "16px",
              }}
            >
              พิมพ์เอกสาร
            </Button>
          </Box>

          {/* Tabs */}
          <Tabs
            value={slipType}
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="slip type tabs"
            sx={{ mb: 2 }}
          >
            <Tab 
              value="success" 
              label="บรรจุสำเร็จ" 
              sx={{ fontSize: { xs: '14px', sm: '16px' } }}
            />
            <Tab 
              value="repair" 
              label="ส่งแก้ไข" 
              sx={{ fontSize: { xs: '14px', sm: '16px' } }}
            />
            <Tab 
              value="coldStorage" 
              label="ส่งเข้าห้องเย็น" 
              sx={{ fontSize: { xs: '14px', sm: '16px' } }}
            />
          </Tabs>
        </Box>

        {/* Content based on selected tab */}
        {slipType === 'success' && <SuccessPrintSlip data={data} />}
        {slipType === 'repair' && <RepairPrintSlip data={data} />}
        {slipType === 'coldStorage' && <ColdStoragePrintSlip data={data} />}
      </Box>
    </Dialog>
  );
};

export default PrintSlipController;