import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Dialog } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const SuccessPrinter = ({ open, onClose, data }) => {
    const [printData, setPrintData] = useState(null);
    const [showPrintDialog, setShowPrintDialog] = useState(false);
    const [mixingTime, setMixingTime] = useState(null);

    console.log("SuccessPrinter data:", data);

    useEffect(() => {
        if (open && data) {
            handleShowPrintDialog(data);
        }
    }, [open, data]);

    // แก้ไขในส่วนของ handleShowPrintDialog
    const handleShowPrintDialog = async (data) => {
        try {
            // Extract mix_code from the header if it exists
            const mix_code = data.header?.mix_code || data.mix_code;


            if (!mix_code) {
                console.error("No mix_code found in data");
                setPrintData(data);
                setShowPrintDialog(true);
                return;
            }

            // First request to get time variables
            const timeVarsResponse = await axios.get(`${API_URL}/api/pack/time-variables?mix_code=${mix_code}`);
            console.log("Time variables response:", timeVarsResponse.data);

            let mixTime = null;

            // รับค่า mixTime จากโครงสร้างข้อมูลใหม่
            if (timeVarsResponse.data.success && timeVarsResponse.data.data) {
                // เข้าถึง mixTime จากโครงสร้างข้อมูลใหม่
                mixTime = timeVarsResponse.data.data.mixTime;
                console.log("mixTime Check :", mixTime)

                // แปลงเป็นเลขทศนิยมเพื่อใช้ในการคำนวณ
                if (mixTime !== null && mixTime !== undefined) {
                    // Ensure mixTime is a number
                    mixTime = parseFloat(mixTime);

                    // Check if it's a valid number after parsing
                    if (isNaN(mixTime)) {
                        console.warn("mixTime is not a valid number after parsing:", mixTime);
                        mixTime = null;
                    }
                }
            }

            setMixingTime(mixTime);

            if (timeVarsResponse.data.success) {
                const completeData = {
                    ...data,
                    // รับค่า timeVariables จากโครงสร้างข้อมูลใหม่
                    timeVariables: timeVarsResponse.data.data.timeVariables || [],
                    mixTime: mixTime
                };

                console.log("completeData:", completeData);

                setPrintData(completeData);
                setShowPrintDialog(true);
            }
        } catch (error) {
            console.error("Error fetching time variables:", error);
            setPrintData(data);
            setShowPrintDialog(true);
        }
    };

    const renderTimeVariables = (materialIndex) => {
        if (!printData?.timeVariables || (Array.isArray(printData.timeVariables) && printData.timeVariables.length === 0)) {
            return null;
        }

        let timeData = null;

        if (Array.isArray(printData.timeVariables)) {
            if (materialIndex >= printData.timeVariables.length) {
                return null;
            }
            timeData = printData.timeVariables[materialIndex];
        } else {
            timeData = printData.timeVariables;
        }

        const hasTimeData = timeData && (
            (timeData.rework_time && timeData.rework_time !== null) ||
            (timeData.prep_to_pack_time && timeData.prep_to_pack_time !== null) ||
            (timeData.ptc_time && timeData.ptc_time !== null) ||
            (timeData.cold_to_pack_time && timeData.cold_to_pack_time !== null)||
            (timeData.cold_time && timeData.cold_time !== null)

        );

        if (!hasTimeData) {
            return null;
        }

        let combinedPrepToPack = null;
        if (timeData.ptc_time && timeData.ptc_time !== null &&
            timeData.cold_to_pack_time && timeData.cold_to_pack_time !== null &&
            timeData.standard_ptc_time && timeData.standard_cold_to_pack) {

            // Calculate DBS for ptc (prepare to cold)
            const [ptcHours, ptcMinutes] = parseTimeString(timeData.ptc_time);
            const [stdPtcHours, stdPtcMinutes] = parseTimeString(timeData.standard_ptc_time);

            // Calculate DBS for cold to pack
            const [coldToPackHours, coldToPackMinutes] = parseTimeString(timeData.cold_to_pack_time);
            const [stdColdToPackHours, stdColdToPackMinutes] = parseTimeString(timeData.standard_cold_to_pack);

            // Calculate total minutes for each
            const totalPtcMinutes = ptcHours * 60 + ptcMinutes;
            const totalStdPtcMinutes = stdPtcHours * 60 + stdPtcMinutes;
            const totalColdToPackMinutes = coldToPackHours * 60 + coldToPackMinutes;
            const totalStdColdToPackMinutes = stdColdToPackHours * 60 + stdColdToPackMinutes;

            // Calculate DBS differences in minutes
            const ptcDiffMinutes = totalStdPtcMinutes - totalPtcMinutes;
            const coldToPackDiffMinutes = totalStdColdToPackMinutes - totalColdToPackMinutes;

            // Sum the DBS differences to get combined DBS
            const totalCombinedDiffMinutes = ptcDiffMinutes + coldToPackDiffMinutes;

            // Convert combined difference back to hours and minutes
            const combinedHours = Math.floor(Math.abs(totalCombinedDiffMinutes) / 60);
            const combinedMinutes = Math.abs(totalCombinedDiffMinutes) % 60;

            // Format as HH:MM with sign
            combinedPrepToPack = `${totalCombinedDiffMinutes < 0 ? '-' : ''}${combinedHours}:${combinedMinutes.toString().padStart(2, '0')} น.`;
        }

        // Show DBS data for this material
        return (
            <Box sx={{ mt: 1, p: 1, border: '1px dashed #ccc', borderRadius: '4px' }}>
                <Typography sx={{ fontSize: '20px', mb: 0.5, '@media print': { fontSize: '13px', mb: 0.2 } }}>
                    ข้อมูลเวลา DBS
                </Typography>

                <Box sx={{ mb: 1, '@media print': { mb: 0.3 } }}>
                    {/* Case 1: Rework time */}
                    {timeData.rework_time && timeData.rework_time !== null && (
                        <InfoRow
                            label="DBS แก้ไข"
                            value={formatTimeDifference(timeData.rework_time, timeData.standard_rework)}
                            indent
                        />
                    )}

                    {/* Case 2: Direct prep to pack time */}
                    {timeData.prep_to_pack_time && timeData.prep_to_pack_time !== null && (
                        <InfoRow
                            label="DBS เตรียม-บรรจุ (ช่วงที่ 4)"
                            value={formatTimeDifference(timeData.prep_to_pack_time, timeData.standard_prep_to_pack)}
                            indent
                        />
                    )}

                    {/* Case 3: PTC time */}
                    {timeData.ptc_time && timeData.ptc_time !== null && (
                        <InfoRow
                            label="DBS เตรียม-เย็น (ช่วงที่ 1) "
                            value={formatTimeDifference(timeData.ptc_time, timeData.standard_ptc_time)}
                            indent
                        />
                    )}

                    {timeData.cold_time && timeData.cold_time !== null && (
                        <InfoRow
                            label="DCS ภายในห้องเย็น (ช่วงที่ 2) "
                            value={formatTimeDifference(timeData.cold_time, timeData.standard_cold_time)}
                            indent
                        />
                    )}

                    {/* Case 4: Cold to pack time */}
                    {timeData.cold_to_pack_time && timeData.cold_to_pack_time !== null && (
                        <InfoRow
                            label="DBS เย็น-บรรจุ (ช่วงที่ 3) "
                            value={formatTimeDifference(timeData.cold_to_pack_time, timeData.standard_cold_to_pack)}
                            indent
                        />
                    )}

                    {/* Combined prep to pack time (calculated from ptc_time + cold_to_pack_time) */}
                    {combinedPrepToPack && (
                        <InfoRow
                            label="DBS รวม (ช่วงที่ 1 + ช่วงที่ 3) "
                            value={combinedPrepToPack}
                            indent
                        />
                    )}
                </Box>
            </Box>
        );
    };


    // Calculate mixing to packaging completion time
    const renderMixingToPackagingTime = () => {
        // Hide the calculation if mixingTime is null, undefined, NaN, or exactly 2.00
        if (mixingTime === null || mixingTime === undefined || isNaN(mixingTime) || mixingTime === 2) {
            return null;
        }

        try {
            // ใช้ฟังก์ชัน formatTimeDifference ที่มีอยู่แล้ว
            const standardTime = "2.00"; // Standard time in hours
            const mixTimeStr = mixingTime.toString(); // แปลงเป็น string เพื่อให้ฟังก์ชัน formatTimeDifference ทำงานได้

            // ใช้ฟังก์ชันที่มีอยู่แล้วแทนการคำนวณใหม่
            const formattedTime = formatTimeDifference(mixTimeStr, standardTime);

            console.log(`เวลา mix time: ${formattedTime} = ${standardTime} - ${mixTimeStr}`);

            return (
                <Box sx={{ mt: 2, p: 1, border: '1px dashed #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                    <Typography sx={{
                        fontSize: '20px',
                        fontWeight: 'none',
                        mb: 0.5,
                        '@media print': { fontSize: '13px', mb: 0.2, fontWeight: 'none' }
                    }}>
                        สรุปเวลาการผลิต(ผสมแล้วฝากห้องเย็น)
                    </Typography>
                    <InfoRow
                        label="เวลาที่ใช้ ผสม-บรรจุเสร็จ"
                        value={formattedTime}
                        indent
                    />
                </Box>
            );
        } catch (error) {
            console.error("Error calculating mixing to packaging time:", error);
            return null;
        }
    };


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
            return new Intl.DateTimeFormat('en-TH', options).format(date);
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

    const formatTimeDifference = (remaining, standard) => {
        if (!remaining || !standard) return "-";

        try {
            // แยกชั่วโมงและนาทีจากค่าที่รับเข้ามา
            const [remainingHours, remainingMinutes] = parseTimeString(remaining);
            const [standardHours, standardMinutes] = parseTimeString(standard);

            console.log(`Remaining time: ${remainingHours} ชม. ${remainingMinutes} นาที`);
            console.log(`Standard time: ${standardHours} ชม. ${standardMinutes} นาที`);

            // แปลงเป็นนาทีทั้งหมด
            const remainingTotalMinutes = remainingHours < 0
                ? remainingHours * 60 - remainingMinutes  // เมื่อชั่วโมงเป็นลบ ให้ลบนาทีออก
                : remainingHours * 60 + remainingMinutes;
            const standardTotalMinutes = standardHours * 60 + standardMinutes;

            // คำนวณความแตกต่างในนาที
            const diffMinutes = standardTotalMinutes - remainingTotalMinutes;
            console.log(`Difference in minutes: ${standardTotalMinutes} - ${remainingTotalMinutes}`);
            console.log(`Difference in minutes: ${diffMinutes}`);

            if (isNaN(diffMinutes)) return "-";

            // แปลงกลับเป็นชั่วโมงและนาที
            const hours = Math.floor(Math.abs(diffMinutes) / 60);
            const minutes = Math.abs(diffMinutes) % 60;

            console.log(`ชม.นาที :${hours}:${minutes.toString().padStart(2, '0')} น.`);

            // Format as HH:MM น.
            return `${diffMinutes < 0 ? '-' : ''}${hours}:${minutes.toString().padStart(2, '0')} น.`;
        } catch (error) {
            console.error("Error calculating time difference:", error);
            return "-";
        }
    };

    // ฟังก์ชันช่วยแยกชั่วโมงและนาทีจากข้อความ
    function parseTimeString(timeStr) {
        // แปลงเป็นข้อความก่อนในกรณีที่รับค่าเป็นตัวเลข
        timeStr = String(timeStr);

        // แยกส่วนชั่วโมงและนาที
        const parts = timeStr.split('.');
        const hours = parseInt(parts[0], 10);

        // ถ้ามีส่วนทศนิยม (นาที)
        let minutes = 0;
        if (parts.length > 1) {
            // รองรับกรณีทั้ง .3 (30 นาที) และ .35 (35 นาที)
            if (parts[1].length === 1) {
                // กรณี .3 หมายถึง 30 นาที
                minutes = parseInt(parts[1], 10) * 10;
            } else {
                // กรณี .35 หมายถึง 35 นาที
                minutes = parseInt(parts[1], 10);
            }
        }

        return [hours, minutes];
    }

    // เพิ่มฟังก์ชันนี้ในคอมโพเนนต์ SuccessPrinter
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

    // เพิ่มฟังก์ชันสำหรับแสดงรายการวัตถุดิบแต่ละรายการ (เพื่อลดการเขียนโค้ดซ้ำ)
    const renderMaterialDetails = (material, index, isMixedMaterial = false, totalCount = 1) => {
        // คัดลอกโค้ดส่วนที่แสดงรายละเอียดวัตถุดิบจากเดิม และปรับให้รับพารามิเตอร์

        // สร้างข้อมูลห้องเย็นสำหรับวัตถุดิบแต่ละรายการ
        const materialColdStorageEntries = [];

        // ตรวจสอบข้อมูลห้องเย็นในวัตถุดิบ (ถ้ามี)
        if (material.come_cold_date || material.out_cold_date || material.receiver_out_cold) {
            materialColdStorageEntries.push({
                enter: formatDateTime(material.come_cold_date),
                exit: formatDateTime(material.out_cold_date),
                receiver: material.receiver_out_cold
            });
        }

        if (material.come_cold_date_two || material.out_cold_date_two || material.receiver_out_cold_two) {
            materialColdStorageEntries.push({
                enter: formatDateTime(material.come_cold_date_two),
                exit: formatDateTime(material.out_cold_date_two),
                receiver: material.receiver_out_cold_two
            });
        }

        if (material.come_cold_date_three || material.out_cold_date_three || material.receiver_out_cold_three) {
            materialColdStorageEntries.push({
                enter: formatDateTime(material.come_cold_date_three),
                exit: formatDateTime(material.out_cold_date_three),
                receiver: material.receiver_out_cold_three
            });
        }

        // ถ้าไม่มีข้อมูลห้องเย็นในวัตถุดิบ และข้อมูลห้องเย็นอยู่ในระดับ data หลัก (และมีวัตถุดิบเพียงรายการเดียว)
        if (materialColdStorageEntries.length === 0 && totalCount === 1) {
            // ใช้ข้อมูลจาก data หลัก
            if (data.come_cold_date || data.out_cold_date || data.receiver_out_cold) {
                materialColdStorageEntries.push({
                    enter: formatDateTime(data.come_cold_date),
                    exit: formatDateTime(data.out_cold_date),
                    receiver: data.receiver_out_cold
                });
            }

            if (data.come_cold_date_two || data.out_cold_date_two || data.receiver_out_cold_two) {
                materialColdStorageEntries.push({
                    enter: formatDateTime(data.come_cold_date_two),
                    exit: formatDateTime(data.out_cold_date_two),
                    receiver: data.receiver_out_cold_two
                });
            }

            if (data.come_cold_date_three || data.out_cold_date_three || data.receiver_out_cold_three) {
                materialColdStorageEntries.push({
                    enter: formatDateTime(data.come_cold_date_three),
                    exit: formatDateTime(data.out_cold_date_three),
                    receiver: data.receiver_out_cold_three
                });
            }
        }

        // กรองออกข้อมูลที่ว่างเปล่า
        const filteredColdStorageEntries = materialColdStorageEntries.filter(
            entry => entry.enter !== "ไม่มีข้อมูล" || entry.exit !== "ไม่มีข้อมูล" || entry.receiver
        );

        return (
            <Box key={index} sx={{ mb: 2 }}>
                {/* แสดงหัวข้อ */}
                {totalCount > 1 && (
                    <Typography sx={{
                        fontSize: "22px",
                        mb: 0.5,
                        mt: 1,
                        '@media print': {
                            fontSize: "14px",
                            mb: 0.2,
                            mt: 0.5
                        }
                    }}>
                        {isMixedMaterial ? `วัตถุดิบที่ ${index + 1}` : `วัตถุดิบ ${index + 1}`} คือ {material.mat_name || "ไม่มีข้อมูล"}
                    </Typography>
                )}

                {/* เมื่อมีวัตถุดิบเพียงรายการเดียว แสดงข้อมูลโดยตรง */}
                {totalCount === 1 && material.mat_name && (
                    <InfoRow label="ชื่อวัตถุดิบ" value={material.mat_name} />
                )}

                {material.mat && <InfoRow label="รหัสวัตถุดิบ" value={material.mat} />}
                {material.mat && <InfoRow label="ชื่อวัตถุดิบ" value={material.mat_name} />}
                {material.batch_after && <InfoRow label="Batch" value={material.batch_after} />}
                {material.code && material.doc_no && (
                    <InfoRow label="เอกสารอ้างอิง" value={`${material.code}-(${material.doc_no})`} />
                )}
                {material.line_name && <InfoRow label="ไลน์การผลิต" value={material.line_name} />}
                {material.eu_level && <InfoRow label="Level EU" value={material.eu_level} />}

                {/* แสดงรหัสการผสมเฉพาะสำหรับวัตถุดิบปกติ ที่มีรหัสการผสม (สำหรับวัตถุดิบผสมจะแสดงไว้ที่ส่วนหัวข้อแล้ว) */}
                {!isMixedMaterial && material.mix_code && (
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
                {material.withdraw_date && <InfoRow label="เวลาเบิกวัตถุดิบจากห้องเย็นใหญ่" value={formatDateTime(material.withdraw_date)} />}
                {material.cooked_date && <InfoRow label="เวลาเตรียมเสร็จ" value={formatDateTime(material.cooked_date)} />}
                {material.remark_rework_cold && <InfoRow label="หมายเหตุแก้ไข-ห้องเย็น" value={formatDateTime(material.remark_rework_cold)} />}
                {material.remark_rework && <InfoRow label="หมายเหตุแก้ไข-บรรจุ" value={formatDateTime(material.remark_rework)} />}
                {material.edit_rework && <InfoRow label="ประวัติการแก้ไข" value={formatDateTime(material.edit_rework)} />}

                {/* แสดงข้อมูล DBS สำหรับวัตถุดิบนี้ */}
                {renderTimeVariables(material.originalIndex !== undefined ? material.originalIndex : index)}

                {/* ข้อมูล QC ของวัตถุดิบ */}
                {(material.qccheck || material.mdcheck || material.defectcheck ||
                    data.qccheck || data.mdcheck || data.defectcheck || material.WorkAreaCode ||
                    material.md_no) && (
                        <Box sx={{
                            mt: 1,
                            p: 1,
                            border: "1px dashed #ccc",
                            borderRadius: "4px",
                            '@media print': {
                                mt: 0.5,
                                p: 0.5,
                                borderRadius: "2px"
                            }
                        }}>
                            <Typography sx={{
                                fontSize: "20px",
                                mb: 0.5,
                                '@media print': {
                                    fontSize: "13px",
                                    mb: 0.2
                                }
                            }}>
                                ผลการตรวจสอบคุณภาพ:
                            </Typography>
                            {/* ค่า QC จากวัตถุดิบ */}
                            {(material.WorkAreaCode || material.md_no || data.WorkAreaCode || data.md_no) && <InfoRow label="เครื่อง MD" value={`${material.WorkAreaCode || data.WorkAreaCode || ''}/${material.md_no || data.md_no || ''}`} indent />}
                            {material.qccheck && <InfoRow label="QC Check" value={material.qccheck} indent />}
                            {material.mdcheck && <InfoRow label="MD Check" value={material.mdcheck} indent />}
                            {material.defectcheck && <InfoRow label="Defect Check" value={material.defectcheck} indent />}

                            {/* ค่า QC จาก data หลัก (สำหรับกรณีที่ข้อมูลอยู่ในระดับบน) */}
                            {!material.qccheck && data.qccheck && <InfoRow label="QC Check" value={data.qccheck} indent />}
                            {!material.mdcheck && data.mdcheck && <InfoRow label="MD Check" value={data.mdcheck} indent />}
                            {!material.defectcheck && data.defectcheck && <InfoRow label="Defect Check" value={data.defectcheck} indent />}
                        </Box>
                    )}

                {/* แสดงข้อมูลห้องเย็นของวัตถุดิบแต่ละรายการ */}
                {filteredColdStorageEntries.length > 0 && (
                    <Box sx={{
                        mt: 1,
                        p: 1,
                        border: "1px dashed #ccc",
                        borderRadius: "4px",
                        '@media print': {
                            mt: 0.5,
                            p: 0.5,
                            borderRadius: "2px"
                        }
                    }}>
                        <Typography sx={{
                            fontSize: "20px",
                            mb: 0.5,
                            '@media print': {
                                fontSize: "13px",
                                mb: 0.2
                            }
                        }}>
                            ข้อมูลการเข้า-ออกห้องเย็น:
                        </Typography>

                        {filteredColdStorageEntries.map((entry, entryIndex) => (
                            <Box key={entryIndex} sx={{
                                mb: 1,
                                '@media print': {
                                    mb: 0.3
                                }
                            }}>
                                {filteredColdStorageEntries.length > 1 && (
                                    <Typography sx={{
                                        fontSize: "18px",
                                        mb: 0.3,
                                        '@media print': {
                                            fontSize: "12px",
                                            mb: 0.1
                                        }
                                    }}>
                                        ครั้งที่ {entryIndex + 1}:
                                    </Typography>
                                )}
                                {entry.enter && entry.enter !== "ไม่มีข้อมูล" && <InfoRow label="เวลาเข้า" value={entry.enter} indent />}
                                {entry.exit && entry.exit !== "ไม่มีข้อมูล" && <InfoRow label="เวลาออก" value={entry.exit} indent />}
                                {entry.receiver && <InfoRow label="ผู้รับ" value={entry.receiver} indent />}
                            </Box>
                        ))}
                    </Box>
                )}
                {/* // ผู้รับผิดชอบ */}
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
                    {(material.receiver || data.receiver) && (
                        <InfoRow
                            label="ผู้รับ"
                            value={material.receiver || data.receiver}
                        />
                    )}
                    {(material.receiver_qc || data.receiver_qc) && (
                        <InfoRow
                            label="QC"
                            value={material.receiver_qc || data.receiver_qc}
                        />
                    )}
                    {(material.receiver_prep_two || data.receiver_prep_two) && (
                        <InfoRow
                            label="เจ้าหน้าที่เตรียม"
                            value={material.receiver_prep_two || data.receiver_prep_two}
                        />
                    )}
                </Box>
            </Box >
        );
    };



    if (!data) return null;

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

    // Fixed: Check if data exists before accessing its properties
    // Also ensure materials is always an array
    const materials = data ? (
        Array.isArray(data.materials) ? data.materials :
            (data.mat_name ? [data] : [])
    ) : [];

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
                    maxHeight: '90vh', // ปรับความสูงให้เหมาะสมกับเนื้อหา
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
                    flexDirection: { xs: "column", sm: "row" },
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
                        flex: 1,
                        padding: "10px",
                        textAlign: "center",
                        fontSize: "26px",
                        '@media print': {
                            fontSize: "16px",
                            padding: "4px",
                        }
                    }}>
                        สถานที่จัดส่ง: {data.rm_status || "บรรจุสำเร็จ"}
                    </Box>
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
                            borderBottom: "1px solid #ddd",
                            pb: 0.5,
                            '@media print': {
                                fontSize: "16px",
                                pb: 0.2,
                                mb: 0.3,
                                fontWeight: "normal"
                            }
                        }}>
                            Production
                        </Typography>

                        {renderMixingToPackagingTime()}

                        {/* แยกวัตถุดิบออกเป็นกลุ่ม */}
                        {(() => {
                            const { mixed, normal } = groupMaterialsByMixCode();
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
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
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
                                                        รหัสการผสม: {mixCode}
                                                    </Typography>

                                                    {/* แสดงวัตถุดิบที่มีรหัสผสมเดียวกัน */}
                                                    {mixedMaterials.map((material, materialIndex) =>
                                                        renderMaterialDetails(material, materialIndex, true, mixedMaterials.length)
                                                    )}
                                                </Box>
                                            ))}
                                        </>
                                    )}

                                    {/* วัตถุดิบปกติ - ไม่มีรหัสการผสม */}
                                    {hasNormal && (
                                        <>
                                            {hasMixed && (
                                                <Typography sx={{
                                                    fontSize: '22px',
                                                    fontWeight: 'none',
                                                    mt: 2,
                                                    mb: 1,
                                                    '@media print': {
                                                        fontSize: '14px',
                                                        mt: 1,
                                                        mb: 0.5,
                                                        fontWeight: 'none'
                                                    }
                                                }}>
                                                    วัตถุดิบทั่วไป
                                                </Typography>
                                            )}

                                            {normal.map((material, index) =>
                                                renderMaterialDetails(material, index, false, normal.length)
                                            )}
                                        </>
                                    )}
                                </>
                            );
                        })()}
                    </Box>
                )}

                {/* ข้อมูลเพิ่มเติม */}
                <Box>
                    <Typography variant="h6" sx={{
                        color: "#000",
                        fontSize: "26px",
                        mt: 2,
                        mb: 1,
                        borderBottom: "1px solid #ddd",
                        pb: 0.5,
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

// คอมโพเนนต์ย่อยสำหรับแสดงข้อมูลแต่ละแถว
const InfoRow = ({ label, value, indent = false }) => {
    if (!value) return null;

    return (
        <Box sx={{
            display: "flex",
            alignItems: "baseline",
            ml: indent ? 2 : 0,
            mb: 0.5,
            '@media print': {
                ml: indent ? 0.5 : 0,
                mb: 0.2
            }
        }}>
            <Typography sx={{
                color: "#464646",
                fontSize: "20px",
                minWidth: "120px",
                fontWeight: "normal",
                '@media print': {
                    fontSize: "12px",
                    minWidth: "65px",
                    fontWeight: "normal"
                }
            }}>
                {label}:
            </Typography>
            <Typography sx={{
                color: "#464646",
                fontSize: "20px",
                flex: 1,
                '@media print': {
                    fontSize: "12px"
                }
            }}>
                {value}
            </Typography>
        </Box>
    );
};

export default SuccessPrinter;