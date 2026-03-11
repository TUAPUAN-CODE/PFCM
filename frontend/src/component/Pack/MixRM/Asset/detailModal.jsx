import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    Divider,
    IconButton,
    Collapse,
    Paper,
    Chip,
    Card,
    CardContent,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EventIcon from '@mui/icons-material/Event';
import InfoIcon from '@mui/icons-material/Info';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { styled } from '@mui/material/styles';
import ModalDelete from "./ModleDelete";

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: theme.shape.borderRadius,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        border: `1px solid ${theme.palette.divider}`,
    },
}));

const StyledDialogTitle = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2, 3),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
}));

const StyledTypographyTitle = styled(Typography)(({ theme }) => ({
    fontSize: '1.25rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
    margin: theme.spacing(3, 0),
}));

const StyledTable = styled(Table)(({ theme }) => ({
    '& .MuiTableCell-head': {
        backgroundColor: theme.palette.primary.light,
        color: theme.palette.primary.contrastText,
        fontWeight: 600,
        fontSize: '0.875rem',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        padding: theme.spacing(1.5),
    },
    '& .MuiTableCell-body': {
        fontSize: '0.875rem',
        padding: theme.spacing(1.5),
    },
    borderCollapse: 'separate',
    borderSpacing: 0,
    '& .MuiTableRow-root:last-child .MuiTableCell-body': {
        borderBottom: 'none',
    },
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
    borderRadius: '4px',
    fontWeight: 500,
    fontSize: '0.75rem',
    ...(status === 'success' && {
        backgroundColor: theme.palette.success.light,
        color: theme.palette.success.dark,
    }),
    ...(status === 'pending' && {
        backgroundColor: theme.palette.warning.light,
        color: theme.palette.warning.dark,
    }),
}));

const SummaryCard = styled(Card)(({ theme }) => ({
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(3),
    border: `1px solid ${theme.palette.divider}`,
}));

const InfoRow = styled(Box)(({ theme }) => ({
    display: 'flex',
    padding: theme.spacing(1, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
        borderBottom: 'none',
    },
}));

const InfoLabel = styled(Box)(({ theme }) => ({
    width: '40%',
    fontWeight: 500,
    color: theme.palette.text.secondary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
}));

const InfoValue = styled(Box)(({ theme }) => ({
    width: '60%',
    color: theme.palette.text.primary,
}));

const DetailPanel = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(1, 0, 2),
}));

const TimelineItem = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    border: `1px solid ${theme.palette.divider}`,
}));

const TimelineIcon = styled(Box)(({ theme }) => ({
    marginRight: theme.spacing(2),
    color: theme.palette.primary.light,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const TimelineContent = styled(Box)(({ theme }) => ({
    flex: 1,
}));

const TimelineDate = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    marginTop: theme.spacing(0.5),
}));

