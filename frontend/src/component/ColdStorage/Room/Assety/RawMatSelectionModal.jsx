import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Modal,
    Box,
    Typography,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    CircularProgress,
    IconButton,
    InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { AddShoppingCart as AddShoppingCartIcon } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL;

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 1400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    maxHeight: '80vh',
    overflow: 'auto'
};

const RawMatSelectionModal = ({ open, onClose, onAdd, currentTroId, onSelectionClear }) => {
    const [rawMaterials, setRawMaterials] = useState([]);
    const [selected, setSelected] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchAvailableRawMaterials();
        }
    }, [open]);

    const fetchAvailableRawMaterials = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/coldstorage/fetchAvailableRawMaterials`, {
                params: { current_tro_id: currentTroId }
            });

            if (response.data.success) {
                setRawMaterials(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching raw materials:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (mappingId) => {
        const currentIndex = selected.indexOf(mappingId);
        const newSelected = [...selected];

        if (currentIndex === -1) {
            newSelected.push(mappingId);
        } else {
            newSelected.splice(currentIndex, 1);
        }

        setSelected(newSelected);
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const newSelected = rawMaterials.map((n) => n.mapping_id);
            setSelected(newSelected);
        } else {
            setSelected([]);
        }
    };

    const handleAddSelected = () => {
        const selectedMaterials = rawMaterials.filter(material =>
            selected.includes(material.mapping_id)
        );

        const enhancedMaterials = selectedMaterials.map(material => ({
            ...material,
            isMixed: material.isMixed || false
        }));

        onAdd(enhancedMaterials);

    };

    // ฟังก์ชันเพื่อหาวันที่ล่าสุดในการเข้าห้องเย็น
    const getLatestComeColdDate = (row) => {
        const dates = [
            row.come_cold_date,
            row.come_cold_date_two,
            row.come_cold_date_three
        ].filter(date => date);

        if (dates.length === 0) {
            return row.rmit_date || row.mixed_date || null;
        }

        const dateObjects = dates.map(date => new Date(date));
        return new Date(Math.max(...dateObjects)).toISOString().replace('T', ' ');
    };

    // คำนวณความแตกต่างของเวลา
    const calculateTimeDifference = (ComeColdDateTime) => {
        const comecolddatetime = new Date(ComeColdDateTime);
        const currentDate = new Date();
        return (currentDate - comecolddatetime) / (1000 * 60);
    };

    // จัดรูปแบบเวลาแสดงผล
    const formatTime = (minutes) => {
        if (isNaN(minutes) || minutes === null) return "-";

        const absMinutes = Math.abs(minutes);
        const days = Math.floor(absMinutes / 1440);
        const hours = Math.floor((absMinutes % 1440) / 60);
        const mins = Math.floor(absMinutes % 60);

        let timeString = '';
        if (days > 0) timeString += `${days} วัน`;
        if (hours > 0) timeString += `${timeString.length > 0 ? ' ' : ''}${hours} ชม.`;
        if (mins > 0 || (days === 0 && hours === 0)) timeString += `${timeString.length > 0 ? ' ' : ''}${mins} นาที`;
        return timeString.trim();
    };

    // ฟังก์ชันคำนวณสถานะและสี
    const getRowStatus = (row) => {
        if (!row) return { borderColor: "#969696", statusMessage: "-", hideDelayTime: true, percentage: 0 };

        // ตรวจสอบวัตถุดิบผสม
        if (row.isMixed && row.mix_time !== null && row.mix_time !== undefined && row.mixed_date) {
            const mixDateTime = new Date(row.mixed_date);
            const timePassed = (new Date() - mixDateTime) / (1000 * 60);
            const standardMinutes = 120;
            const timeValue = parseFloat(row.mix_time);
            const timeValueMinutes = Math.floor(timeValue) * 60 + (timeValue % 1) * 100;
            const timeRemaining = timeValueMinutes - timePassed;
            const percentage = Math.min(100, Math.max(0, (timePassed / standardMinutes) * 100));

            if (timeRemaining < 0) {
                const exceededMinutes = Math.abs(timeRemaining);
                return {
                    borderColor: '#FF8175',
                    statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
                    hideDelayTime: false,
                    percentage: 100 + (exceededMinutes / standardMinutes * 100),
                };
            }

            return {
                borderColor: getBorderColor(percentage, timeRemaining),
                statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
                hideDelayTime: timeRemaining > 0,
                percentage,
            };
        }

        // หาวันที่เข้าห้องเย็นล่าสุด
        const latestComeColdDate = getLatestComeColdDate(row);
        if (!latestComeColdDate) {
            return {
                borderColor: "#969696",
                statusMessage: "-",
                hideDelayTime: true,
                percentage: 0,
            };
        }

        // ตรวจสอบโหมด rework หรือ cold
        const isReworkMode = row.rework_time !== null && row.rework_time !== undefined;
        const timeValue = isReworkMode ? parseFloat(row.rework_time) : parseFloat(row.cold_time || row.cold);
        const standardValue = isReworkMode ? parseFloat(row.standard_rework) : parseFloat(row.standard_cold);

        const standardMinutes = Math.floor(standardValue) * 60 + (standardValue % 1) * 100;
        const timePassed = calculateTimeDifference(latestComeColdDate);

        // กรณีเวลาเป็นลบ
        if (timeValue < 0) {
            const exceededMinutesFromValue = Math.floor(Math.abs(timeValue)) * 60 + (Math.abs(timeValue) % 1) * 100;
            const rs_exceededMinutesFromValue = -1 * exceededMinutesFromValue - timePassed;
            return {
                borderColor: '#FF8175',
                statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFromValue)}`,
                hideDelayTime: false,
                percentage: 100 + (rs_exceededMinutesFromValue / standardMinutes * 100),
                isOverdue: true,
            };
        }

        // กรณีเวลา = 0
        if (timeValue === 0) {
            return {
                borderColor: '#FF8175',
                statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
                hideDelayTime: false,
                percentage: 100 + (timePassed / standardMinutes * 100),
            };
        }

        // กรณีเวลายังไม่หมด
        const timeValueMinutes = Math.floor(timeValue) * 60 + (timeValue % 1) * 100;
        if (timePassed > timeValueMinutes) {
            const exceededMinutes = timePassed - timeValueMinutes;
            return {
                borderColor: '#FF8175',
                statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
                hideDelayTime: false,
                percentage: 100 + (exceededMinutes / standardMinutes * 100),
            };
        }

        const timeRemaining = timeValueMinutes - timePassed;
        const percentage = Math.min(100, Math.max(0, (timePassed / standardMinutes) * 100));

        return {
            borderColor: getBorderColor(percentage, timeRemaining),
            statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
            hideDelayTime: timeRemaining > 0,
            percentage,
        };
    };

    const getBorderColor = (percentage, timeRemaining) => {
        if (timeRemaining < 0) return '#FF8175';
        if (percentage >= 100) return '#FF8175';
        if (percentage >= 70) return '#FFF398';
        return '#80FF75';
    };

    const handleCloseRawMatModal = () => {
        setSelected([]); // เคลียร์การเลือกเมื่อปิด modal
        onClose();
    };

    const filteredMaterials = rawMaterials.filter(material => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
        (material.mat_name && String(material.mat_name).toLowerCase().includes(searchTermLower)) ||
        (material.mat && String(material.mat).toLowerCase().includes(searchTermLower)) ||
        (material.batch && String(material.batch).toLowerCase().includes(searchTermLower)) ||
        (material.tro_id && String(material.tro_id).includes(searchTerm)) ||
        (material.production && String(material.production).toLowerCase().includes(searchTermLower))
    );
});

    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="raw-mat-selection-modal"
            aria-describedby="select-raw-materials"
        >
            <Box sx={style}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" component="h2">
                        เลือกวัตถุดิบจากห้องเย็น
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="ค้นหาวัตถุดิบ, หมายเลขรถเข็น, หรือแผนการผลิต..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={
                                                    selected.length > 0 && selected.length < rawMaterials.length
                                                }
                                                checked={rawMaterials.length > 0 && selected.length === rawMaterials.length}
                                                onChange={handleSelectAll}
                                            />
                                        </TableCell>
                                        <TableCell>Delay Time</TableCell>
                                        <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <ShoppingCartIcon sx={{ mr: 1, fontSize: '1rem' }} />
                                            หมายเลขรถเข็น
                                        </Box></TableCell>
                                        <TableCell>Batch</TableCell>
                                        <TableCell>วัตถุดิบ</TableCell>
                                        <TableCell>แผนการผลิต</TableCell>
                                        <TableCell>น้ำหนัก</TableCell>
                                        <TableCell>จำนวนถาด</TableCell>
                                        <TableCell>ห้อง</TableCell>
                                        <TableCell>ช่องจอด</TableCell>
                                        <TableCell>สถานะวัตถุดิบ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredMaterials.map((material) => (
                                        <TableRow key={material.mapping_id}>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={selected.indexOf(material.mapping_id) !== -1}
                                                    onChange={() => handleToggle(material.mapping_id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div style={{
                                                    color: getRowStatus(material).borderColor === '#FF8175' ? 'red' :
                                                        (getRowStatus(material).borderColor === '#FFF398' ? 'orange' : 'green')
                                                }}>
                                                    {getRowStatus(material).statusMessage}
                                                </div>
                                            </TableCell>
                                            <TableCell>{material.tro_id}</TableCell>
                                            <TableCell>{material.batch || '-'}</TableCell>
                                            <TableCell>{material.mat_name}</TableCell>
                                            <TableCell>{material.production}</TableCell>
                                            <TableCell>{material.weight_RM}</TableCell>
                                            <TableCell>{material.tray_count}</TableCell>
                                            <TableCell>{material.cs_name}</TableCell>
                                            <TableCell>{material.slot_id}</TableCell>
                                            <TableCell>{material.rm_status}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                            <Button
                                onClick={onClose}
                                sx={{ mr: 2 }}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleAddSelected}
                                disabled={selected.length === 0}
                                startIcon={<AddShoppingCartIcon />}
                            >
                                เพิ่มวัตถุดิบที่เลือก ({selected.length})
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Modal>
    );
};

export default RawMatSelectionModal;