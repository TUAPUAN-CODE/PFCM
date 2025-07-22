import React, { useState, useEffect } from 'react';
import TableMainPrep from './hisTable';
import ModalPrint from '../../MatManage/Asset/ModalPrint';
import axios from "axios";
axios.defaults.withCredentials = true; 
import io from 'socket.io-client';
const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
    const [openModal1, setOpenModal1] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openSuccessModal, setOpenSuccessModal] = useState(false);
    const [dataForModal1, setDataForModal1] = useState(null);
    const [dataForEditModal, setDataForEditModal] = useState(null);
    const [dataForSuccessModal, setDataForSuccessModal] = useState(null);
    const [tableData, setTableData] = useState([]);
    const [socket, setSocket] = useState(null);
    const [openPrintModal, setOpenPrintModal] = useState(false);
    const [dataForPrintModal, setDataForPrintModal] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);


    // Fetch data function
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/api/prep/his/fetchRMForProd`);

            if (response.data.success && Array.isArray(response.data.data)) {
                const processedData = response.data.data.map(item => ({
                    ...item,
                    cooked_date: item.CookedDateTime, // เพิ่ม cooked_date กลับเข้าไป
                    cooked_date_formatted: item.CookedDateTime // ใช้ CookedDateTime เป็นค่า formatted
                }));
                console.log("Processed data:", processedData);
                setTableData(processedData);
            } else {
                console.warn("API response format unexpected:", response.data);
                setTableData([]);
                setError(response.data.error || "No data available");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setError(error.message || "Failed to fetch data. Please try again later.");
            setTableData([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial data load
    useEffect(() => {
        fetchData();
    }, []);

    // Modal handler functions
    const handleOpenModal1 = (data) => {
        setDataForModal1(data);
        setOpenModal1(true);
    };

    const handleOpenEditModal = (data) => {
        setDataForEditModal({
            batch: data.batch,
            mat: data.mat,
            mat_name: data.mat_name,
            production: data.production,
            rmfp_id: data.rmfp_id
        });
        setOpenEditModal(true);
    };

    // แก้ไขส่วน handleOpenPrintModal ในไฟล์ ParentComponent.jsx
    const handleOpenPrintModal = (data) => {
        // Format date fields if needed
        const formatDateTime = (dateTimeStr) => {
            if (!dateTimeStr) return null;
            try {
                // Try to standardize date format for display
                const date = new Date(dateTimeStr.replace(' ', 'T'));
                if (!isNaN(date.getTime())) {
                    return date.toLocaleString('th-TH', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }
                // If parsing fails, return the original string
                return dateTimeStr;
            } catch (e) {
                console.warn("Date parsing error:", e);
                return dateTimeStr;
            }
        };

        // ตรวจสอบและจัดการกับ CookedDateTime จาก API
        const cookedDate = data.CookedDateTime || data.cooked_date;
        const cookedDateFormatted = data.cooked_date_formatted || formatDateTime(cookedDate);

        // Create a comprehensive data object for printing
        const printData = {
            // Basic info
            batch_after: data.batch,
            mat: data.mat,
            mat_name: data.mat_name,
            production: data.production,
            rmfp_id: data.rmfp_id,

            // Dates and times
            withdraw_date: data.withdraw_date,
            withdraw_date_formatted: data.withdraw_date_formatted || formatDateTime(data.withdraw_date),
            cooked_date: cookedDate,  // ใช้ค่าที่ได้จากการตรวจสอบข้างบน
            cooked_date_formatted: cookedDateFormatted,  // ใช้ค่าที่ได้จากการตรวจสอบข้างบน
            CookedDateTime: data.CookedDateTime,  // เพิ่มฟิลด์เดิมเข้าไปด้วยเผื่อต้องใช้

            // Production details
            tray_count: data.tray_count,
            weight_RM: data.weight_RM,
            level_eu: data.level_eu,
            process_name: data.process_name,
            tro_id: data.tro_id,

            // Destination info
            dest: data.dest,
            rmm_line_name: data.rmm_line_name,

            // Time calculations
            prep_to_pack_time: data.prep_to_pack_time,
            rework_time: data.rework_time,

            // Edit/change info
            before_prod: data.before_prod,
            after_prod: data.after_prod,
            name_edit_prod: data.name_edit_prod,

            // Personnel
            receiver: data.receiver,
            receiver_qc: data.receiver_qc,

            // Additional fields
            general_remark: data.general_remark,
            WorkAreaName: data.WorkAreaName,
            WorkAreaCode: data.WorkAreaCode,
            md_no: data.md_no,

            // Include all original data as fallback
            ...data,

            // Status flags for UI decisions
            has_cooked_date: Boolean(cookedDateFormatted || cookedDate),
            rm_status: data.rm_status || ""
        };

        console.log("Print data prepared:", printData);
        setDataForPrintModal(printData);
        setOpenPrintModal(true);
    };

    const handleOpenSuccess = (data) => {
        setDataForSuccessModal({
            batch: data.batch,
            mat: data.mat,
            mat_name: data.mat_name,
            production: data.production,
            rmfp_id: data.rmfp_id,
        });
        setOpenSuccessModal(true);
    };

    const handleRowClick = (rowData) => {
        console.log("Row clicked:", rowData);
        // Add any additional row click logic here
    };

    console.log("Table Data:", tableData);

    // Handle refresh button click
    const handleRefresh = () => {
        fetchData();
    };

    // Close modal handlers
    const handleCloseModal1 = () => {
        setOpenModal1(false);
    };

    const handleCloseEditModal = () => {
        setOpenEditModal(false);
    };

    const handleCloseSuccessModal = () => {
        setOpenSuccessModal(false);
    };

    const handleClosePrintModal = () => {
        setOpenPrintModal(false);
    };

    return (
        <div className="parent-container">
            {/* Optional loading indicator */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner">Loading...</div>
                </div>
            )}

            {/* Error message display */}
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={handleRefresh}>Retry</button>
                </div>
            )}

            {/* Main table component */}
            <TableMainPrep
                handleOpenModal1={handleOpenModal1}
                handleOpenEditModal={handleOpenEditModal}
                handleOpenSuccess={handleOpenSuccess}
                handleOpenPrintModal={handleOpenPrintModal}
                data={tableData}
                handleRowClick={handleRowClick}
                isLoading={isLoading}
            />

            {/* ModalPrint component */}
            {openPrintModal && dataForPrintModal && (
                <ModalPrint
                    open={openPrintModal}
                    onClose={handleClosePrintModal}
                    rowData={dataForPrintModal}
                />
            )}

        </div>
    );
};

export default ParentComponent;