const DetailModal = ({ item, onClose, onSuccess, dataPrinter }) => {
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const mixedHistory = item.materials || [];
    const mixed_code = item.mix_code;

    const handleRowClick = (uniqueId) => {
        setSelectedRowId(prevId => prevId === uniqueId ? null : uniqueId);
    };

    const handleOpenDeleteModal = () => {
        setDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
    };

    const handleDeleteSuccess = () => {
        onClose();
        if (onSuccess) {
            onSuccess();
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "ไม่มีข้อมูล";

        try {
            if (dateString === "แสดงข้อมูล") {
                return dateString;
            }
            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return dateString;
            }
            const options = {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };

            return new Intl.DateTimeFormat('en-TH', options).format(date);
        } catch (error) {
            return dateString;
        }
    };

    return (
        <>
            <StyledDialog open={true} onClose={onClose} fullWidth maxWidth="lg">
                <DialogContent sx={{ p: 0 }}>
                    <StyledDialogTitle>
                        <StyledTypographyTitle variant="h6">
                            <InfoIcon fontSize="small" />
                            รายละเอียดข้อมูล (รหัสผสม: {mixed_code})
                        </StyledTypographyTitle>
                        <IconButton
                            aria-label="close"
                            onClick={onClose}
                            sx={{
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </StyledDialogTitle>

                    <Box sx={{ p: 3 }}>
                        <SummaryCard>
                            <CardContent>
                                <Typography
                                    variant="subtitle1"
                                    sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                                >
                                    <InfoIcon fontSize="small" />
                                    ข้อมูลสรุป
                                </Typography>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                    <InfoRow>
                                        <InfoLabel>รหัสการผสม</InfoLabel>
                                        <InfoValue><Chip size="small" label={mixed_code} color="primary" /></InfoValue>
                                    </InfoRow>

                                    <InfoRow>
                                        <InfoLabel>แผนการผลิต</InfoLabel>
                                        <InfoValue>{item.codes || '-'}</InfoValue>
                                    </InfoRow>

                                    <InfoRow>
                                        <InfoLabel>เอกสารเลขที่</InfoLabel>
                                        <InfoValue>{item.doc_nos || '-'}</InfoValue>
                                    </InfoRow>

                                    <InfoRow>
                                        <InfoLabel>น้ำหนักรวม</InfoLabel>
                                        <InfoValue>
                                            <Chip
                                                size="small"
                                                label={`${item.totalWeight?.toFixed(2) || '-'} กก.`}
                                                color="secondary"
                                            />
                                        </InfoValue>
                                    </InfoRow>

                                    <InfoRow>
                                        <InfoLabel>จำนวนวัตถุดิบ</InfoLabel>
                                        <InfoValue>{item.itemCount || '-'} รายการ</InfoValue>
                                    </InfoRow>

                                    <InfoRow>
                                        <InfoLabel>สถานที่พัก</InfoLabel>
                                        <InfoValue>{item.stay_places || '-'}</InfoValue>
                                    </InfoRow>
                                </Box>
                            </CardContent>
                        </SummaryCard>

                        <Typography
                            variant="subtitle1"
                            sx={{
                                mb: 2,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <LocalShippingIcon fontSize="small" />
                            รายการรถเข็นทั้งหมด ({mixedHistory.length} รายการ)
                        </Typography>

                        {mixedHistory.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                                <Typography color="textSecondary">ไม่มีข้อมูลรถเข็น</Typography>
                            </Paper>
                        ) : (
                            <StyledTable aria-label="mixed history table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="center" width="5%">ลำดับ</TableCell>
                                        <TableCell align="center" width="10%">Batch</TableCell>
                                        <TableCell align="center" width="20%">กลุ่มวัตถุดิบ</TableCell>
                                        <TableCell align="center" width="15%">ไลน์การผลิต</TableCell>
                                        <TableCell align="center" width="20%">รหัส</TableCell>
                                        <TableCell align="center" width="15%">น้ำหนักวัตถุดิบ</TableCell>
                                        <TableCell align="center" width="15%">รายละเอียด</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {mixedHistory.map((historyItem, index) => {
                                        const uniqueId = `row-${index}-${historyItem.rmfp_id || index}`;
                                        return (
                                            <React.Fragment key={uniqueId}>
                                                <TableRow
                                                    onClick={() => handleRowClick(uniqueId)}
                                                    sx={{
                                                        backgroundColor: index % 2 === 0 ? "#f9fafc" : "#ffffff",
                                                        '&:hover': {
                                                            cursor: 'pointer',
                                                            backgroundColor: '#f0f7ff',
                                                            transition: 'background-color 0.2s'
                                                        }
                                                    }}
                                                >
                                                    <TableCell align="center">
                                                        <Chip
                                                            size="small"
                                                            label={index + 1}
                                                            color="primary"
                                                            variant="outlined"
                                                            sx={{ minWidth: '30px', fontWeight: 600 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">{historyItem.batch_after ?? '-'}</TableCell>
                                                    <TableCell>{historyItem.mat_name ?? '-'}</TableCell>
                                                    <TableCell align="center">{historyItem.line_name ?? '-'}</TableCell>
                                                    <TableCell align="center">
                                                        {historyItem.code}
                                                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8rem', display: 'block' }}>
                                                            ({historyItem.doc_no})
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            size="small"
                                                            label={`${historyItem.weight_RM ?? '-'} กก.`}
                                                            color="secondary"
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            color={selectedRowId === uniqueId ? "primary" : "inherit"}
                                                            sx={{
                                                                minWidth: '32px',
                                                                boxShadow: 'none',
                                                                '&:hover': {
                                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                                }
                                                            }}
                                                            endIcon={selectedRowId === uniqueId ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                                        >
                                                            {selectedRowId === uniqueId ? "ซ่อน" : "ดู"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                                        <Collapse in={selectedRowId === uniqueId} timeout="auto" unmountOnExit>
                                                            <DetailPanel>
                                                                <Typography
                                                                    variant="subtitle2"
                                                                    sx={{
                                                                        mb: 2,
                                                                        fontWeight: 600,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 1
                                                                    }}
                                                                >
                                                                    <EventIcon fontSize="small" />
                                                                    ประวัติการทำงาน
                                                                </Typography>

                                                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                                                    <TimelineItem>
                                                                        <TimelineIcon>
                                                                            <EventIcon />
                                                                        </TimelineIcon>
                                                                        <TimelineContent>
                                                                            <Typography variant="body2" fontWeight={500}>เวลาเบิกวัตถุดิบจากห้องเย็นใหญ่</Typography>
                                                                            <TimelineDate>{formatDate(historyItem.withdraw_date)}</TimelineDate>
                                                                        </TimelineContent>
                                                                    </TimelineItem>

                                                                    <TimelineItem>
                                                                        <TimelineIcon>
                                                                            <EventIcon />
                                                                        </TimelineIcon>
                                                                        <TimelineContent>
                                                                            <Typography variant="body2" fontWeight={500}>เวลาเตรียม</Typography>
                                                                            <TimelineDate>{formatDate(historyItem.cooked_date)}</TimelineDate>
                                                                        </TimelineContent>
                                                                    </TimelineItem>

                                                                    <TimelineItem>
                                                                        <TimelineIcon>
                                                                            <EventIcon />
                                                                        </TimelineIcon>
                                                                        <TimelineContent>
                                                                            <Typography variant="body2" fontWeight={500}>QC ตรวจโดย {historyItem.receiver_qc || '-'}</Typography>
                                                                            <TimelineDate>{formatDate(historyItem.qc_date)}</TimelineDate>
                                                                        </TimelineContent>
                                                                    </TimelineItem>

                                                                    {(historyItem.come_cold_date || historyItem.out_cold_date) && (
                                                                        <TimelineItem>
                                                                            <TimelineIcon>
                                                                                <AcUnitIcon />
                                                                            </TimelineIcon>
                                                                            <TimelineContent>
                                                                                <Typography variant="body2" fontWeight={500}>เข้าแช่เย็นครั้งที่ 1</Typography>
                                                                                <TimelineDate>{formatDate(historyItem.come_cold_date)}</TimelineDate>
                                                                                <Divider sx={{ my: 1 }} />
                                                                                <Typography variant="body2" fontWeight={500}>ออกจากแช่เย็นครั้งที่ 1</Typography>
                                                                                <TimelineDate>{formatDate(historyItem.out_cold_date)}</TimelineDate>
                                                                            </TimelineContent>
                                                                        </TimelineItem>
                                                                    )}

                                                                    {(historyItem.come_cold_date_two || historyItem.out_cold_date_two) && (
                                                                        <TimelineItem>
                                                                            <TimelineIcon>
                                                                                <AcUnitIcon />
                                                                            </TimelineIcon>
                                                                            <TimelineContent>
                                                                                <Typography variant="body2" fontWeight={500}>เข้าแช่เย็นครั้งที่ 2</Typography>
                                                                                <TimelineDate>{formatDate(historyItem.come_cold_date_two)}</TimelineDate>
                                                                                <Divider sx={{ my: 1 }} />
                                                                                <Typography variant="body2" fontWeight={500}>ออกจากแช่เย็นครั้งที่ 2</Typography>
                                                                                <TimelineDate>{formatDate(historyItem.out_cold_date_two)}</TimelineDate>
                                                                            </TimelineContent>
                                                                        </TimelineItem>
                                                                    )}

                                                                    {(historyItem.come_cold_date_three || historyItem.out_cold_date_three) && (
                                                                        <TimelineItem>
                                                                            <TimelineIcon>
                                                                                <AcUnitIcon />
                                                                            </TimelineIcon>
                                                                            <TimelineContent>
                                                                                <Typography variant="body2" fontWeight={500}>เข้าแช่เย็นครั้งที่ 3</Typography>
                                                                                <TimelineDate>{formatDate(historyItem.come_cold_date_three)}</TimelineDate>
                                                                                <Divider sx={{ my: 1 }} />
                                                                                <Typography variant="body2" fontWeight={500}>ออกจากแช่เย็นครั้งที่ 3</Typography>
                                                                                <TimelineDate>{formatDate(historyItem.out_cold_date_three)}</TimelineDate>
                                                                            </TimelineContent>
                                                                        </TimelineItem>
                                                                    )}
                                                                </Box>
                                                            </DetailPanel>
                                                        </Collapse>
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </StyledTable>
                        )}

                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3, gap: 1 }}>
                            <Button
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                onClick={onClose}
                                sx={{
                                    borderColor: "#E74A3B",
                                    color: "#E74A3B",
                                    '&:hover': {
                                        backgroundColor: 'rgba(231, 74, 59, 0.04)',
                                        borderColor: '#c6372a',
                                    }
                                }}
                            >
                                ปิด
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<CheckCircleIcon />}
                                onClick={handleOpenDeleteModal}
                                sx={{
                                    backgroundColor: "#4CAF50",
                                    color: "#fff",
                                    boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2)',
                                    '&:hover': {
                                        backgroundColor: '#3d8b40',
                                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                                    }
                                }}
                            >
                                บรรจุสำเร็จ
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </StyledDialog>

            <ModalDelete
                open={deleteModalOpen}
                onClose={handleCloseDeleteModal}
                data={item}
                onSuccess={handleDeleteSuccess}
                dataPrinter={dataPrinter}
            />
        </>
    );
};

export default DetailModal;