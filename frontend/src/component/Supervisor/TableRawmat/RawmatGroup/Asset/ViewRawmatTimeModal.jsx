import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ViewRawmatTimeModal = ({ isOpen, onClose, data }) => {
  if (!data) {
    return null;
  }

  const timeDetails = [
    { label: "เตรียม - บรรจุ", value: data.prep_to_pack },
    { label: "เตรียม - ห้องเย็น", value: data.prep_to_cold },
    { label: "ห้องเย็น - บรรจุ", value: data.cold_to_pack },
    { label: "ในห้องเย็น", value: data.cold },
    { label: "Rework", value: data.rework }
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "hsl(210, 100%, 60%)",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
        }}
      >
        <Typography variant="h6" component="div">
          ข้อมูลเวลากลุ่มวัตถุดิบ: {data.rm_group_name}
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: "24px" }}>
        <Box>
          <Typography variant="subtitle1" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            รายละเอียดเวลาในแต่ละขั้นตอน
          </Typography>
          
          <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: "8px", overflow: "hidden" }}>
            <Table>
              <TableBody>
                {timeDetails.map((item, index) => (
                  <TableRow 
                    key={index}
                    sx={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 95%)",
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell 
                      component="th" 
                      scope="row"
                      sx={{ 
                        fontSize: "14px",
                        fontWeight: "medium", 
                        padding: "12px 16px"
                      }}
                    >
                      {item.label}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        fontSize: "14px",
                        padding: "12px 16px" 
                      }}
                    >
                      {(item.value?.toFixed(2) || "0.00")} ชม.
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          
          <Box sx={{ marginTop: 3 }}>
            <Typography variant="body2" color="text.secondary">
              หมายเหตุ: เวลาทั้งหมดแสดงในหน่วยชั่วโมง (ชม.)
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: "16px 24px" }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: "hsl(210, 100%, 60%)",
            "&:hover": { backgroundColor: "hsl(210, 100%, 50%)" },
            borderRadius: "8px",
            textTransform: "none",
          }}
        >
          ปิด
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewRawmatTimeModal;