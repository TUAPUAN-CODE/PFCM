import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Tooltip,
  IconButton,
  useTheme,
  styled,
  Divider,
  alpha,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import MixIcon from '@mui/icons-material/Blender';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import ViewListIcon from '@mui/icons-material/ViewList';

// สร้าง header cell ที่มีการออกแบบที่สวยงามขึ้น
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.85rem',
  textTransform: 'none',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  padding: '12px 16px',
  borderBottom: 'none',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
}));

// ปรับแต่ง TableCell ให้มีการออกแบบที่ดีขึ้น
const EnhancedTableCell = styled(TableCell)(({ theme }) => ({
  fontSize: '0.85rem',
  padding: '10px 16px',
  color: theme.palette.text.primary,
  borderColor: alpha(theme.palette.divider, 0.5),
}));

// สร้าง InfoCard สำหรับแสดงข้อมูลในส่วน summary
const InfoCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.primary.main, 0.04),
  borderRadius: theme.shape.borderRadius * 1.5,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  }
}));

// StyledAccordion สำหรับการแสดงกลุ่มรายการที่มี mix code เดียวกัน
const StyledAccordion = styled(Accordion)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 1.5,
  overflow: 'hidden',
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.05)}`,
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: theme.spacing(0, 0, 2),
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  padding: theme.spacing(0, 2),
  backgroundColor: alpha(theme.palette.primary.main, 0.05),
  '&.Mui-expanded': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  },
}));

// ปรับแต่ง StatusChip ด้วยสีที่เหมาะสมกว่าเดิม
const StatusChip = ({ status }) => {
  const theme = useTheme();
  
  if (!status) return (
    <Chip 
      label="บรรจุสำเร็จ" 
      size="small" 
      sx={{ 
        fontWeight: 500,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        color: theme.palette.success.dark,
        borderColor: alpha(theme.palette.success.main, 0.3),
      }}
      variant="outlined"
    />
  );

  let color = 'default';
  let backgroundColor = alpha(theme.palette.grey[500], 0.1);
  let textColor = theme.palette.text.primary;
  const statusLower = status.toLowerCase();

  if (statusLower.includes('complete')) {
    color = 'success';
    backgroundColor = alpha(theme.palette.success.main, 0.1);
    textColor = theme.palette.success.dark;
  }
  if (statusLower.includes('pending')) {
    color = 'warning';
    backgroundColor = alpha(theme.palette.warning.main, 0.1);
    textColor = theme.palette.warning.dark;
  }
  if (statusLower.includes('error')) {
    color = 'error';
    backgroundColor = alpha(theme.palette.error.main, 0.1);
    textColor = theme.palette.error.dark;
  }

  return (
    <Chip 
      label={status} 
      size="small" 
      sx={{ 
        fontWeight: 500,
        backgroundColor: backgroundColor,
        color: textColor,
        borderColor: color !== 'default' ? alpha(theme.palette[color].main, 0.3) : undefined,
      }}
      variant={color !== 'default' ? "outlined" : "filled"}
    />
  );
};

// Format date consistently
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  } catch (error) {
    console.error("Date formatting error:", error);
    return '-';
  }
};

// Format full date and time for tooltip
const formatFullDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString();
  } catch (error) {
    console.error("DateTime formatting error:", error);
    return '';
  }
};

const MixDetailsDialog = ({ open, onClose, mixData, onPrint }) => {
  const theme = useTheme();

  // Move useMemo hook here to ensure it's always called
  const { groupedItems, individualItems } = useMemo(() => {
    if (!mixData || !mixData.groupItems) {
      return { groupedItems: [], individualItems: [] };
    }

    const groups = {};
    const individuals = [];
    
    mixData.groupItems.forEach(item => {
      const mixCode = item.mix_code;
      
      // ถ้าไม่มี mix_code ให้เพิ่มเข้าไปในรายการเดี่ยว
      if (!mixCode) {
        individuals.push(item);
        return;
      }
      
      // ถ้ามี mix_code ให้จัดกลุ่ม
      if (!groups[mixCode]) {
        groups[mixCode] = {
          mix_code: mixCode,
          items: [],
          totalItems: 0,
          line_name: item.line_name || '-',
          code: item.code || '-',
          doc_no: item.doc_no || '-',
          rm_status: item.rm_status,
          md_remark: item.md_remark || '',
          defect_remark: item.defect_remark || ''
        };
      }
      
      groups[mixCode].items.push(item);
      groups[mixCode].totalItems++;
    });
    
    return {
      groupedItems: Object.values(groups),
      individualItems: individuals
    };
  }, [mixData]);

  // Early return after all hooks are called
  if (!mixData || !mixData.groupItems) {
    return null;
  }

  const handlePrintMixGroup = (groupData) => {
    // สร้างข้อมูลสำหรับการพิมพ์ทั้งกลุ่ม mix
    const printData = {
      ...mixData,
      ...groupData,
      materials: groupData.items // กำหนด materials เป็น array ของสมาชิกทั้งหมดในกลุ่ม
    };
    onPrint(printData);
  };

  const handlePrintAllItems = () => {
    // สร้างข้อมูลสำหรับการพิมพ์ทั้งหมด
    const printData = {
      ...mixData,
      materials: mixData.groupItems
    };
    onPrint(printData);
  };

  // สร้าง Info Item Component สำหรับแสดงข้อมูลในส่วนหัว
  const InfoItem = ({ label, value, icon }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, color: alpha(theme.palette.text.primary, 0.7) }}>
        {icon && React.cloneElement(icon, { fontSize: 'small', sx: { mr: 0.5, opacity: 0.7 } })}
        <Typography variant="body2" color="inherit">{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {typeof value === 'string' ? (
          <Typography variant="body1" fontWeight={500}>{value}</Typography>
        ) : (
          value
        )}
      </Box>
    </Box>
  );

  // แสดงตารางรายการ (ใช้ได้ทั้ง grouped และ individual)
  const ItemsTable = ({ items, showHeader = true }) => (
    <TableContainer 
      sx={{ 
        borderRadius: 1.5,
        border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.05)}`,
        overflow: 'hidden',
        mb: 2
      }}
    >
      <Table sx={{ minWidth: 650 }}>
        {showHeader && (
          <TableHead>
            <TableRow>
              <StyledTableCell sx={{ borderTopLeftRadius: 6 }}>ลำดับ</StyledTableCell>
              <StyledTableCell>Material</StyledTableCell>
              <StyledTableCell>Material Name</StyledTableCell>
              <StyledTableCell>Batch</StyledTableCell>
              <StyledTableCell>น้ำหนัก</StyledTableCell>
              <StyledTableCell>สถานะ</StyledTableCell>
              <StyledTableCell>วันที่เบิก</StyledTableCell>
              <StyledTableCell sx={{ borderTopRightRadius: 6 }}>การจัดการ</StyledTableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {items.map((item, index) => (
            <TableRow 
              key={index}
              hover
              sx={{ 
                backgroundColor: index % 2 === 0 ? theme.palette.background.paper : alpha(theme.palette.action.hover, 0.05),
                '&:last-child td': { border: 0 },
                transition: 'background-color 0.2s ease',
              }}
            >
              <EnhancedTableCell sx={{ fontWeight: 600 }}>{index + 1}</EnhancedTableCell>
              <EnhancedTableCell>{item.mat || '-'}</EnhancedTableCell>
              <EnhancedTableCell>{item.mat_name || '-'}</EnhancedTableCell>
              <EnhancedTableCell>
                {item.batch_after ? (
                  <Chip 
                    label={item.batch_after} 
                    size="small" 
                    variant="outlined" 
                    sx={{
                      fontWeight: 500,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      color: theme.palette.primary.dark,
                    }}
                  />
                ) : '-'}
              </EnhancedTableCell>
              <EnhancedTableCell>{item.weight_RM || item.weight_in_trolley || '-'}</EnhancedTableCell>
              <EnhancedTableCell>
                <StatusChip status={item.rm_status} />
              </EnhancedTableCell>
              <EnhancedTableCell>
                {item.withdraw_date ? (
                  <Tooltip title={formatFullDateTime(item.withdraw_date)}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EventNoteIcon 
                        fontSize="small" 
                        sx={{ mr: 0.5, color: alpha(theme.palette.text.primary, 0.6), fontSize: '0.9rem' }} 
                      />
                      <Typography variant="body2">
                        {formatDate(item.withdraw_date)}
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : '-'}
              </EnhancedTableCell>
              <EnhancedTableCell>
                <Tooltip title="พิมพ์รายการเดี่ยว">
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => onPrint(item)}
                    sx={{ 
                      color: theme.palette.primary.main,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
                      }
                    }}
                  >
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </EnhancedTableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // แสดงหมายเหตุสำหรับแต่ละกลุ่ม
  const RemarkSection = ({ mdRemark, defectRemark }) => {
    if (!mdRemark && !defectRemark) return null;
    
    return (
      <Box 
        sx={{ 
          p: 2, 
          mb: 2,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          borderRadius: 1.5,
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          หมายเหตุเพิ่มเติม
        </Typography>
        
        {mdRemark && (
          <Box sx={{ mb: defectRemark ? 2 : 0 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>MD Remarks</Typography>
            <Typography variant="body2" sx={{ pl: 1, py: 0.5, borderLeft: `3px solid ${alpha(theme.palette.info.main, 0.5)}` }}>
              {mdRemark}
            </Typography>
          </Box>
        )}
        
        {defectRemark && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Defect Remarks</Typography>
            <Typography variant="body2" sx={{ pl: 1, py: 0.5, borderLeft: `3px solid ${alpha(theme.palette.warning.main, 0.5)}` }}>
              {defectRemark}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // จำนวนรวมของรายการทั้งหมด
  const totalItemsCount = mixData.groupItems.length;
  // จำนวนรายการที่มี mix code
  const groupedItemsCount = groupedItems.reduce((total, group) => total + group.totalItems, 0);
  // จำนวนรายการที่ไม่มี mix code
  const individualItemsCount = individualItems.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
        }
      }}
      aria-labelledby="mix-details-dialog-title"
    >
      <DialogTitle 
        id="mix-details-dialog-title" 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          py: 2,
          backgroundColor: alpha(theme.palette.primary.main, 0.03),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              mr: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main
            }}
          >
            <GroupWorkIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              รายละเอียดกลุ่ม Mix
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {mixData.code || "รายการ Mix"}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Tooltip title="พิมพ์ทุกรายการ">
            <IconButton 
              color="primary" 
              onClick={handlePrintAllItems} 
              sx={{ 
                mr: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                }
              }}
            >
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <IconButton 
            edge="end" 
            onClick={onClose} 
            aria-label="close"
            sx={{ 
              color: theme.palette.grey[600],
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {/* Mix summary information */}
        <InfoCard elevation={0} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
            ข้อมูลสรุป
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
            <InfoItem 
              label="จำนวนรายการทั้งหมด" 
              value={
                <Chip 
                  label={totalItemsCount} 
                  size="small"
                  color="primary" 
                  sx={{ 
                    fontWeight: 600,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.dark,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  }}
                  variant="outlined"
                />
              } 
            />
            <InfoItem 
              label="จำนวนกลุ่ม Mix" 
              value={
                <Chip 
                  label={groupedItems.length} 
                  size="small"
                  color="primary" 
                  sx={{ 
                    fontWeight: 600,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.dark,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  }}
                  variant="outlined"
                />
              } 
            />
            <InfoItem 
              label="จำนวนรายการเดี่ยว" 
              value={
                <Chip 
                  label={individualItemsCount} 
                  size="small"
                  color="secondary" 
                  sx={{ 
                    fontWeight: 600,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    color: theme.palette.secondary.dark,
                    borderColor: alpha(theme.palette.secondary.main, 0.3),
                  }}
                  variant="outlined"
                />
              } 
            />
            <InfoItem 
              label="Code" 
              value={`${mixData.code || "-"} ${mixData.doc_no ? `-(${mixData.doc_no})` : ""}`} 
            />
          </Box>
        </InfoCard>

        {/* กลุ่มรายการที่มี mix code เดียวกัน */}
        {groupedItems.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <MixIcon fontSize="small" sx={{ mr: 1 }} />
              รายการกลุ่ม Mix ({groupedItems.length} กลุ่ม)
            </Typography>
            
            {groupedItems.map((group, idx) => (
              <StyledAccordion key={`group-${idx}`} defaultExpanded={groupedItems.length === 1}>
                <StyledAccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel-${idx}-content`}
                  id={`panel-${idx}-header`}
                >
                  <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MixIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {group.mix_code || "ไม่ระบุ Mix Code"}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ mr: 1, color: alpha(theme.palette.text.primary, 0.7) }}>
                          รายการ:
                        </Typography>
                        <Chip 
                          label={group.totalItems} 
                          size="small"
                          color="primary" 
                          sx={{ 
                            fontWeight: 600,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.dark,
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                          }}
                          variant="outlined"
                        />
                      </Box>
                      
                      <StatusChip status={group.rm_status} />
                      
                      <Tooltip title="พิมพ์ทั้งกลุ่ม">
                        <IconButton 
                          color="primary" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintMixGroup(group);
                          }} 
                          size="small"
                          sx={{ 
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            }
                          }}
                        >
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </StyledAccordionSummary>
                
                <AccordionDetails sx={{ px: 1, py: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, px: 2, mb: 2 }}>
                      <InfoItem 
                        label="Line" 
                        value={group.line_name || '-'} 
                      />
                      <InfoItem 
                        label="Code" 
                        value={`${group.code} ${group.doc_no ? `-(${group.doc_no})` : ""}`} 
                      />
                    </Box>
                  </Box>
                  
                  <ItemsTable items={group.items} showHeader={true} />
                  
                  <RemarkSection mdRemark={group.md_remark} defectRemark={group.defect_remark} />
                </AccordionDetails>
              </StyledAccordion>
            ))}
          </Box>
        )}

        {/* แสดงรายการเดี่ยวที่ไม่มี mix code */}
        {individualItems.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <ViewListIcon fontSize="small" sx={{ mr: 1 }} />
              รายการเดี่ยว ({individualItems.length} รายการ)
            </Typography>
            
            <ItemsTable items={individualItems} showHeader={true} />
            
            {/* หมายเหตุสำหรับรายการเดี่ยว (ถ้ามี) */}
            {individualItems.some(item => item.md_remark || item.defect_remark) && (
              <Box 
                sx={{ 
                  p: 2, 
                  mb: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  หมายเหตุสำหรับรายการเดี่ยว
                </Typography>
                
                {individualItems.map((item, idx) => {
                  if (!item.md_remark && !item.defect_remark) return null;
                  
                  return (
                    <Box key={`remark-${idx}`} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        รายการที่ {idx + 1} - {item.mat_name || item.mat || "ไม่ระบุชื่อ"}
                      </Typography>
                      
                      {item.md_remark && (
                        <Box sx={{ mb: item.defect_remark ? 1 : 0 }}>
                          <Typography variant="body2" sx={{ pl: 1, py: 0.5, borderLeft: `3px solid ${alpha(theme.palette.info.main, 0.5)}` }}>
                            <Typography component="span" variant="caption" color="text.secondary">MD Remarks: </Typography>
                            {item.md_remark}
                          </Typography>
                        </Box>
                      )}
                      
                      {item.defect_remark && (
                        <Box>
                          <Typography variant="body2" sx={{ pl: 1, py: 0.5, borderLeft: `3px solid ${alpha(theme.palette.warning.main, 0.5)}` }}>
                            <Typography component="span" variant="caption" color="text.secondary">Defect Remarks: </Typography>
                            {item.defect_remark}
                          </Typography>
                        </Box>
                      )}
                      
                      {idx < individualItems.length - 1 && (
                        <Divider sx={{ my: 1, opacity: 0.6 }} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ 
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 500,
            minWidth: '100px'
          }}
        >
          ปิด
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MixDetailsDialog;