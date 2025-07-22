import React, { useState, useEffect } from "react";
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
    CircularProgress,
    Button,
    Divider,
    IconButton,
    Collapse,
    Paper,
    Chip,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        border: 'none',
    },
}));

const StyledDialogTitle = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
}));

const StyledTypographyTitle = styled(Typography)(({ theme }) => ({
    fontSize: '1.25rem',
    color: theme.palette.text.primary,
    fontWeight: 500,
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
    margin: theme.spacing(3, 0),
}));

const StyledTable = styled(Table)(({ theme }) => ({
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
    '& .MuiTableCell-head': {
        backgroundColor: 'transparent',
        fontWeight: 500,
        color: theme.palette.text.secondary,
        borderBottom: `2px solid ${theme.palette.divider}`,
        padding: '12px 16px',
        fontSize: '0.875rem',
    },
}));

const InfoCard = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    borderRadius: 8,
    padding: theme.spacing(2.5),
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    marginBottom: theme.spacing(3),
}));

const MixedDetail = ({ item, onClose, onSuccess }) => {
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mixedData, setMixedData] = useState(null);

    const mixed_code = item.mix_code;

    useEffect(() => {
        const fetchMixedHistory = async () => {
            try {
                setLoading(true);
                const response = await axios.put(`${API_URL}/api/pack/mixed/history`, { 
                    mixed_code: mixed_code 
                });
                
                if (response.data && response.data.length > 0) {
                    // Process the data to match your component's expected structure
                    const processedData = processApiData(response.data);
                    setMixedData(processedData);
                } else {
                    setError("ไม่พบข้อมูลสำหรับรหัสผสมนี้");
                }
            } catch (err) {
                console.error("Error fetching mixed history:", err);
                setError(err.response?.data?.message || "ไม่สามารถดึงข้อมูลได้");
            } finally {
                setLoading(false);
            }
        };

        if (mixed_code) {
            fetchMixedHistory();
        }
    }, [mixed_code]);

    const processApiData = (apiData) => {
        // Transform the API data into the structure your component expects
        const materials = apiData.map(item => ({
            rmfp_id: item.rmfp_id,
            batch_after: item.batch_after,
            mat_name: item.rm_group_name,
            line_name: item.line_name,
            code: item.code,
            doc_no: item.doc_no,
            weight_per_tro: item.weight_per_tro,
            withdraw_date: item.withdraw_date,
            cooked_date: item.cooked_date,
            receiver_qc: item.receiver_qc,
            qc_date: item.qc_date,
            come_cold_date: item.come_cold_date,
            out_cold_date: item.out_cold_date,
            come_cold_date_two: item.come_cold_date_two,
            out_cold_date_two: item.out_cold_date_two,
            come_cold_date_three: item.come_cold_date_three,
            out_cold_date_three: item.out_cold_date_three,
            // cooked_date: item.cooked_date
        }));

        // Calculate summary data
        const totalWeight = materials.reduce((sum, material) => sum + (material.weight_per_tro || 0), 0);
        const itemCount = materials.length;

        return {
            mix_code: mixed_code,
            codes: apiData[0]?.code || '',
            doc_nos: apiData[0]?.doc_no || '',
            totalWeight,
            itemCount,
            stay_places: apiData[0]?.stay_places || '',
            materials
        };
    };

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
                console.warn("Invalid date format:", dateString);
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

            return new Intl.DateTimeFormat('th-TH', options).format(date);
        } catch (error) {
            console.error("Error formatting date:", error, "for input:", dateString);
            return dateString;
        }
    };

    if (loading) {
        return (
            <StyledDialog open={true} onClose={onClose} fullWidth maxWidth="lg">
                <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                    <CircularProgress size={40} thickness={4} sx={{ color: '#4CAF50', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>กำลังโหลดข้อมูล...</Typography>
                </DialogContent>
            </StyledDialog>
        );
    }

    if (error) {
        return (
            <StyledDialog open={true} onClose={onClose} fullWidth maxWidth="lg">
                <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="error" variant="h6" sx={{ mb: 2 }}>{error}</Typography>
                    <Button 
                        onClick={onClose} 
                        variant="contained" 
                        sx={{ 
                            mt: 2, 
                            bgcolor: '#3f51b5', 
                            color: 'white',
                            borderRadius: '8px',
                            padding: '8px 24px',
                            '&:hover': { bgcolor: '#303f9f' }
                        }}
                    >
                        ปิด
                    </Button>
                </DialogContent>
            </StyledDialog>
        );
    }

    if (!mixedData) {
        return (
            <StyledDialog open={true} onClose={onClose} fullWidth maxWidth="lg">
                <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>ไม่พบข้อมูล</Typography>
                    <Button 
                        onClick={onClose} 
                        variant="contained" 
                        sx={{ 
                            mt: 2, 
                            bgcolor: '#3f51b5', 
                            color: 'white',
                            borderRadius: '8px',
                            padding: '8px 24px',
                            '&:hover': { bgcolor: '#303f9f' }
                        }}
                    >
                        ปิด
                    </Button>
                </DialogContent>
            </StyledDialog>
        );
    }

    const { materials } = mixedData;

    return (
        <>
            <StyledDialog open={true} onClose={onClose} fullWidth maxWidth="lg">
                <DialogContent sx={{ p: 0 }}>
                    <StyledDialogTitle>
                        <StyledTypographyTitle variant="h6">
                            รายละเอียดข้อมูล <Chip label={`รหัสผสม: ${mixedData.mix_code}`} color="primary" size="small" sx={{ ml: 1, fontWeight: 500 }} />
                        </StyledTypographyTitle>
                        <IconButton 
                            aria-label="close" 
                            onClick={onClose} 
                            sx={{ 
                                color: (theme) => theme.palette.grey[500],
                                backgroundColor: (theme) => theme.palette.grey[100],
                                '&:hover': {
                                    backgroundColor: (theme) => theme.palette.grey[200],
                                }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </StyledDialogTitle>

                    <Box sx={{ p: 3 }}>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                mb: 2, 
                                fontWeight: 500, 
                                color: '#1a237e',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <InfoOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                            ข้อมูลสรุป
                        </Typography>
                        
                        <InfoCard>
                            <Box sx={{ 
                                display: 'grid', 
                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, 
                                gap: 3 
                            }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>รหัสการผสม</Typography>
                                    <Typography variant="body1" fontWeight={500}>{mixedData.mix_code}</Typography>
                                </Box>
                                
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>แผนการผลิต</Typography>
                                    <Typography variant="body1" fontWeight={500}>{mixedData.codes || '-'}</Typography>
                                </Box>
                                
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>เอกสารเลขที่</Typography>
                                    <Typography variant="body1" fontWeight={500}>{mixedData.doc_nos || '-'}</Typography>
                                </Box>
                                
                                {/* <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>น้ำหนักรวม</Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {mixedData.totalWeight?.toFixed(2)} กก.
                                    </Typography>
                                </Box> */}
                                
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>จำนวนวัตถุดิบ</Typography>
                                    <Typography variant="body1" fontWeight={500}>{mixedData.itemCount} รายการ</Typography>
                                </Box>
                                
                                {mixedData.stay_places && (
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>สถานที่จัดเก็บ</Typography>
                                        <Typography variant="body1" fontWeight={500}>{mixedData.stay_places}</Typography>
                                    </Box>
                                )}
                            </Box>
                        </InfoCard>

                        <Typography 
                            variant="h6" 
                            sx={{ 
                                mb: 2, 
                                mt: 4, 
                                fontWeight: 500, 
                                color: '#1a237e',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <InfoOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                            รายการรถเข็นทั้งหมด
                            <Chip 
                                label={`${materials.length} รายการ`} 
                                size="small" 
                                color="primary" 
                                variant="outlined" 
                                sx={{ ml: 1, fontWeight: 500 }} 
                            />
                        </Typography>
                        
                        {materials.length === 0 ? (
                            <Box sx={{ 
                                textAlign: 'center', 
                                py: 4, 
                                bgcolor: '#f5f5f5', 
                                borderRadius: 2,
                                border: '1px dashed #bdbdbd' 
                            }}>
                                <Typography color="textSecondary">ไม่มีข้อมูลรถเข็น</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                                <StyledTable size="medium" aria-label="mixed history table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell align="center" sx={{ width: '5%' }}>ลำดับ</TableCell>
                                            <TableCell align="center" sx={{ width: '10%' }}>Batch</TableCell>
                                            <TableCell align="center" sx={{ width: '20%' }}>กลุ่มวัตถุดิบ</TableCell>
                                            <TableCell align="center" sx={{ width: '15%' }}>ไลน์การผลิต</TableCell>
                                            <TableCell align="center" sx={{ width: '20%' }}>รหัส</TableCell>
                                            {/* <TableCell align="center" sx={{ width: '15%' }}>น้ำหนักวัตถุดิบ</TableCell> */}
                                            <TableCell align="center" sx={{ width: '15%' }}>รายละเอียด</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {materials.map((historyItem, index) => {
                                            const uniqueId = `row-${index}-${historyItem.rmfp_id || index}`;
                                            const isSelected = selectedRowId === uniqueId;
                                            
                                            return (
                                                <React.Fragment key={uniqueId}>
                                                    <TableRow
                                                        onClick={() => handleRowClick(uniqueId)}
                                                        sx={{ 
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            backgroundColor: isSelected ? '#f3f8ff' : index % 2 === 0 ? '#fafafa' : '#ffffff',
                                                            '&:hover': { 
                                                                backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                                                                boxShadow: '0 2px 5px rgba(0,0,0,0.08)'
                                                            },
                                                            borderRadius: '8px',
                                                            '& .MuiTableCell-root': {
                                                                border: 'none',
                                                                padding: '16px',
                                                            },
                                                            '& .MuiTableCell-root:first-of-type': {
                                                                borderTopLeftRadius: '8px',
                                                                borderBottomLeftRadius: isSelected ? '0' : '8px',
                                                            },
                                                            '& .MuiTableCell-root:last-of-type': {
                                                                borderTopRightRadius: '8px',
                                                                borderBottomRightRadius: isSelected ? '0' : '8px',
                                                            },
                                                            boxShadow: isSelected ? 
                                                                '0 0 0 1px #bbdefb' : 
                                                                '0 1px 3px rgba(0,0,0,0.05)'
                                                        }}
                                                    >
                                                        <TableCell align="center">
                                                            <Chip 
                                                                label={index + 1} 
                                                                size="small" 
                                                                sx={{ 
                                                                    bgcolor: isSelected ? '#1976d2' : '#e0e0e0',
                                                                    color: isSelected ? 'white' : '#424242',
                                                                    fontWeight: 500,
                                                                    minWidth: '32px'
                                                                }} 
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">{historyItem.batch_after ?? '-'}</TableCell>
                                                        <TableCell align="center">{historyItem.mat_name ?? '-'}</TableCell>
                                                        <TableCell align="center">{historyItem.line_name ?? '-'}</TableCell>
                                                        <TableCell align="center">
                                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                                <Typography variant="body2" fontWeight={500}>{historyItem.code}</Typography>
                                                                <Typography variant="caption" color="text.secondary">({historyItem.doc_no})</Typography>
                                                            </Box>
                                                        </TableCell>
                                                        {/* <TableCell align="center">
                                                            <Typography fontWeight={500}>
                                                                {historyItem.weight_per_tro ?? '-'} กก.
                                                            </Typography>
                                                        </TableCell> */}
                                                        <TableCell align="center">
                                                            <Button
                                                                variant={isSelected ? "contained" : "outlined"}
                                                                size="small"
                                                                color={isSelected ? "primary" : "inherit"}
                                                                sx={{ 
                                                                    borderRadius: '8px',
                                                                    minWidth: '120px',
                                                                    boxShadow: 'none'
                                                                }}
                                                                endIcon={isSelected ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                                            >
                                                                {isSelected ? "ซ่อน" : "ดูข้อมูล"}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell 
                                                            style={{ paddingBottom: 0, paddingTop: 0 }} 
                                                            colSpan={7}
                                                            sx={{
                                                                borderBottomLeftRadius: '8px',
                                                                borderBottomRightRadius: '8px',
                                                                boxShadow: isSelected ? '0 4px 8px -4px rgba(0,0,0,0.1)' : 'none',
                                                                border: 'none'
                                                            }}
                                                        >
                                                            <Collapse in={isSelected} timeout="auto" unmountOnExit>
                                                                <Box sx={{ 
                                                                    margin: 0,
                                                                    backgroundColor: '#f3f8ff', 
                                                                    borderBottomLeftRadius: '8px',
                                                                    borderBottomRightRadius: '8px',
                                                                    padding: 3,
                                                                    border: '1px solid #bbdefb',
                                                                    borderTop: 'none'
                                                                }}>
                                                                    <Typography 
                                                                        variant="subtitle1" 
                                                                        gutterBottom 
                                                                        sx={{ 
                                                                            fontWeight: 500, 
                                                                            color: '#1565c0',
                                                                            mb: 2
                                                                        }}
                                                                    >
                                                                        ข้อมูลวันเวลาเพิ่มเติม
                                                                    </Typography>
                                                                    
                                                                    <Box sx={{ 
                                                                        backgroundColor: 'white',
                                                                        borderRadius: '8px',
                                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                                                        overflow: 'hidden'
                                                                    }}>
                                                                        <Table size="small">
                                                                            <TableBody sx={{
                                                                                '& .MuiTableRow-root': {
                                                                                    '&:nth-of-type(odd)': {
                                                                                        backgroundColor: '#fafafa',
                                                                                    },
                                                                                },
                                                                                '& .MuiTableCell-root': {
                                                                                    padding: '12px 16px',
                                                                                    borderBottom: '1px solid #f0f0f0'
                                                                                }
                                                                            }}>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่เบิกวัตถุดิบ:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.withdraw_date) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่เตรียม:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.cooked_date) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>ตรวจโดย {historyItem.receiver_qc} วันที่ตรวจ:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.qc_date) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่เข้าแช่เย็น:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.come_cold_date) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่ออกจากแช่เย็น:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.out_cold_date) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่เข้าแช่เย็นครั้งที่ 2:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.come_cold_date_two) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่ออกจากแช่เย็นครั้งที่ 2:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.out_cold_date_two) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่เข้าแช่เย็นครั้งที่ 3:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.come_cold_date_three) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่ออกจากแช่เย็นครั้งที่ 3:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.out_cold_date_three) ?? '-'}</TableCell>
                                                                                </TableRow>
                                                                                <TableRow>
                                                                                    <TableCell sx={{ width: '40%', fontWeight: 500 }}>วันที่บรรจุสำเร็จ:</TableCell>
                                                                                    <TableCell>{formatDate(historyItem.cooked_date)}</TableCell>
                                                                                </TableRow>
                                                                            </TableBody>
                                                                        </Table>
                                                                    </Box>
                                                                </Box>
                                                            </Collapse>
                                                        </TableCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </StyledTable>
                            </Box>
                        )}

                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
                            <Button
                                variant="contained"
                                startIcon={<CloseIcon />}
                                sx={{ 
                                    bgcolor: '#ef5350', 
                                    color: 'white',
                                    borderRadius: '8px',
                                    padding: '8px 24px',
                                    fontWeight: 500,
                                    boxShadow: '0 2px 8px rgba(239,83,80,0.3)',
                                    '&:hover': { bgcolor: '#d32f2f' }
                                }}
                                onClick={onClose}
                            >
                                ปิด
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </StyledDialog>
        </>
    );
};

export default MixedDetail;