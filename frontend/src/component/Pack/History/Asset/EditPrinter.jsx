import React, { useEffect } from 'react';
import { Box, Button, Typography, Dialog } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CancelIcon from '@mui/icons-material/CancelOutlined';

const EditPrinter = ({ open, onClose, data, status }) => {
    console.log("EditPrinter data:", data);
    if (!data) return null;

    const formatDateTime = (dateString) => {
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

    useEffect(() => {
        const handleAfterPrint = () => {
            onClose();
        };
        window.addEventListener("afterprint", handleAfterPrint);

        const originalOnBeforeprint = window.onbeforeprint;
        window.onbeforeprint = function () {
            if (originalOnBeforeprint) originalOnBeforeprint();

            const style = document.createElement('style');
            style.id = 'printStyle';
            style.innerHTML = `
                @page {
                size: 80mm auto;
                margin: 0mm;
            }
            @media print {
                html, body {
                    width: 80mm;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                }
                .print-content {
                    width: 72.1mm !important;
                    padding: 2mm 4mm !important;
                    margin: 0 !important;
                    overflow: visible !important;
                    box-shadow: none !important;
                    font-size: 10px !important;
                }
                .print-content * {
                    overflow: visible !important;
                }
                .MuiDialog-container {
                    height: auto !important;
                }
                .MuiDialog-paper {
                    box-shadow: none !important;
                    width: 80mm !important;
                    max-width: 80mm !important;
                    min-width: 80mm !important;
                    margin: 0 !important;
                    overflow: visible !important;
                }
            }
            `;
            document.head.appendChild(style);
        };

        window.onafterprint = function () {
            const printStyle = document.getElementById('printStyle');
            if (printStyle) printStyle.remove();
            handleAfterPrint();
        };

        return () => {
            window.removeEventListener("afterprint", handleAfterPrint);
            window.onbeforeprint = originalOnBeforeprint;
            window.onafterprint = null;
        };
    }, [onClose]);

    const handlePrint = () => {
        window.print();
    };

    // ตรวจสอบและเตรียมข้อมูลวัตถุดิบ
    const materials = data ? (
        Array.isArray(data.materials) ? data.materials :
            (data.mat_name ? [data] : [])
    ) : [];

    // เพิ่มฟังก์ชันนี้ในคอมโพเนนต์ EditPrinter
    const groupMaterialsByMixCode = () => {
        if (!materials || materials.length === 0) return { mixed: {}, normal: [] };

        // แยกวัตถุดิบเป็น 2 กลุ่ม: มีรหัสการผสม และไม่มีรหัสการผสม
        const mixed = {}; // วัตถุดิบที่มีรหัสการผสม จัดกลุ่มตามรหัส
        const normal = []; // วัตถุดิบปกติที่ไม่มีรหัสการผสม

        materials.forEach((material, index) => {
            if (material.mix_code) {
                // กรณีมีรหัสการผสม
                if (!mixed[material.mix_code]) {
                    mixed[material.mix_code] = [];
                }
                mixed[material.mix_code].push({ ...material, originalIndex: index });
            } else {
                // กรณีไม่มีรหัสการผสม
                normal.push({ ...material, originalIndex: index });
            }
        });

        return { mixed, normal };
    };

    // เตรียมข้อมูลห้องเย็นสำหรับแต่ละวัตถุดิบ
    const materialColdStorageData = materials.map((material, index) => {
        // สำหรับวัตถุดิบแรกใช้ฟิลด์หลัก
        if (index === 0) {
            return [
                {
                    enter: formatDateTime(data?.come_cold_date),
                    exit: formatDateTime(data?.out_cold_date),
                    receiver: data?.receiver_out_cold
                },
                {
                    enter: formatDateTime(data?.come_cold_date_two),
                    exit: formatDateTime(data?.out_cold_date_two),
                    receiver: data?.receiver_out_cold_two
                },
                {
                    enter: formatDateTime(data?.come_cold_date_three),
                    exit: formatDateTime(data?.out_cold_date_three),
                    receiver: data?.receiver_out_cold_three
                }
            ].filter(entry => entry.enter !== "ไม่มีข้อมูล" || entry.exit !== "ไม่มีข้อมูล" || entry.receiver);
        }
        // สำหรับวัตถุดิบที่สองใช้ฟิลด์ที่มี suffix _two
        else if (index === 1) {
            return [
                {
                    enter: formatDateTime(material?.come_cold_date_two),
                    exit: formatDateTime(material?.out_cold_date_two),
                    receiver: material?.receiver_out_cold_two
                },
                {
                    enter: formatDateTime(material?.come_cold_date_three),
                    exit: formatDateTime(material?.out_cold_date_three),
                    receiver: material?.receiver_out_cold_three
                }
            ].filter(entry => entry.enter !== "ไม่มีข้อมูล" || entry.exit !== "ไม่มีข้อมูล" || entry.receiver);
        }
        // สำหรับวัตถุดิบที่สามใช้ฟิลด์ที่มี suffix _three
        else if (index === 2) {
            return [
                {
                    enter: formatDateTime(material?.come_cold_date_three),
                    exit: formatDateTime(material?.out_cold_date_three),
                    receiver: material?.receiver_out_cold_three
                }
            ].filter(entry => entry.enter !== "ไม่มีข้อมูล" || entry.exit !== "ไม่มีข้อมูล" || entry.receiver);
        }
        return [];
    });

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
                {/* ปุ่มควบคุม */}
                <Box sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    width: "100%",
                    justifyContent: "center",
                    gap: "10px",
                    mb: 2,
                    '@media print': { display: 'none' }
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

                {/* หัวข้อเอกสาร - ใบส่งแก้ไข */}
                <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 2,
                    border: "2px solid #000",
                    borderRadius: "8px",
                    overflow: "hidden",
                    '@media print': {
                        border: "1px solid #000",
                        mb: 1
                    }
                }}>
                    {/* หัวข้อ */}
                    <Box sx={{
                        width: "100%",
                        padding: "10px",
                        textAlign: "center",
                        fontSize: "26px",
                        fontWeight: "normal",
                        backgroundColor: "#f8d7da",
                        borderBottom: "1px solid #000",
                        letterSpacing: "0.5px",
                        '@media print': {
                            fontSize: "16px",
                            padding: "4px",
                        }
                    }}>
                        ใบส่งแก้ไข
                    </Box>

                    {/* สถานะ และ หมายเลขรถเข็น */}
                    <Box sx={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        padding: "10px",
                        fontSize: "22px",
                        '@media print': {
                            fontSize: "14px",
                            padding: "4px",
                        }
                    }}>
                        <Box sx={{ width: "50%", textAlign: "left" }}>
                            สถานะ: {status || "รอแก้ไข"}
                        </Box>
                        <Box sx={{ width: "50%", textAlign: "right" }}>
                            รถเข็น: {data.tro_id || "-"}
                        </Box>
                    </Box>
                </Box>


                {/* Correction Notes Section */}
                <Box sx={{
                    mb: 2,
                    p: 1.5,
                    border: "2px dashed #dc3545",
                    borderRadius: "6px",
                    backgroundColor: "#fff8f8",
                    '@media print': {
                        mb: 1,
                        p: 0.8,
                        border: "1px dashed #dc3545",
                    }
                }}>
                    <Typography sx={{
                        color: "#dc3545",
                        fontSize: "24px",
                        fontWeight: "normal",
                        mb: 0.5,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        '@media print': {
                            fontSize: "15px",
                            mb: 0.2
                        }
                    }}>
                        หมายเหตุ-แก้ไข
                    </Typography>
                    <Typography sx={{
                        fontSize: "22px",
                        '@media print': {
                            fontSize: "14px"
                        }
                    }}>
                        {data.remark_pack_edit || "ไม่มีข้อมูล"}
                    </Typography>
                </Box>

                {/* ข้อมูล Production */}
                {materials.length > 0 && (
                    <Box sx={{
                        mb: 3,
                        '@media print': {
                            mb: 1
                        }
                    }}>
                        <Typography variant="h6" sx={{
                            color: "#000",
                            fontSize: "26px",
                            mb: 1,
                            borderBottom: "2px solid #ddd",
                            pb: 0.5,
                            fontWeight: "normal",
                            letterSpacing: "0.5px",
                            '@media print': {
                                fontSize: "16px",
                                pb: 0.2,
                                mb: 0.3,
                                fontWeight: "normal"
                            }
                        }}>
                            รายละเอียดวัตถุดิบ
                        </Typography>

                        {/* แยกวัตถุดิบออกเป็นกลุ่ม */}
                        {(() => {
                            const { mixed, normal } = groupMaterialsByMixCode();
                            const hasMixed = Object.keys(mixed).length > 0;
                            const hasNormal = normal.length > 0;

                            return (
                                <>
                                    {/* วัตถุดิบผสม - แยกตามรหัสการผสม */}
                                    {hasMixed && (
                                        <Box sx={{ mb: 3 }}>
                                            <Typography sx={{
                                                fontSize: '22px',
                                                fontWeight: 'none',
                                                mb: 1,
                                                color: '#1976d2',
                                                borderBottom: '1px dashed #1976d2',
                                                pb: 0.5,
                                                '@media print': {
                                                    fontSize: '14px',
                                                    mb: 0.5,
                                                    pb: 0.2,
                                                    fontWeight: 'none'
                                                }
                                            }}>
                                                วัตถุดิบผสม
                                            </Typography>

                                            {Object.entries(mixed).map(([mixCode, mixedMaterials], groupIndex) => (
                                                <Box key={`mix-${mixCode}`} sx={{
                                                    mt: 2,
                                                    mb: 2,
                                                    p: 1.5,
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    backgroundColor: "#f9f9f9",
                                                    '@media print': {
                                                        mt: 1,
                                                        mb: 1.5,
                                                        p: 0.8,
                                                        borderRadius: '2px'
                                                    }
                                                }}>
                                                    <Typography sx={{
                                                        fontSize: '22px',
                                                        fontWeight: 'none',
                                                        mb: 1,
                                                        color: '#464646',
                                                        borderBottom: '1px dashed #464646',
                                                        pb: 0.5,
                                                        '@media print': {
                                                            fontSize: '14px',
                                                            mb: 0.5,
                                                            pb: 0.2,
                                                            fontWeight: 'none'
                                                        }
                                                    }}>
                                                        รหัสการผสม: {mixCode}
                                                    </Typography>

                                                    {/* รายชื่อวัตถุดิบในกลุ่มนี้ */}
                                                    <Box sx={{
                                                        mb: 1,
                                                        p: 1,
                                                        backgroundColor: "#f0f0f0",
                                                        borderRadius: "4px",
                                                        border: "1px dashed #ccc",
                                                        '@media print': {
                                                            p: 0.5,
                                                            mb: 0.5
                                                        }
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: '20px',
                                                            mb: 0.5,
                                                            '@media print': {
                                                                fontSize: '13px',
                                                                mb: 0.2
                                                            }
                                                        }}>
                                                            วัตถุดิบในกลุ่มนี้:
                                                        </Typography>
                                                        {mixedMaterials.map((material, idx) => (
                                                            <Typography key={idx} sx={{
                                                                ml: 2,
                                                                fontSize: '18px',
                                                                '@media print': {
                                                                    fontSize: '12px',
                                                                    ml: 1
                                                                }
                                                            }}>
                                                                • {material.mat_name || `วัตถุดิบที่ ${idx + 1}`}
                                                                {material.mat && ` (${material.mat})`}
                                                            </Typography>
                                                        ))}
                                                    </Box>

                                                    {/* แสดงรายละเอียดวัตถุดิบแต่ละรายการ */}
                                                    {mixedMaterials.map((material, materialIndex) => (
                                                        <Box key={materialIndex} sx={{
                                                            mb: 2,
                                                            border: "1px solid #eee",
                                                            borderRadius: "4px",
                                                            p: 1,
                                                            backgroundColor: "#fafafa",
                                                            '@media print': {
                                                                mb: 1,
                                                                p: 0.5
                                                            }
                                                        }}>
                                                            {/* แสดงหัวข้อวัตถุดิบ */}
                                                            <Typography sx={{
                                                                fontSize: "22px",
                                                                mb: 0.5,
                                                                mt: 1,
                                                                textDecoration: "underline",
                                                                '@media print': {
                                                                    fontSize: "14px",
                                                                    mb: 0.2,
                                                                    mt: 0.5
                                                                }
                                                            }}>
                                                                วัตถุดิบที่ {materialIndex + 1} คือ {material.mat_name || "ไม่มีข้อมูล"}
                                                            </Typography>

                                                            {/* ข้อมูลพื้นฐานวัตถุดิบ */}
                                                            {material.mat && <InfoRow label="รหัสวัตถุดิบ" value={material.mat} />}
                                                            {material.mat && <InfoRow label="ชื่อวัตถุดิบ" value={material.mat_name} />}
                                                            {material.batch_after && <InfoRow label="Batch" value={material.batch_after} />}
                                                            {material.code && material.doc_no && (
                                                                <InfoRow label="เอกสารอ้างอิง" value={`${material.code}-(${material.doc_no})`} />
                                                            )}
                                                            {material.line_name && <InfoRow label="ไลน์การผลิต" value={material.line_name} />}
                                                            {material.eu_level && <InfoRow label="Level EU" value={material.eu_level} />}

                                                            {material.weight_RM && (
                                                                <InfoRow
                                                                    label="น้ำหนักสุทธิ"
                                                                    value={`${parseFloat(material.weight_RM).toFixed(2)} กิโลกรัม`}
                                                                />
                                                            )}
                                                            <InfoRow label="จุดหมายปลายทาง" value={material.dest || "ไม่มีข้อมูล"} />

                                                            {/* ข้อมูล QC ของวัตถุดิบ */}
                                                            {(material.qccheck || material.mdcheck || material.defectcheck ||
                                                                data.qccheck || data.mdcheck || data.defectcheck || material.WorkAreaCode ||
                                                                material.md_no) && (
                                                                    <Box sx={{
                                                                        mt: 1,
                                                                        p: 1,
                                                                        border: "1px dashed #ccc",
                                                                        borderRadius: "4px",
                                                                        backgroundColor: "#f9f9f9",
                                                                        '@media print': {
                                                                            mt: 0.5,
                                                                            p: 0.5,
                                                                            borderRadius: "2px"
                                                                        }
                                                                    }}>
                                                                        <Typography sx={{
                                                                            fontSize: "20px",
                                                                            mb: 0.5,
                                                                            color: "#555",
                                                                            '@media print': {
                                                                                fontSize: "13px",
                                                                                mb: 0.2
                                                                            }
                                                                        }}>
                                                                            ผลการตรวจสอบคุณภาพ:
                                                                        </Typography>
                                                                        {(material.WorkAreaCode || material.md_no) && <InfoRow label="เครื่อง MD" value={`${material.WorkAreaCode || ''}/${material.md_no || ''}`} indent />}
                                                                        {material.qccheck && <InfoRow label="QC Check" value={material.qccheck} indent />}
                                                                        {material.mdcheck && <InfoRow label="MD Check" value={material.mdcheck} indent />}
                                                                        {material.defectcheck && <InfoRow label="Defect Check" value={material.defectcheck} indent />}

                                                                        {!material.qccheck && data.qccheck && <InfoRow label="QC Check" value={data.qccheck} indent />}
                                                                        {!material.mdcheck && data.mdcheck && <InfoRow label="MD Check" value={data.mdcheck} indent />}
                                                                        {!material.defectcheck && data.defectcheck && <InfoRow label="Defect Check" value={data.defectcheck} indent />}
                                                                    </Box>
                                                                )}

                                                            {/* ข้อมูลเวลา */}
                                                            <Box sx={{
                                                                mt: 1,
                                                                '@media print': {
                                                                    mt: 0.5
                                                                }
                                                            }}>
                                                                <Typography sx={{
                                                                    fontSize: "20px",
                                                                    mb: 0.5,
                                                                    color: "#555",
                                                                    '@media print': {
                                                                        fontSize: "13px",
                                                                        mb: 0.2
                                                                    }
                                                                }}>
                                                                    ข้อมูลเวลา:
                                                                </Typography>
                                                                {material.withdraw_date && <InfoRow label="เวลาเบิกวัตถุดิบจากห้องเย็นใหญ่" value={formatDateTime(material.withdraw_date)} indent />}
                                                                {material.cooked_date && <InfoRow label="เวลาเตรียมเสร็จ" value={formatDateTime(material.cooked_date)} indent />}
                                                            </Box>

                                                            {/* ข้อมูลห้องเย็น */}
                                                            {materialColdStorageData[material.originalIndex !== undefined ? material.originalIndex : materialIndex] &&
                                                                materialColdStorageData[material.originalIndex !== undefined ? material.originalIndex : materialIndex].length > 0 && (
                                                                    <Box sx={{
                                                                        mt: 2,
                                                                        borderTop: "1px dashed #ccc",
                                                                        pt: 1
                                                                    }}>
                                                                        <Typography sx={{
                                                                            color: "#000",
                                                                            fontSize: "22px",
                                                                            mb: 1,
                                                                            fontWeight: "normal",
                                                                            letterSpacing: "0.5px",
                                                                            '@media print': {
                                                                                fontSize: "14px",
                                                                                mb: 0.3,
                                                                                fontWeight: "normal"
                                                                            }
                                                                        }}>
                                                                            วันเวลาเข้า-ออกห้องเย็น
                                                                        </Typography>
                                                                        {materialColdStorageData[material.originalIndex !== undefined ? material.originalIndex : materialIndex].map((entry, entryIndex) => (
                                                                            <Box key={entryIndex} sx={{
                                                                                mb: 1,
                                                                                pl: 2,
                                                                                '@media print': {
                                                                                    mb: 0.5,
                                                                                    pl: 0.5
                                                                                }
                                                                            }}>
                                                                                <Typography variant="h6" sx={{
                                                                                    color: "#464646",
                                                                                    fontSize: "20px",
                                                                                    textDecoration: "underline",
                                                                                    '@media print': {
                                                                                        fontSize: "13px",
                                                                                        fontWeight: "normal"
                                                                                    }
                                                                                }}>
                                                                                    ครั้งที่ {entryIndex + 1}
                                                                                </Typography>
                                                                                {entry.enter && entry.enter !== "ไม่มีข้อมูล" && <InfoRow label="เวลาเข้า" value={entry.enter} indent />}
                                                                                {entry.exit && entry.exit !== "ไม่มีข้อมูล" && <InfoRow label="เวลาออก" value={entry.exit} indent />}
                                                                                {entry.receiver && <InfoRow label="ผู้รับ" value={entry.receiver} indent />}
                                                                            </Box>
                                                                        ))}
                                                                    </Box>
                                                                )}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ))}
                                        </Box>
                                    )}

                                    {/* วัตถุดิบปกติ - ไม่มีรหัสการผสม */}
                                    {hasNormal && (
                                        <Box sx={{ mt: hasMixed ? 2 : 0 }}>
                                            {hasMixed && (
                                                <Typography sx={{
                                                    fontSize: '22px',
                                                    fontWeight: 'none',
                                                    mb: 1,
                                                    color: '#1976d2',
                                                    borderBottom: '1px dashed #1976d2',
                                                    pb: 0.5,
                                                    '@media print': {
                                                        fontSize: '14px',
                                                        mb: 0.5,
                                                        pb: 0.2,
                                                        fontWeight: 'none'
                                                    }
                                                }}>
                                                    วัตถุดิบทั่วไป
                                                </Typography>
                                            )}

                                            {/* แสดงรายการวัตถุดิบปกติ */}
                                            {normal.map((material, index) => (
                                                <Box key={index} sx={{
                                                    mb: 2,
                                                    border: "1px solid #eee",
                                                    borderRadius: "4px",
                                                    p: 1,
                                                    backgroundColor: "#fafafa",
                                                    '@media print': {
                                                        mb: 1,
                                                        p: 0.5
                                                    }
                                                }}>
                                                    {/* แสดงหัวข้อวัตถุดิบ */}
                                                    <Typography sx={{
                                                        fontSize: "22px",
                                                        mb: 0.5,
                                                        mt: 1,
                                                        textDecoration: "underline",
                                                        '@media print': {
                                                            fontSize: "14px",
                                                            mb: 0.2,
                                                            mt: 0.5
                                                        }
                                                    }}>
                                                        วัตถุดิบ {index + 1} คือ {material.mat_name || "ไม่มีข้อมูล"}
                                                    </Typography>

                                                    {/* ข้อมูลพื้นฐานวัตถุดิบ */}
                                                    {material.mat && <InfoRow label="รหัสวัตถุดิบ" value={material.mat} />}
                                                    {material.mat && <InfoRow label="ชื่อวัตถุดิบ" value={material.mat_name} />}
                                                    {material.batch_after && <InfoRow label="Batch" value={material.batch_after} />}
                                                    {material.code && material.doc_no && (
                                                        <InfoRow label="เอกสารอ้างอิง" value={`${material.code}-(${material.doc_no})`} />
                                                    )}
                                                    {material.line_name && <InfoRow label="ไลน์การผลิต" value={material.line_name} />}
                                                    {material.eu_level && <InfoRow label="Level EU" value={material.eu_level} />}

                                                    {/* แสดงข้อมูลรหัสการผสม (mix_code) หากมี แต่ไม่อยู่ในกลุ่มผสม */}
                                                    {material.mix_code && (
                                                        <Box sx={{
                                                            mt: 1,
                                                            p: 1,
                                                            border: '1px dashed #ccc',
                                                            borderRadius: '4px',
                                                            backgroundColor: '#f5f5f5',
                                                            '@media print': {
                                                                mt: 0.5,
                                                                p: 0.5,
                                                                borderRadius: '2px'
                                                            }
                                                        }}>
                                                            <InfoRow label="รหัสการผสม" value={material.mix_code} indent />
                                                        </Box>
                                                    )}

                                                    {material.weight_RM && (
                                                        <InfoRow
                                                            label="น้ำหนักสุทธิ"
                                                            value={`${parseFloat(material.weight_RM).toFixed(2)} กิโลกรัม`}
                                                        />
                                                    )}
                                                    <InfoRow label="จุดหมายปลายทาง" value={material.dest || "ไม่มีข้อมูล"} />

                                                    {/* ข้อมูล QC ของวัตถุดิบ */}
                                                    {(material.qccheck || material.mdcheck || material.defectcheck ||
                                                        data.qccheck || data.mdcheck || data.defectcheck || material.WorkAreaCode ||
                                                        material.md_no) && (
                                                            <Box sx={{
                                                                mt: 1,
                                                                p: 1,
                                                                border: "1px dashed #ccc",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#f9f9f9",
                                                                '@media print': {
                                                                    mt: 0.5,
                                                                    p: 0.5,
                                                                    borderRadius: "2px"
                                                                }
                                                            }}>
                                                                <Typography sx={{
                                                                    fontSize: "20px",
                                                                    mb: 0.5,
                                                                    color: "#555",
                                                                    '@media print': {
                                                                        fontSize: "13px",
                                                                        mb: 0.2
                                                                    }
                                                                }}>
                                                                    ผลการตรวจสอบคุณภาพ:
                                                                </Typography>
                                                                {(material.WorkAreaCode || material.md_no) && <InfoRow label="เครื่อง MD" value={`${material.WorkAreaCode || ''}/${material.md_no || ''}`} indent />}
                                                                {material.qccheck && <InfoRow label="QC Check" value={material.qccheck} indent />}
                                                                {material.mdcheck && <InfoRow label="MD Check" value={material.mdcheck} indent />}
                                                                {material.defectcheck && <InfoRow label="Defect Check" value={material.defectcheck} indent />}

                                                                {!material.qccheck && data.qccheck && <InfoRow label="QC Check" value={data.qccheck} indent />}
                                                                {!material.mdcheck && data.mdcheck && <InfoRow label="MD Check" value={data.mdcheck} indent />}
                                                                {!material.defectcheck && data.defectcheck && <InfoRow label="Defect Check" value={data.defectcheck} indent />}
                                                            </Box>
                                                        )}

                                                    {/* ข้อมูลเวลา */}
                                                    <Box sx={{
                                                        mt: 1,
                                                        '@media print': {
                                                            mt: 0.5
                                                        }
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: "20px",
                                                            mb: 0.5,
                                                            color: "#555",
                                                            '@media print': {
                                                                fontSize: "13px",
                                                                mb: 0.2
                                                            }
                                                        }}>
                                                            ข้อมูลเวลา:
                                                        </Typography>
                                                        {material.withdraw_date && <InfoRow label="เวลาเบิกวัตถุดิบจากห้องเย็นใหญ่" value={formatDateTime(material.withdraw_date)} indent />}
                                                        {material.cooked_date && <InfoRow label="เวลาเตรียม" value={formatDateTime(material.cooked_date)} indent />}
                                                    </Box>

                                                    {/* ข้อมูลห้องเย็น */}
                                                    {materialColdStorageData[material.originalIndex !== undefined ? material.originalIndex : index] &&
                                                        materialColdStorageData[material.originalIndex !== undefined ? material.originalIndex : index].length > 0 && (
                                                            <Box sx={{
                                                                mt: 2,
                                                                borderTop: "1px dashed #ccc",
                                                                pt: 1
                                                            }}>
                                                                <Typography sx={{
                                                                    color: "#000",
                                                                    fontSize: "22px",
                                                                    mb: 1,
                                                                    fontWeight: "normal",
                                                                    letterSpacing: "0.5px",
                                                                    '@media print': {
                                                                        fontSize: "14px",
                                                                        mb: 0.3,
                                                                        fontWeight: "normal"
                                                                    }
                                                                }}>
                                                                    วันเวลาเข้า-ออกห้องเย็น
                                                                </Typography>
                                                                {materialColdStorageData[material.originalIndex !== undefined ? material.originalIndex : index].map((entry, entryIndex) => (
                                                                    <Box key={entryIndex} sx={{
                                                                        mb: 1,
                                                                        pl: 2,
                                                                        '@media print': {
                                                                            mb: 0.5,
                                                                            pl: 0.5
                                                                        }
                                                                    }}>
                                                                        <Typography variant="h6" sx={{
                                                                            color: "#464646",
                                                                            fontSize: "20px",
                                                                            textDecoration: "underline",
                                                                            '@media print': {
                                                                                fontSize: "13px",
                                                                                fontWeight: "normal"
                                                                            }
                                                                        }}>
                                                                            ครั้งที่ {entryIndex + 1}
                                                                        </Typography>
                                                                        {entry.enter && entry.enter !== "ไม่มีข้อมูล" && <InfoRow label="เวลาเข้า" value={entry.enter} indent />}
                                                                        {entry.exit && entry.exit !== "ไม่มีข้อมูล" && <InfoRow label="เวลาออก" value={entry.exit} indent />}
                                                                        {entry.receiver && <InfoRow label="ผู้รับ" value={entry.receiver} indent />}
                                                                    </Box>
                                                                ))}
                                                            </Box>
                                                        )}
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </>
                            );
                        })()}
                    </Box>
                )}

                {/* ผู้รับผิดชอบ */}
                <Box sx={{
                    mb: 3,
                    '@media print': {
                        mb: 1
                    }
                }}>
                    <Typography variant="h6" sx={{
                        color: "#000",
                        fontSize: "26px",
                        mb: 1,
                        borderBottom: "2px solid #ddd",
                        pb: 0.5,
                        fontWeight: "normal",
                        letterSpacing: "0.5px",
                        '@media print': {
                            fontSize: "16px",
                            pb: 0.2,
                            mb: 0.3,
                            fontWeight: "normal"
                        }
                    }}>
                        ผู้รับผิดชอบ
                    </Typography>
                    {data.receiver_pack_edit && <InfoRow label="ผู้ส่งแก้ไข" value={data.receiver_pack_edit} highlight={true} />}
                    {data.receiver && <InfoRow label="ผู้รับ" value={data.receiver} />}
                    {data.receiver_qc && <InfoRow label="QC" value={data.receiver_qc} />}
                    {data.receiver_prep_two && <InfoRow label="เจ้าหน้าที่เตรียม" value={data.receiver_prep_two} />}
                </Box>

                {/* ข้อมูลเพิ่มเติม */}
                <Box>
                    <Typography variant="h6" sx={{
                        color: "#000",
                        fontSize: "26px",
                        mt: 2,
                        mb: 1,
                        borderBottom: "2px solid #ddd",
                        pb: 0.5,
                        fontWeight: "normal",
                        letterSpacing: "0.5px",
                        '@media print': {
                            fontSize: "16px",
                            fontWeight: "normal",
                            mt: 0.5,
                            pb: 0.2,
                            mb: 0.3
                        }
                    }}>
                        ข้อมูลเพิ่มเติม
                    </Typography>
                    <InfoRow label="พิมพ์เมื่อ" value={new Date().toLocaleString('en-TH')} />
                </Box>
            </Box>
        </Dialog>
    );
};

const InfoRow = ({ label, value, indent = false, highlight = false }) => {
    if (!value) return null;

    return (
        <Box sx={{
            display: "flex",
            alignItems: "baseline",
            ml: indent ? 2 : 0,
            mb: 0.5,
            backgroundColor: highlight ? "#fff8f8" : "transparent",
            p: highlight ? 0.5 : 0,
            borderRadius: highlight ? 1 : 0,
            ...(highlight && { border: "1px solid #ffcccc" }),
            '@media print': {
                ml: indent ? 0.5 : 0,
                mb: 0.2,
                p: highlight ? 0.3 : 0,
            }
        }}>
            <Typography sx={{
                color: highlight ? "#cc0000" : "#464646",
                fontSize: "20px",
                minWidth: "120px",
                fontWeight: "normal",
                fontStyle: highlight ? "italic" : "normal",
                '@media print': {
                    fontSize: "12px",
                    minWidth: "65px",
                    fontWeight: "normal"
                }
            }}>
                {label}:
            </Typography>
            <Typography sx={{
                color: highlight ? "#cc0000" : "#464646",
                fontSize: "20px",
                flex: 1,
                fontWeight: "normal",
                letterSpacing: highlight ? "0.3px" : "normal",
                '@media print': {
                    fontSize: "12px"
                }
            }}>
                {value}
            </Typography>
        </Box>
    );
};

export default EditPrinter;