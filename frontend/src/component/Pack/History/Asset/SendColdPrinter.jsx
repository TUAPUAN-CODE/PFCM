import React, { useEffect } from 'react';
import { Box, Button, Typography, Dialog } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import AcUnitIcon from '@mui/icons-material/AcUnit';

const SendColdPrinter = ({ open, onClose, data, status }) => {
    console.log("SendColdPrinter data:", data);
    if (!data) return null;

    // Moved formatDateTime function to the top level so it's defined before use
    const formatDateTime = (dateString) => {
        if (!dateString) return "ไม่มีข้อมูล";

        try {
            // กรณีที่เป็นสตริงที่ไม่ใช่วันที่หรือมีรูปแบบไม่ถูกต้อง
            if (dateString === "แสดงข้อมูล") {
                return dateString;
            }

            // แปลงวันที่ที่รับเข้ามาเป็น Date object
            const date = new Date(dateString);

            // ตรวจสอบว่าวันที่ถูกต้องหรือไม่
            if (isNaN(date.getTime())) {
                console.warn("Invalid date format:", dateString);
                return dateString; // ส่งค่าเดิมกลับไปแทนที่จะบอกว่าผิดรูปแบบ
            }

            // สร้าง formatter สำหรับวันที่แบบไทย
            const options = {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };

            // แปลงเป็นรูปแบบของประเทศไทย
            return new Intl.DateTimeFormat('th-TH', options).format(date);
        } catch (error) {
            console.error("Error formatting date:", error, "for input:", dateString);
            return dateString; // ส่งค่าเดิมกลับไปเพื่อไม่ให้ข้อมูลหายไป
        }
    };

    useEffect(() => {
        const handleAfterPrint = () => {
            onClose();
        };
        window.addEventListener("afterprint", handleAfterPrint);

        // ป้องกันการแสดง URL และปรับขนาดหน้ากระดาษ
        const originalOnBeforeprint = window.onbeforeprint;
        window.onbeforeprint = function () {
            if (originalOnBeforeprint) originalOnBeforeprint();

            // ซ่อน URL ด้านล่าง และกำหนดขนาดกระดาษเป็น 80mm
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

    // QC data entries - overall QC checks
    const qcEntries = [
        {
            inspector: data?.qc_inspector,
            date: formatDateTime(data?.qc_date),
            status: data?.qc_status,
            remarks: data?.qc_remarks
        },
        {
            inspector: data?.qc_inspector_two,
            date: formatDateTime(data?.qc_date_two),
            status: data?.qc_status_two,
            remarks: data?.qc_remarks_two
        },
        {
            inspector: data?.qc_inspector_three,
            date: formatDateTime(data?.qc_date_three),
            status: data?.qc_status_three,
            remarks: data?.qc_remarks_three
        }
    ].filter(entry => entry.inspector || (entry.date !== "ไม่มีข้อมูล") || entry.status || entry.remarks);

    // Check if data exists before accessing its properties
    // Also ensure materials is always an array
    const materials = data ? (
        Array.isArray(data.materials) ? data.materials :
            (data.mat_name ? [data] : [])
    ) : [];

    // เพิ่มข้อมูลห้องเย็นเข้าไปในข้อมูลวัตถุดิบแต่ละชิ้น
    const materialsWithColdStorage = materials.map((material, index) => {
        // แบ่งข้อมูลห้องเย็นตามวัตถุดิบ (ถ้ามีหลายชิ้น) หรือใช้ข้อมูลจาก data หลัก
        let coldStorageData = {};

        // ใช้ข้อมูลห้องเย็นตามวัตถุดิบหรือข้อมูลหลัก
        // ตรวจสอบว่ามีข้อมูลห้องเย็นเฉพาะของวัตถุดิบนี้หรือไม่
        if (material.come_cold_date || material.out_cold_date || material.receiver_out_cold) {
            coldStorageData = {
                entries: [
                    {
                        enter: formatDateTime(material.come_cold_date),
                        exit: formatDateTime(material.out_cold_date),
                        receiver: material.receiver_out_cold
                    },
                    {
                        enter: formatDateTime(material.come_cold_date_two),
                        exit: formatDateTime(material.out_cold_date_two),
                        receiver: material.receiver_out_cold_two
                    },
                    {
                        enter: formatDateTime(material.come_cold_date_three),
                        exit: formatDateTime(material.out_cold_date_three),
                        receiver: material.receiver_out_cold_three
                    }
                ].filter(entry => entry.enter !== "ไม่มีข้อมูล" || entry.exit !== "ไม่มีข้อมูล" || entry.receiver)
            };
        } else {
            // ถ้าวัตถุดิบไม่มีข้อมูลห้องเย็นเป็นของตัวเอง ให้ใช้ข้อมูลหลัก (ถ้าเป็นวัตถุดิบชิ้นแรก)
            if (index === 0) {
                coldStorageData = {
                    entries: [
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
                    ].filter(entry => entry.enter !== "ไม่มีข้อมูล" || entry.exit !== "ไม่มีข้อมูล" || entry.receiver)
                };
            } else {
                coldStorageData = { entries: [] }; // วัตถุดิบชิ้นอื่นๆ ไม่มีข้อมูลห้องเย็น
            }
        }

        // เพิ่มข้อมูลห้องเย็นเข้าไปในวัตถุดิบ
        return {
            ...material,
            coldStorage: coldStorageData
        };
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

                {/* หัวข้อเอกสาร */}
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
                    <Box sx={{
                        width: "100%",
                        padding: "10px",
                        textAlign: "center",
                        fontSize: "26px",
                        fontWeight: "normal",
                        backgroundColor: "#d1ecf1", // สีฟ้าอ่อนสำหรับสลิปห้องเย็น
                        borderBottom: "1px solid #000",
                        letterSpacing: "0.5px",
                        '@media print': {
                            fontSize: "16px",
                            padding: "4px",
                        }
                    }}>
                        <AcUnitIcon sx={{
                            verticalAlign: 'middle',
                            mr: 1,
                            '@media print': {
                                fontSize: '14px'
                            }
                        }} />
                        ใบส่งห้องเย็น
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
                        {data.remark_pack_edit ? "หมายเหตุ-แก้ไข" : "หมายเหตุ"}
                    </Typography>
                    <Typography sx={{
                        fontSize: "22px",
                        '@media print': {
                            fontSize: "14px"
                        }
                    }}>
                        {data.remark_pack_edit || "เหลือจากไลน์การผลิต"}
                    </Typography>
                </Box>

                {/* ข้อมูลวัตถุดิบ */}
                {materialsWithColdStorage.length > 0 && (
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

                        {/* แยกวัตถุดิบตามรหัสการผสม */}
                        {(() => {
                            // ฟังก์ชันสำหรับจัดกลุ่มวัตถุดิบตามรหัสการผสม
                            const groupByMixCode = () => {
                                if (!materialsWithColdStorage || materialsWithColdStorage.length === 0) return { mixed: {}, normal: [] };

                                // แยกวัตถุดิบเป็น 2 กลุ่ม: มีรหัสการผสม และไม่มีรหัสการผสม
                                const mixed = {}; // วัตถุดิบที่มีรหัสการผสม จัดกลุ่มตามรหัส
                                const normal = []; // วัตถุดิบปกติที่ไม่มีรหัสการผสม

                                materialsWithColdStorage.forEach((material, index) => {
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

                            const { mixed, normal } = groupByMixCode();
                            const hasMixed = Object.keys(mixed).length > 0;
                            const hasNormal = normal.length > 0;

                            return (
                                <>
                                    {/* วัตถุดิบผสม - แยกตามรหัสการผสม */}
                                    {hasMixed && (
                                        <>
                                            {Object.entries(mixed).map(([mixCode, mixedMaterials], groupIndex) => (
                                                <Box key={`mix-${mixCode}`} sx={{
                                                    mt: 2,
                                                    mb: 3,
                                                    p: 1.5,
                                                    border: '2px solid #2388d1',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#f0f7ff',
                                                    '@media print': {
                                                        mt: 1,
                                                        mb: 1.5,
                                                        p: 0.8,
                                                        borderRadius: '4px',
                                                        border: '1px solid #2388d1'
                                                    }
                                                }}>
                                                    <Typography sx={{
                                                        fontSize: '24px',
                                                        fontWeight: 'normal',
                                                        mb: 1,
                                                        color: '#0c5460',
                                                        borderBottom: '1px dashed #2388d1',
                                                        pb: 0.5,
                                                        '@media print': {
                                                            fontSize: '15px',
                                                            mb: 0.5,
                                                            pb: 0.2
                                                        }
                                                    }}>
                                                        รหัสการผสม: {mixCode}
                                                    </Typography>

                                                    <Typography sx={{
                                                        fontSize: '20px',
                                                        mb: 1,
                                                        fontStyle: 'italic',
                                                        color: '#464646',
                                                        '@media print': {
                                                            fontSize: '13px',
                                                            mb: 0.5
                                                        }
                                                    }}>
                                                        ประกอบด้วยวัตถุดิบ {mixedMaterials.length} รายการ
                                                    </Typography>

                                                    {/* แสดงวัตถุดิบที่มีรหัสผสมเดียวกัน */}
                                                    {mixedMaterials.map((material, materialIndex) => (
                                                        <Box key={materialIndex} sx={{
                                                            mb: 2,
                                                            border: "1px solid #ccc",
                                                            borderRadius: "8px",
                                                            p: 2,
                                                            backgroundColor: "#fff",
                                                            '@media print': {
                                                                mb: 1,
                                                                p: 1,
                                                                borderRadius: "4px"
                                                            }
                                                        }}>
                                                            {/* หัวข้อวัตถุดิบย่อย */}
                                                            <Typography sx={{
                                                                fontSize: "22px",
                                                                mb: 1,
                                                                fontWeight: "none",
                                                                backgroundColor: "#e8f4f8",
                                                                p: 1,
                                                                borderRadius: "4px",
                                                                '@media print': {
                                                                    fontSize: "14px",
                                                                    mb: 0.5,
                                                                    p: 0.5
                                                                }
                                                            }}>
                                                                วัตถุดิบที่ {materialIndex + 1}: {material.mat_name || "ไม่มีข้อมูล"}
                                                            </Typography>

                                                            {/* ข้อมูลพื้นฐานของวัตถุดิบ */}
                                                            <Box sx={{ mb: 2 }}>
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
                                                                        highlight={true}
                                                                    />
                                                                )}
                                                                <InfoRow label="จุดหมายปลายทาง" value={material.dest || "ห้องเย็น"} highlight={true} />
                                                            </Box>

                                                            {/* ข้อมูลเวลา */}
                                                            <Box sx={{
                                                                mt: 1,
                                                                mb: 2,
                                                                '@media print': {
                                                                    mt: 0.5,
                                                                    mb: 1
                                                                }
                                                            }}>
                                                                <Typography sx={{
                                                                    fontSize: "20px",
                                                                    mb: 0.5,
                                                                    fontWeight: "none",
                                                                    color: "#464646",
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

                                                            {/* ข้อมูล QC ของวัตถุดิบ */}
                                                            {(material.qccheck || material.mdcheck || material.defectcheck ||
                                                                data.qccheck || data.mdcheck || data.defectcheck || material.WorkAreaCode ||
                                                                material.md_no) && (
                                                                    <Box sx={{
                                                                        mt: 1,
                                                                        mb: 2,
                                                                        p: 1,
                                                                        border: "1px dashed #ccc",
                                                                        borderRadius: "4px",
                                                                        backgroundColor: "#f9f9f9",
                                                                        '@media print': {
                                                                            mt: 0.5,
                                                                            mb: 1,
                                                                            p: 0.5,
                                                                            borderRadius: "2px"
                                                                        }
                                                                    }}>
                                                                        <Typography sx={{
                                                                            fontSize: "20px",
                                                                            mb: 0.5,
                                                                            fontWeight: "none",
                                                                            color: "#464646",
                                                                            '@media print': {
                                                                                fontSize: "13px",
                                                                                mb: 0.2
                                                                            }
                                                                        }}>
                                                                            ผลการตรวจสอบคุณภาพ:
                                                                        </Typography>
                                                                        {/* ค่า QC จากวัตถุดิบ */}
                                                                        {(material.WorkAreaCode || material.md_no) && <InfoRow label="เครื่อง MD" value={`${material.WorkAreaCode || ''}/${material.md_no || ''}`} indent />}
                                                                        {material.qccheck && <InfoRow label="QC Check" value={material.qccheck} indent />}
                                                                        {material.mdcheck && <InfoRow label="MD Check" value={material.mdcheck} indent />}
                                                                        {material.defectcheck && <InfoRow label="Defect Check" value={material.defectcheck} indent />}

                                                                        {/* ค่า QC จาก data หลัก */}
                                                                        {!material.qccheck && data.qccheck && <InfoRow label="QC Check" value={data.qccheck} indent />}
                                                                        {!material.mdcheck && data.mdcheck && <InfoRow label="MD Check" value={data.mdcheck} indent />}
                                                                        {!material.defectcheck && data.defectcheck && <InfoRow label="Defect Check" value={data.defectcheck} indent />}
                                                                    </Box>
                                                                )}

                                                            {/* ข้อมูลห้องเย็นเฉพาะของวัตถุดิบนี้ */}
                                                            <Box sx={{ mb: 2 }}>
                                                                <Typography sx={{
                                                                    fontSize: "20px",
                                                                    mb: 0.5,
                                                                    fontWeight: "none",
                                                                    color: "#0c5460",
                                                                    backgroundColor: "#d1ecf1",
                                                                    p: 1,
                                                                    borderRadius: "4px",
                                                                    '@media print': {
                                                                        fontSize: "13px",
                                                                        mb: 0.2,
                                                                        p: 0.5
                                                                    }
                                                                }}>
                                                                    <AcUnitIcon sx={{
                                                                        verticalAlign: 'middle',
                                                                        mr: 0.5,
                                                                        fontSize: "18px",
                                                                        '@media print': {
                                                                            fontSize: '12px'
                                                                        }
                                                                    }} />
                                                                    สถานะห้องเย็น
                                                                </Typography>

                                                                {material.coldStorage.entries.length > 0 ? (
                                                                    material.coldStorage.entries.map((entry, idx) => (
                                                                        <Box key={idx} sx={{
                                                                            mb: 1,
                                                                            pl: 2,
                                                                            '@media print': {
                                                                                mb: 0.5,
                                                                                pl: 0.5
                                                                            }
                                                                        }}>
                                                                            {material.coldStorage.entries.length > 1 && (
                                                                                <Typography sx={{
                                                                                    color: "#0c5460",
                                                                                    fontSize: "18px",
                                                                                    textDecoration: "underline",
                                                                                    '@media print': {
                                                                                        fontSize: "12px"
                                                                                    }
                                                                                }}>
                                                                                    ครั้งที่ {idx + 1}
                                                                                </Typography>
                                                                            )}
                                                                            {entry.enter && entry.enter !== "ไม่มีข้อมูล" &&
                                                                                <InfoRow label="เวลาเข้า" value={entry.enter} indent />
                                                                            }
                                                                            {entry.exit && entry.exit !== "ไม่มีข้อมูล" &&
                                                                                <InfoRow label="เวลาออก" value={entry.exit} indent />
                                                                            }
                                                                            {entry.receiver && <InfoRow label="ผู้รับ" value={entry.receiver} indent />}
                                                                        </Box>
                                                                    ))
                                                                ) : (
                                                                    <Box sx={{
                                                                        p: 1,
                                                                        border: "1px dashed #dc3545",
                                                                        borderRadius: "4px",
                                                                        backgroundColor: "#fff8f8",
                                                                        '@media print': {
                                                                            p: 0.5
                                                                        }
                                                                    }}>
                                                                        <Typography sx={{
                                                                            color: "#dc3545",
                                                                            fontSize: "18px",
                                                                            '@media print': {
                                                                                fontSize: "12px"
                                                                            }
                                                                        }}>
                                                                            ไม่มีข้อมูลห้องเย็น เนื่องจากไม่ผ่านห้องเย็น
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ))}
                                        </>
                                    )}

                                    {/* วัตถุดิบปกติ - ไม่มีรหัสการผสม */}
                                    {hasNormal && (
                                        <>
                                            {hasMixed && (
                                                <Typography sx={{
                                                    fontSize: '24px',
                                                    fontWeight: 'normal',
                                                    mt: 3,
                                                    mb: 2,
                                                    color: '#464646',
                                                    borderBottom: '2px solid #ddd',
                                                    pb: 0.5,
                                                    '@media print': {
                                                        fontSize: '15px',
                                                        mt: 1.5,
                                                        mb: 1,
                                                        pb: 0.2
                                                    }
                                                }}>
                                                    วัตถุดิบทั่วไป
                                                </Typography>
                                            )}

                                            {normal.map((material, index) => (
                                                <Box key={index} sx={{
                                                    mb: 3,
                                                    border: "1px solid #ccc",
                                                    borderRadius: "8px",
                                                    p: 2,
                                                    '@media print': {
                                                        mb: 1,
                                                        p: 1,
                                                        borderRadius: "4px"
                                                    }
                                                }}>
                                                    {/* แสดงหัวข้อ "วัตถุดิบ 1", "วัตถุดิบ 2" เฉพาะเมื่อมีวัตถุดิบหลายรายการ */}
                                                    <Typography sx={{
                                                        fontSize: "24px",
                                                        mb: 1,
                                                        fontWeight: "none",
                                                        backgroundColor: "#f8f9fa",
                                                        p: 1,
                                                        borderRadius: "4px",
                                                        '@media print': {
                                                            fontSize: "15px",
                                                            mb: 0.5,
                                                            p: 0.5
                                                        }
                                                    }}>
                                                        {normal.length > 1
                                                            ? `วัตถุดิบ ${index + 1}: ${material.mat_name || "ไม่มีข้อมูล"}`
                                                            : `${material.mat_name || "ไม่มีข้อมูล"}`
                                                        }
                                                    </Typography>

                                                    {/* ข้อมูลพื้นฐานของวัตถุดิบ */}
                                                    <Box sx={{ mb: 2 }}>
                                                        {material.mat && <InfoRow label="รหัสวัตถุดิบ" value={material.mat} />}
                                                        {material.mat && <InfoRow label="ชื่อวัตถุดิบ" value={material.mat_name} />}
                                                        {material.batch_after && <InfoRow label="Batch" value={material.batch_after} />}
                                                        {material.code && material.doc_no && (
                                                            <InfoRow label="เอกสารอ้างอิง" value={`${material.code}-(${material.doc_no})`} />
                                                        )}
                                                        {material.line_name && <InfoRow label="ไลน์การผลิต" value={material.line_name} />}
                                                        {material.eu_level && <InfoRow label="Level EU" value={material.eu_level} />}
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
                                                                highlight={true}
                                                            />
                                                        )}
                                                        <InfoRow label="จุดหมายปลายทาง" value={material.dest || "ห้องเย็น"} highlight={true} />
                                                    </Box>

                                                    {/* ข้อมูลเวลา */}
                                                    <Box sx={{
                                                        mt: 1,
                                                        mb: 2,
                                                        '@media print': {
                                                            mt: 0.5,
                                                            mb: 1
                                                        }
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: "20px",
                                                            mb: 0.5,
                                                            fontWeight: "none",
                                                            color: "#464646",
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

                                                    {/* ข้อมูล QC ของวัตถุดิบ */}
                                                    {(material.qccheck || material.mdcheck || material.defectcheck ||
                                                        data.qccheck || data.mdcheck || data.defectcheck || material.WorkAreaCode ||
                                                        material.md_no) && (
                                                            <Box sx={{
                                                                mt: 1,
                                                                mb: 2,
                                                                p: 1,
                                                                border: "1px dashed #ccc",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#f9f9f9",
                                                                '@media print': {
                                                                    mt: 0.5,
                                                                    mb: 1,
                                                                    p: 0.5,
                                                                    borderRadius: "2px"
                                                                }
                                                            }}>
                                                                <Typography sx={{
                                                                    fontSize: "20px",
                                                                    mb: 0.5,
                                                                    fontWeight: "none",
                                                                    color: "#464646",
                                                                    '@media print': {
                                                                        fontSize: "13px",
                                                                        mb: 0.2
                                                                    }
                                                                }}>
                                                                    ผลการตรวจสอบคุณภาพ:
                                                                </Typography>
                                                                {/* ค่า QC จากวัตถุดิบ */}
                                                                {(material.WorkAreaCode || material.md_no) && <InfoRow label="เครื่อง MD" value={`${material.WorkAreaCode || ''}/${material.md_no || ''}`} indent />}
                                                                {material.qccheck && <InfoRow label="QC Check" value={material.qccheck} indent />}
                                                                {material.mdcheck && <InfoRow label="MD Check" value={material.mdcheck} indent />}
                                                                {material.defectcheck && <InfoRow label="Defect Check" value={material.defectcheck} indent />}

                                                                {/* ค่า QC จาก data หลัก */}
                                                                {!material.qccheck && data.qccheck && <InfoRow label="QC Check" value={data.qccheck} indent />}
                                                                {!material.mdcheck && data.mdcheck && <InfoRow label="MD Check" value={data.mdcheck} indent />}
                                                                {!material.defectcheck && data.defectcheck && <InfoRow label="Defect Check" value={data.defectcheck} indent />}
                                                            </Box>
                                                        )}

                                                    {/* ข้อมูลห้องเย็นเฉพาะของวัตถุดิบนี้ */}
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography sx={{
                                                            fontSize: "20px",
                                                            mb: 0.5,
                                                            fontWeight: "none",
                                                            color: "#0c5460",
                                                            backgroundColor: "#d1ecf1",
                                                            p: 1,
                                                            borderRadius: "4px",
                                                            '@media print': {
                                                                fontSize: "13px",
                                                                mb: 0.2,
                                                                p: 0.5
                                                            }
                                                        }}>
                                                            <AcUnitIcon sx={{
                                                                verticalAlign: 'middle',
                                                                mr: 0.5,
                                                                fontSize: "18px",
                                                                '@media print': {
                                                                    fontSize: '12px'
                                                                }
                                                            }} />
                                                            สถานะห้องเย็น
                                                        </Typography>

                                                        {material.coldStorage.entries.length > 0 ? (
                                                            material.coldStorage.entries.map((entry, idx) => (
                                                                <Box key={idx} sx={{
                                                                    mb: 1,
                                                                    pl: 2,
                                                                    '@media print': {
                                                                        mb: 0.5,
                                                                        pl: 0.5
                                                                    }
                                                                }}>
                                                                    {material.coldStorage.entries.length > 1 && (
                                                                        <Typography sx={{
                                                                            color: "#0c5460",
                                                                            fontSize: "18px",
                                                                            textDecoration: "underline",
                                                                            '@media print': {
                                                                                fontSize: "12px"
                                                                            }
                                                                        }}>
                                                                            ครั้งที่ {idx + 1}
                                                                        </Typography>
                                                                    )}
                                                                    {entry.enter && entry.enter !== "ไม่มีข้อมูล" &&
                                                                        <InfoRow label="เวลาเข้า" value={entry.enter} indent />
                                                                    }
                                                                    {entry.exit && entry.exit !== "ไม่มีข้อมูล" &&
                                                                        <InfoRow label="เวลาออก" value={entry.exit} indent />
                                                                    }
                                                                    {entry.receiver && <InfoRow label="ผู้รับ" value={entry.receiver} indent />}
                                                                </Box>
                                                            ))
                                                        ) : (
                                                            <Box sx={{
                                                                p: 1,
                                                                border: "1px dashed #dc3545",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#fff8f8",
                                                                '@media print': {
                                                                    p: 0.5
                                                                }
                                                            }}>
                                                                <Typography sx={{
                                                                    color: "#dc3545",
                                                                    fontSize: "18px",
                                                                    '@media print': {
                                                                        fontSize: "12px"
                                                                    }
                                                                }}>
                                                                    ไม่มีข้อมูลห้องเย็น เนื่องจากไม่ผ่านห้องเย็น
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </Box>
                                            ))}
                                        </>
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
                    {data.sender_cold && <InfoRow label="ผู้ส่งห้องเย็น" value={data.sender_cold} highlight={true} />}
                    {data.receiver_cold && <InfoRow label="ผู้รับห้องเย็น" value={data.receiver_cold} />}
                    {data.receiver_qc && <InfoRow label="QC" value={data.receiver_qc} />}
                    {data.receiver_pack_edit && <InfoRow label="ผู้ส่งแก้ไข" value={data.receiver_pack_edit} />}
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
                    {data.remark && <InfoRow label="หมายเหตุ" value={data.remark} />}
                </Box>

            </Box>
        </Dialog>
    );
};

// คอมโพเนนต์ย่อยสำหรับแสดงข้อมูลแต่ละแถว
const InfoRow = ({ label, value, indent = false, highlight = false }) => {
    if (!value) return null;

    return (
        <Box sx={{
            display: "flex",
            alignItems: "baseline",
            ml: indent ? 2 : 0,
            mb: 0.5,
            backgroundColor: highlight ? "#e8f4f8" : "transparent",
            p: highlight ? 0.5 : 0,
            borderRadius: highlight ? 1 : 0,
            ...(highlight && { border: "1px solid #bee5eb" }),
            '@media print': {
                ml: indent ? 0.5 : 0,
                mb: 0.2,
                p: highlight ? 0.3 : 0,
            }
        }}>
            <Typography sx={{
                color: highlight ? "#0c5460" : "#464646",
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
                color: highlight ? "#0c5460" : "#464646",
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

export default SendColdPrinter;