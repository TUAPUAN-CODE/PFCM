import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Dialog, Divider, CircularProgress } from '@mui/material';
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

const PrintModal = ({ open, onClose, data }) => {
    const [coldHistory, setColdHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
        // Update current date time when modal opens
        if (open) {
            setCurrentDateTime(new Date());
        }
    }, [open]);

    useEffect(() => {
        // Create a style element for print media
        const style = document.createElement('style');
        style.type = 'text/css';
        style.media = 'print';

        // More aggressive CSS to eliminate all margins and ensure content fits full width
        const css = `
            @page {
                size: 72.1mm 297mm !important;
                margin: 0mm !important;
                padding: 0mm !important;
            }
            
            html, body {
                width: 72.1mm !important;
                margin: 0mm !important;
                padding: 0mm !important;
                overflow: hidden !important;
            }
            
            * {
                box-sizing: border-box !important;
            }
            
            .print-container {
                width: 72.1mm !important;
                padding: 1mm !important;
                margin: 0mm !important;
            }
            
            @media print {
                .MuiDialog-paper {
                    margin: 0mm !important;
                    padding: 0mm !important;
                    width: 72.1mm !important;
                    max-width: 72.1mm !important;
                    box-shadow: none !important;
                }
            }
        `;

        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Fetch cold storage history for each material item when the modal opens
    useEffect(() => {
        const fetchColdHistory = async () => {
            if (!open || !data || (!data.rmfp_id && !(data.materials && data.materials.length > 0))) return;

            setIsLoading(true);

            try {
                // If there are multiple materials, fetch history for each
                if (data.materials && data.materials.length > 0) {
                    const historyPromises = data.materials.map(item =>
                        axios.get(`${API_URL}/api/coldstorage/history/${item.mapping_id}`)
                    );

                    const results = await Promise.all(historyPromises);
                    const historiesWithIndex = results.map((result, index) => ({
                        materialIndex: index,
                        history: result.data.history || [],
                        qc_date: result.data.qc_date,
                        rework_date: result.data.rework_date,
                        rework_time: result.data.rework_time,
                        mix_time: result.data.mix_time,
                        cold_to_pack_time: result.data.cold_to_pack_time,
                        cold_to_pack: result.data.cold_to_pack
                    }));

                    setColdHistory(historiesWithIndex);
                } else if (data.mapping_id) {
                    // Single material case
                    const response = await axios.get(`${API_URL}/api/coldstorage/history/${data.mapping_id}`);
                    setColdHistory([{
                        materialIndex: 0,
                        history: response.data.history || [],
                        qc_date: response.data.qc_date,
                        rework_date: response.data.rework_date,
                        rework_time: response.data.rework_time,
                        mix_time: response.data.mix_time,
                        cold_to_pack_time: response.data.cold_to_pack_time,
                        cold_to_pack: response.data.cold_to_pack
                    }]);
                }

            } catch (error) {
                console.error("Error fetching cold storage history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchColdHistory();
    }, [open, data]);

    // Format date for display in Thai format
    const formatThaiDateTime = (utcDateTimeStr) => {
        if (!utcDateTimeStr) return "-";

        try {
            const utcDate = new Date(utcDateTimeStr);

            return utcDate.toLocaleString('th-TH', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (error) {
            console.error("Error formatting date:", error);
            return "-";
        }
    };

    const formatSpecialChars = (value) => {
        if (!value) return "-";
        return value === "/" ? "-" : value;
    };

    // Calculate time difference between two dates
    const calculateTimeDifference = (startDate, endDate) => {
        if (!startDate || !endDate) return "-";

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);

            // Reset seconds and milliseconds to zero for both dates
            start.setSeconds(0, 0);
            end.setSeconds(0, 0);

            // Calculate difference in milliseconds
            const diffMilliseconds = end - start;

            // Convert to minutes
            const diffMinutes = diffMilliseconds / (1000 * 60);

            // Split into hours and minutes
            const hours = Math.floor(diffMinutes / 60);
            const minutes = Math.floor(diffMinutes % 60);

            // Format display string
            if (hours > 0) {
                return `${hours} ชม. ${minutes} นาที`;
            } else {
                return `${minutes} นาที`;
            }
        } catch (error) {
            console.error("Error calculating time difference:", error);
            return "-";
        }
    };

    // Calculate DBS (duration between processing and cold storage)
    const calculateDBS = (standardPtc, ptcTime) => {
        if (!standardPtc || !ptcTime) return "-";

        try {
            const standardParts = standardPtc.toString().split('.');
            const ptcParts = ptcTime.toString().split('.');

            const standardMinutes = parseInt(standardParts[0]) * 60 +
                (standardParts.length > 1 ? parseInt(standardParts[1]) : 0);
            const ptcMinutes = parseInt(ptcParts[0]) * 60 +
                (ptcParts.length > 1 ? parseInt(ptcParts[1]) : 0);

            let diffMinutes = standardMinutes - ptcMinutes;
            if (diffMinutes < 0) diffMinutes = 0;

            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;

            if (hours > 0) {
                return `${hours} ชม. ${minutes} นาที`;
            } else {
                return `${minutes} นาที`;
            }
        } catch (error) {
            console.error("Error calculating DBS:", error);
            return "-";
        }
    };

    // Calculate DCS (duration in cold storage) for each round
    const calculateDCS = (comeColdDate, outColdDate) => {
        return calculateTimeDifference(comeColdDate, outColdDate);
    };

    const calculateCorrectedDBS = (qcDate) => {
        if (!qcDate) return "-";
        return calculateTimeDifference(qcDate, currentDateTime);
    };

    const handlePrint = () => {
        window.print();
    };

    const {
        material_code, materialName, rm_cold_status, rm_status,
        ComeColdDateTime, slot_id, tro_id, batch, rmfp_id,
        Location, operator, level_eu, cooked_date, rmit_date, rmm_line_name, name_prod_edit_two,name_prod_edit_three, first_prod, two_prod,three_prod, materials, prepare_mor_night,production
    } = data || {};

    // Define grid gap for consistent use throughout the component
    const gridGapScreen = "4px 24px";
    const gridGapPrint = "2px 16px";

    // Define consistent font sizes
    const fontSizes = {
        header: {
            screen: "22px",
            print: "14px"
        },
        section: {
            screen: "16px",
            print: "10px"
        },
        sectionMaterial: {
            screen: "14px",
            print: "11px"
        },
        materialTitle: {
            screen: "12px",
            print: "12px"
        },
        label: {
            screen: "14px",
            print: "10px"
        },
        value: {
            screen: "14px",
            print: "10px"
        }
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
                    width: '500px',
                    display: 'flex',
                    maxWidth: 'none',
                    margin: 0,
                    '@media print': {
                        width: '72.1mm !important',
                        maxWidth: '72.1mm !important',
                        height: 'auto',
                        minHeight: '200px',
                        margin: '0mm !important',
                        padding: '0mm !important',
                        boxShadow: 'none',
                        overflow: 'visible',
                    },
                },
            }}
        >
            <Box
                className="print-container"
                sx={{
                    backgroundColor: "#fff",
                    width: "100%",
                    padding: "3mm",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    '@media print': {
                        width: '72.1mm !important',
                        padding: '1mm !important',
                        margin: '0mm !important',
                        overflow: 'visible',
                    },
                }}
            >
                {/* Action Buttons (hidden when printing) */}
                <Box sx={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "space-between",
                    mb: 2,
                    '@media print': {
                        display: 'none',
                    },
                }}>
                    <Button
                        variant="contained"
                        onClick={onClose}
                        sx={{
                            width: "48%",
                            height: "40px",
                            backgroundColor: "#ff4444",
                            '&:hover': {
                                backgroundColor: "#dd3333",
                            }
                        }}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handlePrint}
                        sx={{
                            width: "48%",
                            height: "40px",
                            backgroundColor: "#2388d1",
                            '&:hover': {
                                backgroundColor: "#1a76b5",
                            }
                        }}
                    >
                        พิมพ์
                    </Button>
                </Box>

                {/* Header Section */}
                <Box sx={{
                    width: "100%",
                    mb: 1.5,
                    textAlign: 'center',
                    '@media print': {
                        marginBottom: '3px',
                    },
                }}>
                    <Typography variant="h6" sx={{
                        fontSize: fontSizes.header.screen,
                        fontWeight: "normal",
                        mb: 0.5,
                        '@media print': {
                            fontSize: fontSizes.header.print,
                            marginBottom: '2px',
                        },
                    }}>
                        ข้อมูลรถเข็นวัตถุดิบ
                    </Typography>


                    {/* License Plate and Location */}
                    <Box sx={{
                        display: "flex",
                        justifyContent: "center",
                        mb: 0.5,
                    }}>
                        <Box sx={{
                            border: "2px solid #000",
                            borderRadius: "6px",
                            overflow: "hidden",
                            display: "flex",
                            width: "100%",
                        }}>
                            <Box sx={{
                                flex: 1,
                                padding: "6px 4px",
                                textAlign: "center",
                                borderRight: "2px solid #000",
                                fontSize: "18px",
                                fontWeight: "normal",
                                '@media print': {
                                    fontSize: fontSizes.value.print,
                                    padding: '4px 2px',
                                },
                            }}>
                                ป้ายทะเบียน: {tro_id || "-"}
                            </Box>
                            <Box sx={{
                                flex: 1,
                                padding: "6px 4px",
                                textAlign: "center",
                                fontSize: "18px",
                                fontWeight: "normal",
                                '@media print': {
                                    fontSize: fontSizes.value.print,
                                    padding: '4px 2px',
                                },
                            }}>
                                สถานที่จัดส่ง: {Location === "บรรจุ" ? rmm_line_name || "-" : Location || "-"}
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Divider sx={{
                    width: "100%",
                    borderColor: "#ccc",
                    mb: 1.5,
                    '@media print': {
                        marginBottom: '3px',
                    },
                }} />

                {/* General Information Section */}
                <Box sx={{
                    width: "100%",
                    mb: 1.5,
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    padding: "6px 4px",
                    '@media print': {
                        padding: '4px 2px',
                        marginBottom: '3px',
                    },
                }}>
                    <Typography variant="subtitle1" sx={{
                        color: "#2388d1",
                        fontSize: fontSizes.section.screen,
                        mb: 0.5,
                        fontWeight: "normal",
                        '@media print': {
                            fontSize: fontSizes.section.print,
                            marginBottom: '2px',
                        },
                    }}>
                        ข้อมูลทั่วไป
                    </Typography>

                    <Box sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: gridGapScreen,
                        '@media print': {
                            gap: gridGapPrint,
                        },
                    }}>
                        <InfoItem label="พื้นที่จอด" value={slot_id} fontSizes={fontSizes} />
                        <InfoItem label="ผู้ดำเนินการ" value={operator} fontSizes={fontSizes} />
                        <InfoItem label="สถานะรถเข็น" value={rm_cold_status} fontSizes={fontSizes} />
                        <InfoItem label="สถานะวัตถุดิบ" value={rm_status} fontSizes={fontSizes} />
                    </Box>
                </Box>

                <Divider sx={{
                    width: "100%",
                    borderColor: "#ccc",
                    mb: 1.5,
                    '@media print': {
                        marginBottom: '3px',
                    },
                }} />

                {/* Loading indicator */}
                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}

                {/* Materials List Section */}
                <Box sx={{
                    width: "100%",
                    mb: 0.5,
                }}>
                    <Typography variant="subtitle1" sx={{
                        color: "#2388d1",
                        fontSize: fontSizes.sectionMaterial.screen,
                        mb: 0.5,
                        fontWeight: "normal",
                        '@media print': {
                            fontSize: fontSizes.sectionMaterial.print,
                            marginBottom: '2px',
                        },
                    }}>
                        รายการวัตถุดิบในรถเข็น
                    </Typography>

                    {materials && materials.length > 0 ? (
                        materials.map((item, index) => {
                            // Find history for this material item
                            const materialHistory = coldHistory.find(
                                hist => hist.materialIndex === index
                            )?.history || [];

                            // Get qc_date and rework_time from coldHistory
                            const qcDate = coldHistory.find(hist => hist.materialIndex === index)?.qc_date;
                            const reworkDate = coldHistory.find(hist => hist.materialIndex === index)?.rework_date;
                            const reworkTime = coldHistory.find(hist => hist.materialIndex === index)?.rework_time;
                            const mixTime = coldHistory.find(hist => hist.materialIndex === index)?.mix_time;
                            const coldToPackTime = coldHistory.find(hist => hist.materialIndex === index)?.cold_to_pack_time;
                            const coldToPack = coldHistory.find(hist => hist.materialIndex === index)?.cold_to_pack;

                            return (
                                <MaterialItem
                                    key={index}
                                    index={index}
                                    item={{
                                        ...item,
                                        mix_time: mixTime,
                                        cold_to_pack_time: coldToPackTime,
                                        cold_to_pack: coldToPack
                                    }}
                                    history={materialHistory}
                                    qcDate={qcDate}
                                    reworkDate={reworkDate}
                                    reworkTime={reworkTime}
                                    totalItems={materials.length}
                                    calculateDBS={calculateDBS}
                                    calculateDCS={calculateDCS}
                                    calculateCorrectedDBS={calculateCorrectedDBS}
                                    formatThaiDateTime={formatThaiDateTime}
                                    formatSpecialChars={formatSpecialChars}
                                    gridGapScreen={gridGapScreen}
                                    gridGapPrint={gridGapPrint}
                                    fontSizes={fontSizes}
                                    Location={Location}
                                />
                            );
                        })
                    ) : (
                        <MaterialItem
                            index={0}
                            item={{
                                material_code,
                                materialName,
                                production,
                                batch,
                                levelEu: level_eu,
                                cooked_date: cooked_date,
                                come_cold_date: ComeColdDateTime,
                                mix_time: coldHistory[0]?.mix_time,
                                cold_to_pack_time: coldHistory[0]?.cold_to_pack_time,
                                cold_to_pack: coldHistory[0]?.cold_to_pack,
                                name_prod_edit_two: name_prod_edit_two,
                                name_prod_edit_three: name_prod_edit_three,
                                first_prod: first_prod,
                                two_prod: two_prod,
                                three_prod: three_prod
                                
                            }}
                            history={coldHistory[0]?.history || []}
                            qcDate={coldHistory[0]?.qc_date}
                            reworkDate={coldHistory[0]?.rework_date}
                            reworkTime={coldHistory[0]?.rework_time}
                            totalItems={1}
                            calculateDBS={calculateDBS}
                            calculateDCS={calculateDCS}
                            calculateCorrectedDBS={calculateCorrectedDBS}
                            formatThaiDateTime={formatThaiDateTime}
                            formatSpecialChars={formatSpecialChars}
                            gridGapScreen={gridGapScreen}
                            gridGapPrint={gridGapPrint}
                            fontSizes={fontSizes}
                            Location={Location}
                        />
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};

const MaterialItem = ({
    index,
    item,
    history,
    qcDate,
    reworkDate,
    reworkTime,
    totalItems,
    calculateDBS,
    calculateDCS,
    calculateCorrectedDBS,
    formatThaiDateTime,
    formatSpecialChars,
    gridGapScreen,
    gridGapPrint,
    fontSizes,
    Location
}) => {
    const calculatePackagingDeadline = (history, mix_time, rework_time, cold_to_pack_time, cold_to_pack) => {
        if (!history || history.length === 0) {
            return { start: null, end: null, timeAllowed: null, timeAllowedLabel: null, isExpired: false };
        }

        // Find the latest out_date from history
        let latestOutDate = null;
        const sortedHistory = [...history].sort((a, b) => b.round - a.round);

        for (const entry of sortedHistory) {
            if (entry.out_date) {
                latestOutDate = entry.out_date;
                break;
            }
        }

        if (!latestOutDate) {
            return { start: null, end: null, timeAllowed: null, timeAllowedLabel: null, isExpired: false };
        }

        // Determine which time to use according to priority
        let timeAllowed = null;
        let timeAllowedLabel = "";

        // Priority 1: mix_time
        if (mix_time !== null && mix_time !== undefined && mix_time !== "") {
            timeAllowed = mix_time;
            timeAllowedLabel = "mix_time";
        }
        // Priority 2: rework_time
        else if (rework_time !== null && rework_time !== undefined && rework_time !== "") {
            timeAllowed = rework_time;
            timeAllowedLabel = "rework_time";
        }
        // Priority 3: cold_to_pack_time
        else if (cold_to_pack_time !== null && cold_to_pack_time !== undefined && cold_to_pack_time !== "") {
            timeAllowed = cold_to_pack_time;
            timeAllowedLabel = "cold_to_pack_time";
        }
        // Priority 4: cold_to_pack
        else if (cold_to_pack !== null && cold_to_pack !== undefined && cold_to_pack !== "") {
            timeAllowed = cold_to_pack;
            timeAllowedLabel = "cold_to_pack";
        }

        // If no valid time found, return null
        if (timeAllowed === null) {
            return {
                start: latestOutDate,
                end: null,
                timeAllowed: null,
                timeAllowedLabel: null,
                isExpired: false
            };
        }

        // Check if time is negative (already expired)
        let isExpired = false;
        if (typeof timeAllowed === 'string' && timeAllowed.startsWith('-')) {
            isExpired = true;
            timeAllowed = timeAllowed.substring(1); // Remove the negative sign
        } else if (typeof timeAllowed === 'number' && timeAllowed < 0) {
            isExpired = true;
            timeAllowed = Math.abs(timeAllowed);
        }

        // Convert timeAllowed to minutes
        let totalMinutes = 0;
        try {
            // Handle string format (e.g., "1.30" or "-1.25")
            if (typeof timeAllowed === 'string') {
                const parts = timeAllowed.split('.');
                const hours = parseInt(parts[0]) || 0;
                const minutes = parts.length > 1 ? parseInt(parts[1]) : 0;
                totalMinutes = hours * 60 + minutes;
            }
            // Handle number format (e.g., 1.5 or -1.25)
            else if (typeof timeAllowed === 'number') {
                const hours = Math.floor(timeAllowed);
                const minutes = Math.round((timeAllowed - hours) * 100);
                totalMinutes = hours * 60 + minutes;
            }
        } catch (error) {
            console.error("Error calculating time:", error);
            return {
                start: latestOutDate,
                end: null,
                timeAllowed: timeAllowed,
                timeAllowedLabel: timeAllowedLabel,
                isExpired: isExpired
            };
        }

        // Calculate end date
        const startDate = new Date(latestOutDate);
        const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

        return {
            start: latestOutDate,
            end: endDate.toISOString(),
            timeAllowed: timeAllowed,
            timeAllowedLabel: timeAllowedLabel,
            isExpired: isExpired
        };
    };

    // Format time value for display
    const formatTimeAllowed = (timeValue, isExpired = false) => {
        if (timeValue === null || timeValue === undefined) return "-";

        try {
            const timeString = timeValue.toString();
            const parts = timeString.split('.');
            const hours = parseInt(parts[0]);
            const minutes = parts.length > 1 ? parseInt(parts[1]) : 0;

            if (hours > 0) {
                return `${isExpired ? 'เลยกำหนดมาแล้ว ' : ''}${hours} ชม. ${minutes} นาที`;
            } else {
                return `${isExpired ? 'เลยกำหนดมาแล้ว ' : ''}${minutes} นาที`;
            }
        } catch (error) {
            console.error("Error formatting time allowed:", error);
            return "-";
        }
    };

    // Get packaging deadline data
    const deadlineInfo = calculatePackagingDeadline(
        history,
        item.mix_time,
        reworkTime,
        item.cold_to_pack_time,
        item.cold_to_pack
    );

    return (
        <Box sx={{
            mb: 1.5,
            pb: 0.5,
            borderBottom: index < totalItems - 1 ? '1px dashed #ccc' : 'none',
            '@media print': {
                marginBottom: '3px',
                paddingBottom: '2px',
            },
        }}>
            <Typography variant="subtitle2" sx={{
                fontSize: fontSizes.materialTitle.screen,
                mb: 0.5,
                fontWeight: "normal",
                '@media print': {
                    fontSize: fontSizes.materialTitle.print,
                    marginBottom: '1px',
                    marginTop: '5px'
                },
            }}>
                วัตถุดิบที่ {index + 1}
            </Typography>

            <Box sx={{
                ml: 0.5,
                '@media print': {
                    marginLeft: '1px',
                },
            }}>
                {/* Row 1 - Batch and Level EU */}
                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: gridGapScreen,
                    mb: 0.5,
                    '@media print': {
                        gap: gridGapPrint,
                        marginBottom: '1px',
                    },
                }}>
                    <InfoItem label="Batch" value={item.batch} fontSizes={fontSizes} />
                    <InfoItem label="Level EU" value={item.levelEu} fontSizes={fontSizes} />
                </Box>

                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: gridGapScreen,
                    mb: 0.5,
                    '@media print': {
                        gap: gridGapPrint,
                        marginBottom: '1px',
                    },
                }}>
                    <InfoItem label="ชื่อวัตถุดิบ" value={item.materialName} fontSizes={fontSizes} />
                    <InfoItem label="แผนการผลิต" value={item.production} fontSizes={fontSizes} />
                </Box>

                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: gridGapScreen,
                    mb: 0.5,
                    '@media print': {
                        gap: gridGapPrint,
                        marginBottom: '1px',
                    },
                }}>
                    <InfoItem label="น้ำหนักวัตถุดิบ" value={item.weight_RM} fontSizes={fontSizes} />
                    <InfoItem label="จำนวนถาด" value={item.tray_count} fontSizes={fontSizes} />
                </Box>

                {/* Time Information */}
                <Box sx={{
                    mb: 0.5,
                    mt: 1,
                    '@media print': {
                        marginTop: '5px',
                        marginBottom: '1px',
                    },
                }}>

                    {/* Row - เวลาต้มเสร็จ/อบเสร็จ */}
                    <Box sx={{
                        mb: 0.5,
                        '@media print': {
                            marginBottom: '1px',
                        },
                    }}>
                        <InlineInfoItem
                            label="เวลาเบิกจากห้องเย็นใหญ่"
                            value={item.withdraw_date ? formatThaiDateTime(item.withdraw_date) + " น." : "-"}
                            fontSizes={fontSizes}
                        />
                    </Box>
                    {/* Cooking/Processing Time */}
                    <Box sx={{
                        mb: 0.5,
                        '@media print': {
                            marginBottom: '1px',
                        },
                    }}>
                        <InlineInfoItem
                            label="เวลาต้มเสร็จ/อบเสร็จ"
                            value={item.cooked_date ? formatThaiDateTime(item.cooked_date) + " น." : "-"}
                            fontSizes={fontSizes}
                        />
                    </Box>

                    {/* Preparation Time */}
                    <Box sx={{
                        mb: 0.5,
                        '@media print': {
                            marginBottom: '1px',
                        },
                    }}>
                        <InlineInfoItem
                            label="เวลาเตรียมเสร็จ"
                            value={item.rmit_date ? formatThaiDateTime(item.rmit_date) + " น." : "-"}
                            fontSizes={fontSizes}
                        />
                    </Box>

                    {/* DBS - Time from cooking to cold storage */}
                    {item.cooked_date && (history?.[0]?.come_date || item.come_cold_date) && (
                        <Box sx={{
                            mb: 2,
                            '@media print': {
                                marginTop: '1px',
                                marginBottom: '6px',
                                paddingTop: '1px',
                            },
                        }}>
                            <InlineInfoItem
                                label="DBS เตรียม - เข้าห้องเย็น (ช่วงที่ 1) "
                                value={calculateDBS(
                                    item.standard_ptc, item.ptc_time
                                ) || "-"}
                                fontSizes={fontSizes}
                            />

                            {/* Rework Information */}
                            {reworkTime && (
                                <Box sx={{
                                    mb: 0.5,
                                    '@media print': {
                                        marginBottom: '1px',
                                    },
                                }}>
                                    <InlineInfoItem
                                        label="วันที่เวลาแก้ไข"
                                        value={reworkDate ? formatThaiDateTime(reworkDate) + " น." : "-"}
                                        fontSizes={fontSizes}
                                    />
                                    <InlineInfoItem
                                        label="DBS เตรียม - เข้าห้องเย็น (วัตถุดิบแก้ไข) "
                                        value={qcDate ? calculateCorrectedDBS(qcDate) || "-" : "-"}
                                        fontSizes={fontSizes}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>

                {/* Cold Storage History */}
                {history && history.length > 0 ? (
                    history.map((entry, idx) => (
                        <Box key={idx} sx={{
                            mb: 1,
                            py: 0.5,
                            borderTop: idx > 0 ? '1px dotted #eee' : 'none',
                            '@media print': {
                                marginBottom: '2px',
                                paddingTop: '1px',
                                paddingBottom: '1px',
                            },
                        }}>
                            <Box sx={{
                                mb: 0.5,
                                '@media print': {
                                    marginBottom: '1px',
                                },
                            }}>
                                <InlineInfoItem
                                    label={`เวลาเข้าห้องเย็น${history.length > 1 ? ` (ครั้งที่ ${entry.round})` : ''}`}
                                    value={entry.come_date ? formatThaiDateTime(entry.come_date) + " น." : "-"}
                                    fontSizes={fontSizes}
                                />
                            </Box>

                            {entry.out_date && (
                                <Box sx={{
                                    mb: 0.5,
                                    '@media print': {
                                        marginBottom: '1px',
                                    },
                                }}>
                                    <InlineInfoItem
                                        label={`เวลาออกห้องเย็น${history.length > 1 ? ` (ครั้งที่ ${entry.round})` : ''}`}
                                        value={formatThaiDateTime(entry.out_date) + " น."}
                                        fontSizes={fontSizes}
                                    />
                                </Box>
                            )}

                            {entry.come_date && entry.out_date && (
                                <Box sx={{
                                    mb: 0.5,
                                    '@media print': {
                                        marginBottom: '1px',
                                    },
                                }}>
                                    <InlineInfoItem
                                        label={`DCS (ช่วงที่ 2) ${history.length > 1 ? `ครั้งที่ ${entry.round}` : ''}`}
                                        value={calculateDCS(entry.come_date, entry.out_date) || "-"}
                                        fontSizes={fontSizes}
                                    />
                                </Box>
                            )}
                        </Box>
                    ))
                ) : (
                    <Box sx={{
                        mb: 0.5,
                        '@media print': {
                            marginBottom: '1px',
                        },
                    }}>
                        <InlineInfoItem
                            label="เวลาเข้าห้องเย็น"
                            value={item.come_cold_date ? formatThaiDateTime(item.come_cold_date) + " น." : "-"}
                            fontSizes={fontSizes}
                        />
                    </Box>
                )}

                {/* Packaging Deadline Section */}
                {deadlineInfo.start && deadlineInfo.end && Location === "บรรจุ" && (
                    <Box sx={{
                        mb: 1.5,
                        mt: 1,
                        py: 0.5,
                        backgroundColor: deadlineInfo.isExpired ? '#fff3f3' : '#f9f9f9',
                        borderRadius: '4px',
                        border: `1px dashed ${deadlineInfo.isExpired ? '#ff6b6b' : '#ccc'}`,
                        padding: '8px',
                        '@media print': {
                            marginTop: '4px',
                            marginBottom: '4px',
                            padding: '4px',
                        },
                    }}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontSize: fontSizes.label.screen,
                                fontWeight: "bold",
                                color: deadlineInfo.isExpired ? '#ff4444' : '#2388d1',
                                mb: 0.5,
                                '@media print': {
                                    fontSize: fontSizes.label.print,
                                    marginBottom: '2px',
                                },
                            }}
                        >
                            {deadlineInfo.isExpired ? 'วัตถุดิบนี้เลยกำหนดบรรจุแล้ว' : 'บรรจุเสร็จ ภายใน'} ({formatTimeAllowed(deadlineInfo.timeAllowed, deadlineInfo.isExpired)})
                        </Typography>

                        {!deadlineInfo.isExpired && (
                            <>
                                <Box sx={{
                                    mb: 0.5,
                                    '@media print': {
                                        marginBottom: '1px',
                                    },
                                }}>
                                    <InlineInfoItem
                                        label="เริ่ม"
                                        value={formatThaiDateTime(deadlineInfo.start) + " น."}
                                        fontSizes={fontSizes}
                                    />
                                </Box>

                                <Box sx={{
                                    mb: 0,
                                    '@media print': {
                                        marginBottom: '0',
                                    },
                                }}>
                                    <InlineInfoItem
                                        label="ถึง"
                                        value={formatThaiDateTime(deadlineInfo.end) + " น."}
                                        fontSizes={fontSizes}
                                    />
                                </Box>
                            </>
                        )}
                    </Box>
                )}

                {item.name_edit_prod_two && item.name_edit_prod_two !== "-" && (
                    <>
                        <Typography variant="subtitle2" sx={{
                            fontSize: fontSizes.value.screen,
                            mb: 0.5,
                            fontWeight: "normal",
                            '@media print': {
                                fontSize: fontSizes.materialTitle.print,
                                marginBottom: '1px',
                                marginTop: '5px'
                            },
                        }}>
                            ประวัติการแก้ไขแผนผลิต
                        </Typography>

                        <Box sx={{
                            mb: 0.5,
                            fontSize: fontSizes.value.screen,
                            '@media print': {
                                marginBottom: '1px',
                                fontSize: fontSizes.value.print,
                            },
                        }}>
                            <span style={{ color: '#666' }}>แผนการผลิต ครั้งที่ 1:</span> {item.first_prod || '-'}
                        </Box>
                        <Box sx={{
                            mb: 0.5,
                            fontSize: fontSizes.value.screen,
                            '@media print': {
                                marginBottom: '1px',
                                fontSize: fontSizes.value.print,
                            },
                        }}>
                            <span style={{ color: '#666' }}>แผนการผลิต ครั้งที่ 2:</span> {item.two_prod || '-'}
                        </Box>
                        <Box sx={{
                            mb: 0.5,
                            fontSize: fontSizes.value.screen,
                            '@media print': {
                                marginBottom: '1px',
                                fontSize: fontSizes.value.print,
                            },
                        }}>
                            <span style={{ color: '#666' }}>ชื่อผู้อนุมัติ ครั้งที่ 2:</span> {item.name_edit_prod_two}
                        </Box>

                        {item.three_prod &&(
                            <>
                            <Box sx={{
                            mb: 0.5,
                            fontSize: fontSizes.value.screen,
                            '@media print': {
                                marginBottom: '1px',
                                fontSize: fontSizes.value.print,
                            },
                        }}>
                            <span style={{ color: '#666' }}>แผนการผลิต ครั้งที่ 3:</span> {item.three_prod || '-'}
                        </Box>

                        <Box sx={{
                            mb: 0.5,
                            fontSize: fontSizes.value.screen,
                            '@media print': {
                                marginBottom: '1px',
                                fontSize: fontSizes.value.print,
                            },
                        }}>
                            <span style={{ color: '#666' }}>ชื่อผู้อนุมัติ ครั้งที่ 3:</span> {item.name_edit_prod_three}
                        </Box>
                            </>
                        )}

                        
                    </>
                )}

                {/* Quality Check Information */}
                <Box sx={{
                    mb: 0.5,
                    fontSize: fontSizes.value.screen,
                    '@media print': {
                        marginBottom: '1px',
                        fontSize: fontSizes.value.print,
                    },
                }}>

                    <span style={{ color: '#666' }}>Sensory Check:</span> {item.qccheck || '-'}
                    {item.sq_acceptance === true && item.sq_remark && (
                        <span style={{ marginLeft: '4px', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                            || <span style={{ color: '#666' }}>ยอมรับพิเศษ หมายเหตุ Sensory:</span> {item.sq_remark}
                        </span>
                    )}
                    {item.sq_remark && item.sq_acceptance !== true && (
                        <span style={{ marginLeft: '4px', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                            || <span style={{ color: '#666' }}>หมายเหตุ Sensory:</span> {item.sq_remark}
                        </span>
                    )}
                </Box>
                <Box sx={{
                    mb: 0.5,
                    fontSize: fontSizes.value.screen,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-line',
                    '@media print': {
                        marginBottom: '1px',
                        fontSize: fontSizes.value.print,
                    },
                }}>
                    <span style={{ color: '#666' }}>MD Check:</span> {item.mdcheck || '-'}&nbsp;||&nbsp;
                    <span style={{ color: '#666' }}>หมายเหตุ MD:</span> {item.md_remark || '-'}
                </Box>
                <Box sx={{
                    mb: 0.5,
                    fontSize: fontSizes.value.screen,
                    '@media print': {
                        marginBottom: '1px',
                        fontSize: fontSizes.value.print,
                    },
                }}>
                    <span style={{ color: '#666' }}>Defect Check:</span> {item.defectcheck || '-'}
                    {item.defect_acceptance === true && item.defect_remark && (
                        <span style={{ marginLeft: '4px', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                            || <span style={{ color: '#666' }}>ยอมรับพิเศษ หมายเหตุ Defect:</span> {item.defect_remark}
                        </span>
                    )}
                    {item.defect_remark && item.defect_acceptance !== true && (
                        <span style={{ marginLeft: '4px', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                            || <span style={{ color: '#666' }}>หมายเหตุ Defect:</span> {item.defect_remark}
                        </span>
                    )}
                </Box>

                {(item.qccheck_cold || item.receiver_qc_cold || item.approver) && (
                    <>
                        <Typography variant="subtitle2" sx={{
                            fontSize: fontSizes.value.screen,
                            mb: 0.5,
                            fontWeight: "normal",
                            '@media print': {
                                fontSize: fontSizes.materialTitle.print,
                                marginBottom: '1px',
                                marginTop: '5px'
                            },
                        }}>
                            การตรวจสอบ Sensory ในห้องเย็น
                        </Typography>

                        {item.qccheck_cold && (
                            <Box sx={{
                                mb: 0.5,
                                fontSize: fontSizes.value.screen,
                                '@media print': {
                                    marginBottom: '5px',
                                    fontSize: fontSizes.value.print,
                                },
                            }}>
                                <span style={{ color: '#666', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>ผลการตรวจสอบ Sensory ที่เช็คในห้องเย็น :</span> {item.qccheck_cold}
                            </Box>
                        )}

                        {item.remark_rework_cold && (
                            <Box sx={{
                                mb: 0.5,
                                fontSize: fontSizes.value.screen,
                                '@media print': {
                                    marginBottom: '5px',
                                    fontSize: fontSizes.value.print,
                                },
                            }}>
                                <span style={{ color: '#666', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>หมายเหตุที่ไม่ผ่าน :</span> {item.remark_rework_cold}
                            </Box>
                        )}

                        {item.receiver_qc_cold && (
                            <Box sx={{
                                mb: 0.5,
                                fontSize: fontSizes.value.screen,
                                '@media print': {
                                    marginBottom: '5px',
                                    fontSize: fontSizes.value.print,
                                },
                            }}>
                                <span style={{ color: '#666', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>ผู้ตรวจ :</span> {item.receiver_qc_cold}
                            </Box>
                        )}

                        {item.approver && (
                            <Box sx={{
                                mb: 0.5,
                                fontSize: fontSizes.value.screen,
                                '@media print': {
                                    marginBottom: '5px',
                                    fontSize: fontSizes.value.print,
                                },
                            }}>
                                <span style={{ color: '#666', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>ผู้อนุมัติ :</span> {item.approver}
                            </Box>
                        )}
                    </>


                )}

                {item.remark_rework && (
                    <Box sx={{
                        mb: 0.5,
                        fontSize: fontSizes.value.screen,
                        '@media print': {
                            marginBottom: '5px',
                            fontSize: fontSizes.value.print,
                        },
                    }}>
                        <span style={{ color: '#666', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>หมายเหตุแก้ไข-บรรจุ :</span> {item.remark_rework}
                    </Box>
                )}
                
                {item.edit_rework && (
                    <Box sx={{
                        mb: 0.5,
                        fontSize: fontSizes.value.screen,
                        '@media print': {
                            marginBottom: '5px',
                            fontSize: fontSizes.value.print,
                        },
                    }}>
                        <span style={{ color: '#666', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>ประวัติการแก้ไข :</span> {item.edit_rework}
                    </Box>
                )}


            </Box>

            {item.prepare_mor_night && (
            <Box sx={{
                mb: 0.5,
                fontSize: fontSizes.value.screen,
                '@media print': {
                    marginBottom: '1px',
                    fontSize: fontSizes.value.print,
                },
            }}>
                <span style={{ color: '#666' }}>เตรียมงานให้กะ:</span> {item.prepare_mor_night}
            </Box>
            )}
        </Box>
    );
};

const InlineInfoItem = ({ label, value, fontSizes }) => (
    <Box sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        '@media print': {
            marginBottom: '6px',
        },
    }}>
        <Typography variant="caption" sx={{
            color: "#666",
            fontSize: fontSizes.label.screen,
            lineHeight: 1.5,
            marginRight: '4px',
            '@media print': {
                fontSize: fontSizes.label.print,
                lineHeight: 1.3,
            },
        }}>
            {label}:
        </Typography>
        <Typography variant="body2" sx={{
            color: "#000",
            fontSize: fontSizes.value.screen,
            lineHeight: 1.5,
            fontWeight: 300,
            wordBreak: "break-word",
            '@media print': {
                fontSize: fontSizes.value.print,
                lineHeight: 1.3,
            },
        }}>
            {value || "-"}
        </Typography>
    </Box>
);

const InfoItem = ({ label, value, fontSizes }) => (
    <Box>
        <Typography variant="caption" sx={{
            color: "#666",
            fontSize: fontSizes.label.screen,
            lineHeight: 1.5,
            display: 'block',
            '@media print': {
                fontSize: fontSizes.label.print,
                lineHeight: 1.3,
            },
        }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{
            color: "#000",
            fontSize: fontSizes.value.screen,
            lineHeight: 1.5,
            fontWeight: 300,
            wordBreak: "break-word",
            '@media print': {
                fontSize: fontSizes.value.print,
                lineHeight: 1.3,
            },
        }}>
            {value || "-"}
        </Typography>
    </Box>
);

export default PrintModal;