import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Table,
    TableContainer,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Box,
    TextField,
    IconButton,
    InputAdornment,
    Select,
    MenuItem,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Chip,
    Tooltip,
    useTheme,
    useMediaQuery,
    alpha
} from '@mui/material';
import Slottrolley from "./slotTrolley";
import DetailModal from "./detailModal";
import ModalEditPD from "./modalEdit";
import SearchIcon from "@mui/icons-material/Search";
import { TbListDetails } from "react-icons/tb";
import { LiaShoppingCartSolid } from 'react-icons/lia';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AddIcon from '@mui/icons-material/Add';
import io from 'socket.io-client';

const ParentComponent = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [openTrolleySlot, setOpenTrolleySlot] = useState(false);
    const [mixedTrolleyData, setMixedTrolleyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedItem, setSelectedItem] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredData, setFilteredData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [itemsPerPageOptions] = useState([10, 20, 50, 100]);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [selectedForDelete, setSelectedForDelete] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [dataPrinter, setDataPrinter] = useState({});
    const [selectedTrolley, setSelectedTrolley] = useState(null);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [socket, setSocket] = useState(null);
    const fetchTimeoutRef = useRef(null); // สำหรับ debounce

    const API_URL = import.meta.env.VITE_API_URL;

    // Color palette
    const tableHeaderBg = theme.palette.primary.light;
    const tableHeaderText = theme.palette.primary.contrastText;
    const rowEvenBg = alpha(theme.palette.primary.light, 0.04);
    const rowOddBg = theme.palette.background.paper;
    const hoverBg = alpha(theme.palette.primary.light, 0.12);

    const getDisplayName = useCallback((field) => {
        const displayNameMap = {
            "rmfp_id": "รหัส RMFP",
            "dest": "ปลายทาง",
            "stay_place": "สถานที่พัก",
            "weight_RM": "น้ำหนักวัตถุดิบ",
            "weight_per_tro": "น้ำหนักต่อรถเข็น",
            "mix_code": "รหัสการผสม",
            "doc_no": "เอกสารเลขที่",
            "code": "แผนการผลิต",
            "mapping_id": "รหัสการแม็ปปิ้ง"
        };
        return displayNameMap[field] || field;
    }, []);

    // Debounced fetchData
    const fetchDataDebounced = () => {
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = setTimeout(() => {
            fetchMixedTrolleyData();
        }, 300); // หน่วง 300ms
    };
    // Initialize Socket.IO connection
    useEffect(() => {
        const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      }); // Connect to the backend using Socket.IO
        setSocket(newSocket);
        newSocket.emit('joinRoom', 'PackMixRoom');
        // Listen for real-time updates
        newSocket.on('dataUpdated', (data) => {
            fetchDataDebounced(data); // Update table data when the backend sends an update
        });

        newSocket.on('dataDelete', (deleteData) => {
            setTableData(deleteData); // Update table data when the backend sends an update
        });


        // Clean up socket connection when component unmounts
        return () => {
            newSocket.off('dataUpdated');
            newSocket.off('dataUpdated');
            newSocket.disconnect();
        };
    }, []);

    const fetchMixedTrolleyData = useCallback(async () => {
        if (!API_URL) {
            setError("API URL not defined");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");
        try {
            const LineIdFromLocalStorage = localStorage.getItem("line_id");
            if (!LineIdFromLocalStorage) {
                throw new Error("No line_id found in localStorage");
            }

            const response = await fetch(`${API_URL}/api/pack/mixed/trolley/head/${LineIdFromLocalStorage}`, { credentials: "include" });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            const processedData = processRawData(data);
            setMixedTrolleyData(processedData);
        } catch (e) {
            setError("Failed to fetch mixed trolley data");
            console.error("Error fetching mixed trolley data:", e);
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    const processRawData = useCallback((rawData) => {
        const groupedByMixCode = {};

        rawData.forEach(item => {
            if (!item || !item.mix_code) return;

            const mixCode = item.mix_code;
            if (!groupedByMixCode[mixCode]) {
                groupedByMixCode[mixCode] = {
                    mix_code: mixCode,
                    materials: [],
                    itemCount: 0,
                    totalWeight: item.total_weight || 0, // ใช้ rmm.weight_RM จาก SQL ที่ถูกตั้งชื่อเป็น total_weight
                    codes: new Set(),
                    doc_nos: new Set(),
                    stay_places: new Set(),
                    mapping_ids: new Set(),
                    workAreas: new Set(),
                    statuses: new Set()
                };
            }

            // สำหรับวัตถุดิบแต่ละรายการ ใช้ individual_material_weight (rmx.weight_RM จาก SQL)
            const materialWithIndividualWeight = {
                ...item,
                weight_RM: item.individual_material_weight // ใช้ชื่อฟิลด์ที่ตรงกับ SQL
            };

            groupedByMixCode[mixCode].materials.push(materialWithIndividualWeight);
            groupedByMixCode[mixCode].itemCount++;

            // ไม่ต้องคำนวณน้ำหนักรวมใหม่ เพราะใช้ค่าจาก SQL โดยตรง
            if (item.code) groupedByMixCode[mixCode].codes.add(item.code);
            if (item.doc_no) groupedByMixCode[mixCode].doc_nos.add(item.doc_no);
            if (item.location) groupedByMixCode[mixCode].stay_places.add(item.location);
            if (item.mapping_id) groupedByMixCode[mixCode].mapping_ids.add(item.mapping_id);
            if (item.WorkAreaCode) groupedByMixCode[mixCode].workAreas.add(item.WorkAreaCode);
            if (item.qccheck) groupedByMixCode[mixCode].statuses.add(item.qccheck);
        });

        return Object.values(groupedByMixCode).map(group => ({
            ...group,
            codes: Array.from(group.codes).join(', '),
            doc_nos: Array.from(group.doc_nos).join(', '),
            stay_places: Array.from(group.stay_places).join(', '),
            mapping_ids: Array.from(group.mapping_ids).join(', '),
            workAreas: Array.from(group.workAreas).join(', '),
            statuses: Array.from(group.statuses).join(', '),
            isGrouped: true,
            isMixed: true
        }));
    }, []);

    useEffect(() => {
        fetchMixedTrolleyData();
    }, [fetchMixedTrolleyData]);

    useEffect(() => {
        if (!mixedTrolleyData || mixedTrolleyData.length === 0) {
            setFilteredData([]);
            return;
        }

        const results = mixedTrolleyData.filter(group => {
            if (!group) return false;

            const query = searchQuery.toLowerCase();

            if (
                (typeof group.mix_code === 'string' && group.mix_code.toLowerCase().includes(query)) ||
                (typeof group.mix_code === 'number' && group.mix_code.toString().includes(query)) ||
                (typeof group.codes === 'string' && group.codes.toLowerCase().includes(query)) ||
                (typeof group.doc_nos === 'string' && group.doc_nos.toLowerCase().includes(query)) ||
                (typeof group.mapping_ids === 'string' && group.mapping_ids.toLowerCase().includes(query))
            ) {
                return true;
            }

            return group.materials.some(item =>
                (typeof item.rmfp_id === 'string' && item.rmfp_id.toLowerCase().includes(query)) ||
                (typeof item.rmfp_id === 'number' && item.rmfp_id.toString().includes(query)) ||
                (typeof item.mat === 'string' && item.mat.toLowerCase().includes(query)) ||
                (typeof item.mat_name === 'string' && item.mat_name.toLowerCase().includes(query))
            );
        });

        setFilteredData(results);
        setCurrentPage(1);
    }, [searchQuery, mixedTrolleyData]);

    const { currentItems, firstItemIndex, lastItemIndex, totalItems, totalPages } = useMemo(() => {
        const lastIdx = currentPage * itemsPerPage;
        const firstIdx = lastIdx - itemsPerPage;
        return {
            currentItems: filteredData.slice(firstIdx, lastIdx),
            firstItemIndex: firstIdx,
            lastItemIndex: lastIdx,
            totalItems: filteredData.length,
            totalPages: Math.ceil(filteredData.length / itemsPerPage)
        };
    }, [filteredData, currentPage, itemsPerPage]);

    const handleItemsPerPageChange = useCallback((event) => {
        setItemsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(1);
    }, []);

    const handlePageChange = (direction) => {
        if (direction === 'prev' && currentPage > 1) {
            setCurrentPage(currentPage - 1);
        } else if (direction === 'next' && currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prepareDataForPrinting = useCallback((group) => {
        const printData = {
            header: {
                mix_code: group.mix_code,
                doc_nos: group.doc_nos,
                codes: group.codes,
                totalWeight: group.totalWeight.toFixed(2),
                itemCount: group.itemCount,
                mapping_ids: group.mapping_ids,
                stay_places: group.stay_places
            },
            materials: group.materials.map(material => ({
                ...material,
                mix_code: group.mix_code,
                rm_status: "บรรจุสำเร็จ"
            })),
            summary: {
                date: new Date().toISOString(),
                totalItems: group.itemCount,
                totalWeight: group.totalWeight.toFixed(2)
            },
            rm_status: "บรรจุสำเร็จ"
        };
        console.log("Print Data:", printData);
        return printData;
    }, []);

    const openDetail = useCallback((group) => {
        const printData = prepareDataForPrinting(group);
        setDataPrinter(printData);
        setSelectedItem(group);
        setOpenDetailModal(true);
    }, [prepareDataForPrinting]);

    const handleOpenDeleteModal = (group) => {
        setSelectedForDelete(group);
        setDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedForDelete(null);
    };

    const handleDeleteSuccess = () => {
        fetchMixedTrolleyData();
    };

    const handleTrolleyClick = useCallback((group) => {
        if (group?.materials?.length > 0) {
            const materialData = group.materials[0];
            const editData = {
                header: {
                    mix_code: group.mix_code,
                    doc_nos: group.doc_nos,
                    codes: group.codes,
                    totalWeight: group.totalWeight.toFixed(2),
                    itemCount: group.itemCount,
                    mapping_ids: group.mapping_ids,
                    stay_places: group.stay_places
                },
                materials: group.materials,
                summary: {
                    date: new Date().toISOString(),
                    totalItems: group.itemCount,
                    totalWeight: group.totalWeight.toFixed(2)
                }
            };

            setEditData(editData);
            setOpenEditModal(true);
        }
    }, []);

    const DetailButton = useCallback(({ group }) => {
        const isHovered = hoveredItem === group?.mix_code;

        return (
            <Tooltip title="ดูรายละเอียด" arrow>
                <IconButton
                    onClick={() => openDetail(group)}
                    onMouseEnter={() => setHoveredItem(group?.mix_code)}
                    onMouseLeave={() => setHoveredItem(null)}
                    sx={{
                        color: 'primary.main',
                        backgroundColor: alpha(theme.palette.primary.light, 0.1),
                        borderRadius: '8px',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                            '& .MuiSvgIcon-root': {
                                color: '#ffffff'
                            }
                        }
                    }}
                    size="small"
                >
                    <TbListDetails
                        style={{
                            color: isHovered ? '#ffffff' : theme.palette.primary.light,
                            fontSize: '18px',
                            transition: 'color 0.2s ease-in-out'
                        }}
                    />
                </IconButton>
            </Tooltip>
        );
    }, [hoveredItem, openDetail, theme]);

    const ShoppingCartButton = useCallback(({ group, index }) => {
        const [hovered, setHovered] = useState(false);

        return (
            <TableCell
                align="center"
                onClick={(e) => {
                    e.stopPropagation();
                    handleTrolleyClick(group);
                }}
                sx={{
                    width: '70px',
                    textAlign: 'center',
                    height: '50px',
                    padding: '0px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        backgroundColor: 'primary.main',
                        '& svg': {
                            color: 'white',
                            transform: 'scale(1.2)'
                        }
                    },
                    borderTopRightRadius: '8px',
                    borderBottomRightRadius: '8px'
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <Tooltip title="จัดการรถเข็น" arrow>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <LiaShoppingCartSolid
                            style={{
                                color: hovered ? '#fff' : theme.palette.primary.light,
                                fontSize: '22px',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        />
                    </div>
                </Tooltip>
            </TableCell>
        );
    }, [handleTrolleyClick, theme]);

    const handleEditSuccess = useCallback(() => {
        fetchMixedTrolleyData();
    }, [fetchMixedTrolleyData]);

    const handleCloseTrolleySlot = useCallback(() => setOpenTrolleySlot(false), []);
    const handleCloseDetailModal = useCallback(() => setOpenDetailModal(false), []);
    const handleCloseEditModal = useCallback(() => setOpenEditModal(false), []);

    return (
        <Box sx={{
            p: { xs: 2, md: 3 },
            bgcolor: '#fafafa',
            borderRadius: 2,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}>
            <Typography
                variant="h5"
                sx={{
                    mb: 3,
                    fontWeight: 600,
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}
            >
                <LiaShoppingCartSolid /> รายการรถเข็นผสม
            </Typography>

            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                gap: 2
            }}>
                <TextField
                    placeholder="ค้นหา..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        width: { xs: '100%', sm: '92%' },
                        bgcolor: 'background.paper',
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.primary.light,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.primary.light,
                            }
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                    }}
                    size="small"
                    variant="outlined"
                />
                <Button
                    onClick={() => setOpenTrolleySlot(true)}
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{
                        width: { xs: '100%', sm: 'auto' },
                        minWidth: '180px',
                        fontWeight: 500,
                        bgcolor: '#4CAF50',
                        borderRadius: '10px',
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
                        '&:hover': {
                            bgcolor: '#3d9140',
                            boxShadow: '0 6px 14px rgba(76, 175, 80, 0.3)',
                            transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.2s ease-in-out',
                        py: 1
                    }}
                >
                    ผสมวัตถุดิบ
                </Button>
            </Box>

            {loading && (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    py: 10
                }}>
                    <CircularProgress color="primary" />
                </Box>
            )}

            {error && (
                <Alert
                    severity="error"
                    sx={{
                        mb: 3,
                        borderRadius: '10px',
                        boxShadow: '0 2px 8px rgba(211, 47, 47, 0.15)'
                    }}
                    action={
                        <Button
                            color="error"
                            size="small"
                            onClick={fetchMixedTrolleyData}
                            variant="outlined"
                            sx={{ borderRadius: '8px' }}
                        >
                            ลองอีกครั้ง
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            {!loading && !error && (
                <Box>
                    <TableContainer
                        component={Paper}
                        sx={{
                            mb: 2,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                            border: '1px solid',
                            borderColor: alpha(theme.palette.divider, 0.5),
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }}
                    >
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            bgcolor: tableHeaderBg,
                                            color: tableHeaderText,
                                            fontWeight: 600,
                                            borderBottom: 'none',
                                            py: 2,
                                            fontSize: '0.9rem',
                                            minWidth: '60px'
                                        }}
                                    >
                                        ลำดับ
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            bgcolor: tableHeaderBg,
                                            color: tableHeaderText,
                                            fontWeight: 600,
                                            borderBottom: 'none',
                                            py: 2,
                                            fontSize: '0.9rem',
                                            minWidth: '120px'
                                        }}
                                    >
                                        รหัสการผสม
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell
                                            align="center"
                                            sx={{
                                                bgcolor: tableHeaderBg,
                                                color: tableHeaderText,
                                                fontWeight: 600,
                                                borderBottom: 'none',
                                                py: 2,
                                                fontSize: '0.9rem',
                                                minWidth: '140px'
                                            }}
                                        >
                                            แผนการผลิต
                                        </TableCell>
                                    )}
                                    <TableCell
                                        align="center"
                                        sx={{
                                            bgcolor: tableHeaderBg,
                                            color: tableHeaderText,
                                            fontWeight: 600,
                                            borderBottom: 'none',
                                            py: 2,
                                            fontSize: '0.9rem',
                                            minWidth: '120px'
                                        }}
                                    >
                                        เอกสารเลขที่
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            bgcolor: tableHeaderBg,
                                            color: tableHeaderText,
                                            fontWeight: 600,
                                            borderBottom: 'none',
                                            py: 2,
                                            fontSize: '0.9rem',
                                            minWidth: '100px'
                                        }}
                                    >
                                        น้ำหนักรวม
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell
                                            align="center"
                                            sx={{
                                                bgcolor: tableHeaderBg,
                                                color: tableHeaderText,
                                                fontWeight: 600,
                                                borderBottom: 'none',
                                                py: 2,
                                                fontSize: '0.9rem',
                                                minWidth: '110px'
                                            }}
                                        >
                                            จำนวนวัตถุดิบ
                                        </TableCell>
                                    )}
                                    <TableCell
                                        align="center"
                                        sx={{
                                            bgcolor: tableHeaderBg,
                                            color: tableHeaderText,
                                            fontWeight: 600,
                                            borderBottom: 'none',
                                            py: 2,
                                            fontSize: '0.9rem',
                                            minWidth: '80px'
                                        }}
                                    >
                                        รายละเอียด
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            bgcolor: tableHeaderBg,
                                            color: tableHeaderText,
                                            fontWeight: 600,
                                            borderBottom: 'none',
                                            py: 2,
                                            fontSize: '0.9rem',
                                            minWidth: '80px'
                                        }}
                                    >
                                        รถเข็น
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {currentItems.length > 0 ? (
                                    currentItems.map((group, index) => {
                                        const isEvenRow = index % 2 === 1;
                                        const bgColor = isEvenRow ? rowEvenBg : rowOddBg;

                                        return (
                                            <TableRow
                                                key={`${group.mix_code}-${index}`}
                                                sx={{
                                                    bgcolor: bgColor,
                                                    '&:last-child td': { borderBottom: 0 },
                                                    '&:hover': {
                                                        bgcolor: hoverBg,
                                                        boxShadow: '0 0 8px rgba(0,0,0,0.08)',
                                                        transition: 'all 0.2s ease'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        py: 2,
                                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                                    }}
                                                >
                                                    <Typography fontWeight={500} fontSize="0.9rem">
                                                        {firstItemIndex + index + 1}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        py: 2,
                                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                                    }}
                                                >
                                                    <Typography fontWeight={500} fontSize="0.9rem">
                                                        {group.mix_code}
                                                    </Typography>
                                                </TableCell>
                                                {!isMobile && (
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            py: 2,
                                                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                                        }}
                                                    >
                                                        <Tooltip title={group.codes} arrow>
                                                            <Typography
                                                                fontWeight={400}
                                                                fontSize="0.9rem"
                                                                sx={{
                                                                    maxWidth: '200px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    margin: '0 auto'
                                                                }}
                                                            >
                                                                {group.codes}
                                                            </Typography>
                                                        </Tooltip>
                                                    </TableCell>
                                                )}
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        py: 2,
                                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                                    }}
                                                >
                                                    <Tooltip title={group.doc_nos} arrow>
                                                        <Typography
                                                            fontWeight={400}
                                                            fontSize="0.9rem"
                                                            sx={{
                                                                maxWidth: '150px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                margin: '0 auto'
                                                            }}
                                                        >
                                                            {group.doc_nos}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        py: 2,
                                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                                    }}
                                                >
                                                    <Typography
                                                        fontWeight={600}
                                                        fontSize="0.9rem"
                                                        color="primary.main"
                                                    >
                                                        {group.totalWeight.toFixed(2)} kg  {/* Display total weight */}
                                                    </Typography>
                                                </TableCell>
                                                {!isMobile && (
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            py: 2,
                                                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                                        }}
                                                    >
                                                        <Chip
                                                            label={group.itemCount}
                                                            color="primary"
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 600,
                                                                backgroundColor: alpha(theme.palette.primary.light, 0.1),
                                                                color: theme.palette.primary.light,
                                                                borderRadius: '16px',
                                                                px: 1
                                                            }}
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        py: 2,
                                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                                    }}
                                                >
                                                    <DetailButton group={group} />
                                                </TableCell>
                                                <ShoppingCartButton group={group} index={index} />
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={isMobile ? 6 : 8} align="center" sx={{ py: 6, borderBottom: 0 }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center', 
                                                    gap: 2
                                                }}
                                            >
                                                <LiaShoppingCartSolid style={{ fontSize: '40px', color: alpha(theme.palette.text.secondary, 0.5) }} />
                                                <Typography color="textSecondary">
                                                    {searchQuery
                                                        ? `ไม่พบข้อมูลสำหรับ "${searchQuery}"`
                                                        : "ไม่มีข้อมูลวัตถุดิบผสม"}
                                                </Typography>
                                                {!searchQuery && (
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<AddIcon />}
                                                        onClick={() => setOpenTrolleySlot(true)}
                                                        sx={{ mt: 1 }}
                                                    >
                                                        เพิ่มวัตถุดิบผสมใหม่
                                                    </Button>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination Section */}
                    {currentItems.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mt: 2,
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: { xs: 2, sm: 0 }
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.875rem'
                                }}
                            >
                                แสดงรายการ {firstItemIndex + 1} - {Math.min(lastItemIndex, totalItems)} จากทั้งหมด {totalItems} รายการ
                            </Typography>

                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            fontSize: '0.875rem',
                                            mr: 1
                                        }}
                                    >
                                        แถวต่อหน้า
                                    </Typography>

                                    <Select
                                        value={itemsPerPage}
                                        onChange={handleItemsPerPageChange}
                                        size="small"
                                        sx={{
                                            '& .MuiSelect-select': {
                                                padding: '4px 32px 4px 12px',
                                                fontSize: '0.875rem',
                                                minWidth: '60px',
                                                borderRadius: '8px',
                                            }
                                        }}
                                    >
                                        {itemsPerPageOptions.map((option) => (
                                            <MenuItem key={option} value={option} sx={{ fontSize: '0.875rem' }}>
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1
                                    }}
                                >
                                    <Tooltip title="หน้าก่อนหน้า" arrow>
                                        <span>
                                            <IconButton
                                                onClick={() => handlePageChange('prev')}
                                                disabled={currentPage === 1 || totalItems === 0}
                                                size="small"
                                                sx={{
                                                    color: currentPage === 1 || totalItems === 0 ?
                                                        'action.disabled' : 'primary.main',
                                                    borderRadius: '8px',
                                                    bgcolor: currentPage !== 1 && totalItems !== 0 ?
                                                        alpha(theme.palette.primary.light, 0.1) : 'transparent',
                                                    '&:hover': {
                                                        bgcolor: currentPage !== 1 && totalItems !== 0 ?
                                                            alpha(theme.palette.primary.light, 0.2) : 'transparent'
                                                    }
                                                }}
                                            >
                                                <KeyboardArrowLeftIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>

                                    <Typography
                                        variant="body2"
                                        sx={{
                                            minWidth: '32px',
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            color: 'text.primary'
                                        }}
                                    >
                                        {currentPage}
                                    </Typography>

                                    <Tooltip title="หน้าถัดไป" arrow>
                                        <span>
                                            <IconButton
                                                onClick={() => handlePageChange('next')}
                                                disabled={currentPage === totalPages || totalItems === 0}
                                                size="small"
                                                sx={{
                                                    color: currentPage === totalPages || totalItems === 0 ?
                                                        'action.disabled' : 'primary.main',
                                                    borderRadius: '8px',
                                                    bgcolor: currentPage !== totalPages && totalItems !== 0 ?
                                                        alpha(theme.palette.primary.light, 0.1) : 'transparent',
                                                    '&:hover': {
                                                        bgcolor: currentPage !== totalPages && totalItems !== 0 ?
                                                            alpha(theme.palette.primary.light, 0.2) : 'transparent'
                                                    }
                                                }}
                                            >
                                                <KeyboardArrowRightIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            )}

            {/* Modals */}
            {openTrolleySlot && <Slottrolley onClose={handleCloseTrolleySlot} />}

            {openDetailModal && selectedItem && (
                <DetailModal
                    item={selectedItem}
                    onClose={handleCloseDetailModal}
                    onDelete={handleOpenDeleteModal}
                    onDeleteSuccess={handleDeleteSuccess}
                    dataPrinter={dataPrinter}
                />
            )}

            {openEditModal && editData && (
                <ModalEditPD
                    open={openEditModal}
                    onClose={handleCloseEditModal}
                    data={editData}
                    onSuccess={handleEditSuccess}
                />
            )}
        </Box>
    );
};

export default ParentComponent;