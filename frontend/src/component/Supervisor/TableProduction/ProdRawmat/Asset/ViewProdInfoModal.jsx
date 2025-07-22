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
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ViewProdInfoModal = ({ isOpen, onClose, data }) => {
  if (!data || !data.prod_info) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
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
          แผนการผลิตของวัตถุดิบ: {data.mat_name} ({data.mat})
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
        {data.prod_info && data.prod_info.length > 0 ? (
          <Box>
            <Typography variant="subtitle1" sx={{ marginBottom: 2, fontWeight: "bold" }}>
              รายการแผนการผลิตทั้งหมด ({data.prod_info.length} รายการ)
            </Typography>
            
            <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: "8px" }}>
              <List disablePadding>
                {data.prod_info.map(({ prod_id, details }, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <Divider />}
                    <Box sx={{ padding: "12px 16px", backgroundColor: idx % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 95%)" }}>
                      {details.map((detail, subIdx) => (
                        <ListItem key={subIdx} sx={{ padding: "8px 0" }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                                  {detail.code}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                หมายเลขเอกสาร: {detail.doc_no} | ไลน์การผลิต: {detail.line_type_name || "ไม่มีข้อมูล"}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </Box>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 5 }}>
            ไม่พบข้อมูลแผนการผลิตสำหรับวัตถุดิบนี้
          </Typography>
        )}
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

export default ViewProdInfoModal;