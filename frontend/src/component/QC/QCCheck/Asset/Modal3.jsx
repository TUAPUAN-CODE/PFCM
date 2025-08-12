import React from 'react';
import { useState, useEffect } from "react";
import {
	Box,
	Button,
	Typography,
	Dialog,
	TextField,
	Snackbar,
	Alert,
	IconButton,
	FormControl,
	InputLabel
} from '@mui/material';
import { CalendarToday, AccessTime } from '@mui/icons-material';
import axios from 'axios';
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import InputAdornment from "@mui/material/InputAdornment";

const API_URL = import.meta.env.VITE_API_URL;

const Modal3 = ({ open, onClose, data, onEdit, dataForModal3 }) => {
	const [qcDateTime, setQcDateTime] = useState("");
	const [qcDate, setQcDate] = useState("");
	const [qcTime, setQcTime] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [showSuccess, setShowSuccess] = useState(false);

	const now = new Date();
	const maxDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
	const maxTime = now.toTimeString().slice(0, 5);  // HH:MM

	// Add print style on component mount
	useEffect(() => {
		// Create a style element for print media
		const style = document.createElement('style');
		style.type = 'text/css';
		style.media = 'print';

		// CSS for optimized thermal receipt printing (72.1mm width)
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
				
				.no-print {
					display: none !important;
				}
				
				.print-text {
					font-size: 10px !important;
				}
				
				.print-title {
					font-size: 12px !important;
					font-weight: bold !important;
				}
				
				.print-header {
					font-size: 14px !important;
					font-weight: bold !important;
					text-align: center !important;
				}
			}
		`;

		style.appendChild(document.createTextNode(css));
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);

	// Original useEffect for loading data
	useEffect(() => {
		console.log("Modal3 received dest:", data);
		console.log("QC Data:", data?.qcData);
		console.log("sq_acceptance:", data?.qcData?.sq_acceptance, "type:", typeof data?.qcData?.sq_acceptance);
		console.log("defect_acceptance:", data?.qcData?.defect_acceptance, "type:", typeof data?.qcData?.defect_acceptance);

		if (data?.qcData?.md_time_formatted) {
			try {
				// แปลงสตริงวันเวลาเป็น Date object
				const mdDateTime = new Date(data.qcData.md_time_formatted.replace(' ', 'T'));

				// ถ้าวันที่ถูกต้อง ให้บวกเวลาเพิ่ม 7 ชั่วโมง
				if (!isNaN(mdDateTime.getTime())) {
					mdDateTime.setHours(mdDateTime.getHours());

					// รูปแบบวันที่ YYYY-MM-DD
					const mdDate = mdDateTime.getFullYear() + '-' +
						String(mdDateTime.getMonth() + 1).padStart(2, '0') + '-' +
						String(mdDateTime.getDate()).padStart(2, '0');

					// รูปแบบเวลา HH:MM
					const mdTime = String(mdDateTime.getHours()).padStart(2, '0') + ':' +
						String(mdDateTime.getMinutes()).padStart(2, '0');

					// อัพเดทข้อมูลในตัวแปร data (แก้ไขข้อมูลโดยตรง)
					data.qcData.md_time_formatted = `${mdDate} ${mdTime}`;
				}
			} catch (err) {
				console.error("ไม่สามารถแปลงเวลา MD ได้:", err);
			}
		}

		if (data?.qcData?.qc_datetime_formatted) {
			const formattedDate = data.qcData.qc_datetime_formatted;
			setQcDateTime(formattedDate);

			// แยกวันที่และเวลา หากเป็นรูปแบบ YYYY-MM-DD HH:MM
			try {
				const dateTimeParts = formattedDate.split(' ');
				if (dateTimeParts.length === 2) {
					setQcDate(dateTimeParts[0]); // YYYY-MM-DD
					setQcTime(dateTimeParts[1]); // HH:MM
				}
			} catch (err) {
				console.error("ไม่สามารถแยกวันที่และเวลาได้:", err);
			}
		}
		// รีเซ็ตข้อความ error เมื่อข้อมูลเปลี่ยน
		setErrorMessage("");
	}, [data]);

	const printPage = () => {
		window.print();
	};

	const handleDateChange = (e) => {
		setQcDate(e.target.value);
		updateDateTime(e.target.value, qcTime);
	};

	const handleTimeChange = (e) => {
		setQcTime(e.target.value);
		updateDateTime(qcDate, e.target.value);
	};

	const updateDateTime = (date, time) => {
		if (date && time) {
			setQcDateTime(`${date} ${time}`);
		}
	};

	const saveQcDateTime = async () => {
		if (!qcDate || !qcTime || !data?.mapping_id) {
			setErrorMessage("กรุณาระบุวันที่และเวลา");
			return;
		}

		setIsLoading(true);
		setErrorMessage("");

		try {
			console.log("กำลังส่งข้อมูล:", {
				mapping_id: data.mapping_id,
				qc_datetime: qcDateTime
			});

			// สร้าง object วันที่จาก string ที่ป้อน
			let formattedDate;
			try {
				formattedDate = new Date(`${qcDate}T${qcTime}:00`);
				if (isNaN(formattedDate.getTime())) {
					throw new Error("Invalid date format");
				}

				// บวกเวลาเพิ่มอีก 7 ชั่วโมง เพื่อให้ตรงกับ timezone ของประเทศไทย (UTC+7)
				formattedDate.setHours(formattedDate.getHours() + 7);

			} catch (e) {
				setErrorMessage("รูปแบบวันที่ไม่ถูกต้อง");
				setIsLoading(false);
				return;
			}

			console.log("วันที่หลังจากบวก 7 ชั่วโมง:", formattedDate.toISOString());

			// เรียกใช้ API แก้ไขข้อมูล
			const response = await axios.post(`${API_URL}/api/update-qc-datetime`, {
				mapping_id: parseInt(data.mapping_id), // แปลงเป็นตัวเลข
				qc_datetime: formattedDate.toISOString() // แปลงเป็นรูปแบบ ISO สากล
			});

			if (response.status === 200 && response.data.success) {
				console.log("✅ QC datetime updated successfully");

				// อัพเดทข้อมูลใน UI โดยไม่ส่งกลับไปที่คอมโพเนนต์แม่
				// แสดงการแจ้งเตือนสำเร็จ
				setShowSuccess(true);
				// ออกจากโหมดแก้ไข แต่ไม่ปิดหน้าต่าง
				setIsEditing(false);

				// ลองเพิ่มข้อมูลใหม่โดยตรง แทนการใช้ onEdit
				if (data?.qcData) {
					data.qcData.qc_datetime_formatted = qcDateTime;
				}
			} else {
				setErrorMessage(response.data.message || "เกิดข้อผิดพลาดในการอัพเดทข้อมูล");
			}
		} catch (error) {
			console.error("❌ Error during API call:", error);

			// ถ้าเกิด error 404 หรือไม่สามารถเชื่อมต่อกับ API ได้ ให้อัพเดทแค่ UI
			if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
				console.log("⚠️ API not available, updating UI only");

				// อัพเดตข้อมูลในตัว Modal เอง แทนที่จะเรียก onEdit
				if (data?.qcData) {
					data.qcData.qc_datetime_formatted = qcDateTime;
				}

				setShowSuccess(true);
				setIsEditing(false);
			} else {
				setErrorMessage(error.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
			}
		} finally {
			setIsLoading(false);
		}
	};

	// เพิ่มฟังก์ชัน calculatePackingEndTime เหนือ return statement ของ component
	const calculatePackingEndTime = (endTimeOnly = false) => {
		// ตรวจสอบว่าควรใช้ rework_time หรือ ptp_time
		const timeToUse = rework_time !== null ? rework_time : ptp_time;

		if (!timeToUse || dest !== 'ไปบรรจุ') return "ไม่มีข้อมูล";

		// กำหนดวันที่เริ่มต้นตามเงื่อนไข
		let startDateTime;

		try {
			if (rework_time !== null) {
				// ถ้าใช้ rework_time ให้ใช้วันที่ QC ตรวจสอบเป็นจุดเริ่มต้น
				if (!qcDateTime) return "ไม่มีข้อมูล";

				// แปลงรูปแบบวันที่ให้ถูกต้องก่อนสร้าง Date object
				const dateTimeStr = qcDateTime.replace(' ', 'T') + ':00';
				startDateTime = new Date(dateTimeStr);

				// ตรวจสอบว่า Date object ถูกต้อง
				if (isNaN(startDateTime.getTime())) {
					console.error('Invalid qcDateTime:', qcDateTime);
					return "รูปแบบวันที่ไม่ถูกต้อง";
				}
			} else {
				// ถ้าใช้ ptp_time ให้ใช้วันที่เตรียมเสร็จเป็นจุดเริ่มต้น
				if (!rmit_date) return "ไม่มีข้อมูล";

				const dateTimeStr = rmit_date.replace(' ', 'T') + ':00';
				startDateTime = new Date(dateTimeStr);

				if (isNaN(startDateTime.getTime())) {
					console.error('Invalid rmit_date:', rmit_date);
					return "รูปแบบวันที่ไม่ถูกต้อง";
				}
			}

			// แยก timeToUse เป็นชั่วโมงและนาที
			const timeParts = timeToUse.toString().split('.');
			const hours = parseInt(timeParts[0]) || 0;
			const minutes = timeParts.length > 1 ? parseInt(timeParts[1]) : 0;

			// คำนวณเวลาสิ้นสุด
			const endTime = new Date(startDateTime);
			endTime.setHours(endTime.getHours() + hours);
			endTime.setMinutes(endTime.getMinutes() + minutes);

			// จัดรูปแบบเวลาสิ้นสุด
			const formattedDate = (date) => {
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
			};

			// ถ้าต้องการเฉพาะเวลาสิ้นสุด
			if (endTimeOnly) {
				return formattedDate(endTime);
			}

			return {
				start: formattedDate(startDateTime),
				end: formattedDate(endTime)
			};
		} catch (err) {
			console.error("Error calculating packing end time:", err);
			return "คำนวณเวลาไม่สำเร็จ";
		}
	};

	const {
		CookedDateTime,
		batch,
		mat,
		mat_name,
		tro_id,
		tray_count,
		process_name,
		production,
		qcData,
		rm_tro_id,
		rmfp_id,
		rmit_date,
		ptp_time,
		rework_time,
		withdraw_date,
		rmfp_line_name,
		dest,
		batch_after,
		level_eu,
		mapping_id,
		withdraw_date_formatted,
		qc_cold_time_formatted,
		md_time_formatted,
		percent_fine,
		Temp,
		Moisture,
		weight_RM, rmm_line_name, stay_place, edit_rework, remark_rework, remark_rework_cold



	} = data || {};

	return (
		<>
			<Dialog
				open={open}
				onClose={(e, reason) => {
					if (reason === 'backdropClick') return; // ไม่ให้ปิดเมื่อคลิกพื้นที่นอก
					onClose();
				}}
				sx={{
					'& .MuiDialog-paper': {
						width: '850px', // กำหนดความกว้างของ Dialog สำหรับหน้าจอปกติ
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						position: 'relative', // เพิ่มเพื่อให้สามารถกำหนดตำแหน่ง Snackbar ภายใน Dialog ได้
						'@media print': {
							width: '72.1mm !important',
							maxWidth: '72.1mm !important',
							height: 'auto',
							margin: '0mm !important',
							padding: '0mm !important',
							boxShadow: 'none',
						},
					},
				}}
			>
				{/* แจ้งเตือนเมื่อบันทึกสำเร็จ - แสดงด้านบนตรงกลางภายใน Dialog */}
				<Snackbar
					open={showSuccess}
					autoHideDuration={3000}
					onClose={() => setShowSuccess(false)}
					style={{
						position: 'absolute',
						top: 20,
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 9999
					}}
					className="no-print"
				>
					<Alert
						onClose={() => setShowSuccess(false)}
						severity="success"
						variant="filled"
						sx={{ width: '100%' }}
					>
						บันทึกวันที่/เวลาสำเร็จ
					</Alert>
				</Snackbar>

				<Box
					className="print-container"
					sx={{
						backgroundColor: "#fff",
						width: "600px",
						borderRadius: "4px",
						padding: "10px",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						flexGrow: 1,
						overflowY: "auto",
						'@media print': {
							width: '72.1mm !important',
							padding: '1mm !important',
							margin: '0mm !important',
							overflowY: 'visible',
						},
					}}
				>
					<Box sx={{
						display: "flex",
						flexDirection: "row",
						className: "no-print",
						'@media print': {
							display: 'none',
						},
					}}>
						<Button
							variant="contained"
							onClick={onClose}
							sx={{
								width: "250px",
								marginBottom: "20px",
								height: "50px",
								margin: "5px",
								backgroundColor: "#ff4444",
								'@media print': {
									display: 'none',
								},
							}}
							className="no-print"
						>
							ยกเลิก
						</Button>
						<Button
							id="printButton"
							variant="contained"
							onClick={printPage}
							sx={{
								width: "250px",
								height: "50px",
								marginBottom: "20px",
								margin: "5px",
								backgroundColor: "#2388d1",
								'@media print': {
									display: 'none',
								},
							}}
							className="no-print"
						>
							กดที่นี่เพื่อ พิมพ์
						</Button>
					</Box>

					<Box sx={{
						width: "100%",
						padding: "10px",
						'@media print': {
							padding: '1mm',
						},
					}}>
						{/* Header Section */}
						<Typography className="print-header" sx={{
							textAlign: 'center',
							marginBottom: '8px',
							'@media print': {
								marginBottom: '2mm',
							},
						}}>
							ข้อมูลการตรวจสอบคุณภาพ
						</Typography>
						{qcData?.prepare_mor_night && qcData?.prepare_mor_night !== "-" && (
							<Typography variant="h6" sx={{
								color: "#000",
								textAlign: 'center',
								fontSize: "24px",
								margin: "10px",
								'@media print': {
									fontSize: '15px',
									margin: '2px 0',
								},
							}}>
								เตรียมงานให้กะ : {qcData?.prepare_mor_night || "ไม่ได้ส่งกะ"}
							</Typography>
						)}
						<Box
							sx={{
								height: "50px",
								width: "100%",
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								'@media print': {
									height: 'auto',
								},
							}}
						>
							<Box
								sx={{
									height: "50px",
									width: "50%",
									border: "2px solid #000",
									display: "flex",
									justifyContent: "center",
									borderTopLeftRadius: "8px",
									borderBottomLeftRadius: "8px",
									alignItems: "center",
									fontSize: "22px",
									'@media print': {
										height: 'auto',
										fontSize: '10px',
										padding: '2px',
										borderRadius: '4px 0 0 4px',
										borderWidth: '1px',
									},
								}}>
								ป้ายทะเบียน : {tro_id || "ไม่มีข้อมูล"}
							</Box>
							<Box
								sx={{
									height: "50px",
									width: "50%",
									border: "2px solid #000",
									display: "flex",
									borderTopRightRadius: "8px",
									borderBottomRightRadius: "8px",
									borderLeft: "0px solid",
									justifyContent: "center",
									alignItems: "center",
									fontSize: "22px",
									'@media print': {
										height: 'auto',
										fontSize: '10px',
										padding: '2px',
										borderRadius: '0 4px 4px 0',
										borderWidth: '1px',
									},
								}}>
								สถานที่จัดส่ง : {dest === 'เข้าห้องเย็น' ? 'เข้าห้องเย็น' : dest === 'ไปบรรจุ' ? rmfp_line_name : (dest || "ไม่มีข้อมูล")}
							</Box>
						</Box>

						{/* Production Section */}
						<Typography variant="h6" className="print-title" sx={{
							color: "#000",
							padding: "5px 0 5px 0",
							margin: "10px",
							fontSize: "22px",
							'@media print': {
								fontSize: '12px',
								fontWeight: 'bold',
								margin: '4px 0',
								padding: '2px 0',
							},
						}}>
							Production
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							ชื่อวัตถุดิบ : {mat_name || "ไม่มีข้อมูล"}
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							Batch : {batch_after || "ไม่มีข้อมูล"}
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							แผนการผลิต : {production || "ไม่มีข้อมูล"}
							{dest === 'เข้าห้องเย็น' && (
								<span style={{ marginLeft: "20px" }}>สถานที่บรรจุ : {rmfp_line_name || "ไม่มีข้อมูล"}</span>
							)}
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							Level Eu (สำหรับปลา) : {level_eu || "-"}
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							ประเภทการแปรรูป : {process_name}
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							จำนวนถาด : {tray_count || "ไม่มีข้อมูล"} ถาด | น้ำหนักสุทธิ : {weight_RM || "ไม่มีข้อมูล"} กิโลกรัม
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							วันที่/เวลา ออกจากห้องเย็นใหญ่ : {withdraw_date_formatted || "ไม่มีข้อมูล"}
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							วันที่/เวลา เตรียมเสร็จ : {rmit_date || "ไม่มีข้อมูล"}
						</Typography>

						{dest === 'ไปบรรจุ' && qcData?.rm_status !== 'QcCheck รอแก้ไข' && (
							<Box sx={{
								border: "2px solid #000",
								borderRadius: "8px",
								padding: "10px",
								margin: "10px 0",
								backgroundColor: "#f9f9f9",
								'@media print': {
									border: "1px solid #000",
									borderRadius: "4px",
									padding: "3px",
									margin: "4px 0",
								},
							}}>
								<Typography
									variant="h6"
									className="print-text"
									sx={{
										color: "#464646",
										fontSize: "22px",
										fontWeight: "bold",
										margin: "5px 0",
										'@media print': {
											fontSize: '10px',
											fontWeight: 'bold',
											margin: '2px 0',
										},
									}}
								>
									บรรจุเสร็จ ภายใน ({(() => {
										const timeToUse = rework_time !== null ? rework_time : ptp_time;
										if (!timeToUse) return "ไม่มีข้อมูล";

										const timeParts = timeToUse.toString().split('.');
										const hours = parseInt(timeParts[0]) || 0;
										const minutes = timeParts.length > 1 ? parseInt(timeParts[1]) : 0;

										return `${hours} ชม ${minutes} นาที`;
									})()})
								</Typography>
								<Box sx={{
									display: 'flex',
									flexDirection: 'column',
									marginLeft: '15px',
									'@media print': {
										marginLeft: '5px',
									},
								}}>
									<Typography
										variant="body1"
										className="print-text"
										sx={{
											fontSize: "20px",
											margin: "3px 0",
											'@media print': {
												fontSize: '10px',
												margin: '1px 0',
											},
										}}
									>
										เริ่ม: {rework_time !== null ?
											(qcDateTime || "ไม่มีข้อมูล") :
											(rmit_date || "ไม่มีข้อมูล")}
									</Typography>
									<Typography
										variant="body1"
										className="print-text"
										sx={{
											fontSize: "20px",
											margin: "3px 0",
											'@media print': {
												fontSize: '10px',
												margin: '1px 0',
											},
										}}
									>
										ถึง: {calculatePackingEndTime(true) || "ไม่มีข้อมูล"}
									</Typography>
								</Box>
							</Box>
						)}

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							จุดออกใบเสร็จ :  {qcData?.location || "ไม่มีข้อมูล"}
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							ผู้ดำเนินการ : {qcData?.receiver}
						</Typography>

						{remark_rework_cold && (

							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
								},
							}}>
								หมายเหตุแก้ไข-ห้องเย็น : {remark_rework_cold}
							</Typography>
						)}

						{remark_rework && (

							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
								},
							}}>
								remark_rework : {remark_rework}
							</Typography>

						)}

						{edit_rework && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
								},
							}}>
								วิธีการที่ใช้แก้ไข : {edit_rework}
							</Typography>
						)}

						{qcData?.name_edit_prod_two && qcData?.name_edit_prod_two !== "-" && (
							<>
								<Typography variant="h6" className="print-title" sx={{
									color: "#000",
									padding: "5px 0 5px 0",
									margin: "10px",
									fontSize: "22px",
									'@media print': {
										fontSize: '12px',
										fontWeight: 'bold',
										margin: '4px 0',
										padding: '2px 0',
									},
								}}>
									วัตถุดิบนี้ถูกเปลี่ยนแผนผลิต
								</Typography>
								<Typography variant="h6" className="print-text" sx={{
									color: "#464646",
									fontSize: "22px",
									margin: "10px",
									'@media print': {
										fontSize: '10px',
										margin: '2px 0',
									},
								}}>
									แผนการผลิต ครั้งที่ 1 : {qcData?.first_prod || "-"}
								</Typography>
								<Typography variant="h6" className="print-text" sx={{
									color: "#464646",
									fontSize: "22px",
									margin: "10px",
									'@media print': {
										fontSize: '10px',
										margin: '2px 0',
									},
								}}>
									แผนการผลิต ครั้งที่ 2 : {qcData?.two_prod || "-"}
								</Typography>

								<Typography variant="h6" className="print-text" sx={{
									color: "#464646",
									fontSize: "22px",
									margin: "10px",
									'@media print': {
										fontSize: '10px',
										margin: '2px 0',
									},
								}}>
									ผู้อนุมัติแก้ไข ครั้งที่ 2: {qcData?.name_edit_prod_two}
								</Typography>

								{qcData?.three_prod && (
									<>
										<Typography variant="h6" className="print-text" sx={{
											color: "#464646",
											fontSize: "22px",
											margin: "10px",
											'@media print': {
												fontSize: '10px',
												margin: '2px 0',
											},
										}}>
											แผนการผลิต ครั้งที่ 3 : {qcData?.three_prod || "-"}
										</Typography>
										<Typography variant="h6" className="print-text" sx={{
											color: "#464646",
											fontSize: "22px",
											margin: "10px",
											'@media print': {
												fontSize: '10px',
												margin: '2px 0',
											},
										}}>
											ผู้อนุมัติแก้ไข ครั้งที่ 3: {qcData?.name_edit_prod_three}
										</Typography>
									</>
								)}


							</>
						)}
						{/* QC Section */}
						<Typography variant="h6" className="print-title" sx={{
							color: "#000",
							padding: "5px 0 5px 0",
							margin: "10px",
							fontSize: "22px",
							'@media print': {
								fontSize: '12px',
								fontWeight: 'bold',
								margin: '4px 0',
								padding: '2px 0',
							},
						}}>
							QC
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							Sensory : {qcData?.qccheck || "ไม่มีข้อมูล"} | MD : {qcData?.mdcheck || "ไม่มีข้อมูล"} | Defect : {qcData?.defectcheck || "ไม่มีข้อมูล"}
						</Typography>

						{qcData?.sq_acceptance === true && qcData?.sq_remark && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								wordBreak: 'break-word',
								whiteSpace: 'pre-line',
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
									wordBreak: 'break-word',
									whiteSpace: 'pre-line',
								},
							}}>
								ยอมรับพิเศษ หมายเหตุ Sensory : {qcData.sq_remark}
							</Typography>
						)}

						{/* สำหรับ Sensory ที่ไม่ยอมรับพิเศษ แต่มีหมายเหตุ */}
						{qcData?.sq_remark && qcData?.sq_acceptance !== true && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								wordBreak: 'break-word',
								whiteSpace: 'pre-line',
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
									wordBreak: 'break-word',
									whiteSpace: 'pre-line',
								},
							}}>
								หมายเหตุ Sensory : {qcData.sq_remark}
							</Typography>
						)}

						{qcData?.md_remark && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								wordBreak: 'break-word',
								whiteSpace: 'pre-line',
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
									wordBreak: 'break-word',
									whiteSpace: 'pre-line',
								},
							}}>
								หมายเหตุ MD : {qcData?.md_remark}
							</Typography>
						)}

						{qcData?.defect_remark && qcData?.defect_acceptance === true && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								wordBreak: 'break-word',
								whiteSpace: 'pre-line',
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
									wordBreak: 'break-word',
									whiteSpace: 'pre-line',
								},
							}}>
								ยอมรับพิเศษ หมายเหตุ Defect : {qcData.defect_remark}
							</Typography>
						)}

						{/* สำหรับ Defect ที่ไม่ยอมรับพิเศษ แต่มีหมายเหตุ */}
						{qcData?.defect_remark && qcData?.defect_acceptance !== true && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								wordBreak: 'break-word',
								whiteSpace: 'pre-line',
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
									wordBreak: 'break-word',
									whiteSpace: 'pre-line',
								},
							}}>
								หมายเหตุ Defect : {qcData.defect_remark}
							</Typography>
						)}
						{qcData?.Moisture && qcData?.Moisture !== "-" && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
								},
							}}>
								Moisture : {qcData?.Moisture || "-"} %
							</Typography>
						)}
						{qcData?.percent_fine && qcData?.percent_fine !== "-" && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
								},
							}}>
								Percent(%) Fine : {qcData?.percent_fine || "-"} %
							</Typography>
						)}
						{qcData?.Temp && qcData?.Temp !== "-" && (
							<Typography variant="h6" className="print-text" sx={{
								color: "#464646",
								fontSize: "22px",
								margin: "10px",
								'@media print': {
									fontSize: '10px',
									margin: '2px 0',
								},
							}}>
								Temperature : {qcData?.Temp || "-"} °C
							</Typography>
						)}

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							วัน/เวลา ที่เริ่มตรวจ MD: {qcData?.md_time_formatted || "ไม่มีข้อมูล"}
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							หมายเลขเครื่อง MD : {qcData?.WorkAreaCode || "MD"}/{qcData?.md_no || "ไม่มีข้อมูล"}
						</Typography>

						{/* วันที่/เวลา QC ตรวจสอบ ที่สามารถแก้ไขได้ - แบบปรับปรุงใหม่ */}
						<Box sx={{
							display: "flex",
							alignItems: "center",
							margin: "10px",
							flexDirection: "column",
							'@media print': {
								display: isEditing ? 'none' : 'flex',
								margin: '2px 0',
							},
						}}>
							<Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
								<Typography variant="h6" className="print-text" sx={{
									color: "#464646",
									fontSize: "22px",
									marginRight: "10px",
									'@media print': {
										fontSize: '10px',
										marginRight: '4px',
									},
								}}>
									วันที่/เวลา QC ตรวจสอบ:
								</Typography>



								{isEditing ? (
									<Box
										className="no-print"
										sx={{
											display: "flex",
											alignItems: "center",
											flexDirection: { xs: "column", sm: "row" },
											'@media print': {
												display: 'none',
											},
										}}
									>
										<LocalizationProvider dateAdapter={AdapterDayjs}>
											<DateTimePicker
												label="วัน/เวลา ตรวจสอบคุณภาพ"
												value={qcDate && qcTime ? dayjs(`${qcDate}T${qcTime}`) : null}
												onChange={(newValue) => {
													if (!newValue) return;

													const newDate = newValue.format("YYYY-MM-DD");
													const newTime = newValue.format("HH:mm");

													// ใช้ฟังก์ชันเดิมของคุณ
													handleDateChange({ target: { value: newDate } });
													handleTimeChange({ target: { value: newTime } });
												}}
												maxDateTime={dayjs()}
												ampm={false}
												timeSteps={{ minutes: 1 }}
												slotProps={{
													textField: {
														fullWidth: false,
														size: "small",
														sx: { width: 280, mr: 1 },
														InputProps: {
															startAdornment: (
																<InputAdornment position="start">
																	<CalendarTodayIcon fontSize="small" />
																	<AccessTimeIcon fontSize="small" sx={{ ml: 0.5 }} />
																</InputAdornment>
															),
														},
													},
												}}
											/>
										</LocalizationProvider>

										<Box sx={{
											mt: { xs: 2, sm: 0 },
											ml: { xs: 0, sm: 1 },
											display: "flex"
										}}>
											<Button
												variant="contained"
												onClick={saveQcDateTime}
												disabled={isLoading}
												sx={{
													backgroundColor: "#4CAF50",
													color: "white",
													height: "40px"
												}}
											>
												{isLoading ? "กำลังบันทึก..." : "บันทึก"}
											</Button>
											<Button
												variant="outlined"
												onClick={() => {
													setIsEditing(false);
													setErrorMessage("");
													if (data?.qcData?.qc_datetime_formatted) {
														const formattedDate = data.qcData.qc_datetime_formatted;
														setQcDateTime(formattedDate);

														// แยกวันที่และเวลา หากเป็นรูปแบบ YYYY-MM-DD HH:MM
														try {
															const dateTimeParts = formattedDate.split(' ');
															if (dateTimeParts.length === 2) {
																setQcDate(dateTimeParts[0]); // YYYY-MM-DD
																setQcTime(dateTimeParts[1]); // HH:MM
															}
														} catch (err) {
															console.error("ไม่สามารถแยกวันที่และเวลาได้:", err);
														}
													}
												}}
												disabled={isLoading}
												sx={{
													ml: 1,
													height: "40px"
												}}
											>
												ยกเลิก
											</Button>
										</Box>
									</Box>
								) : (
									<Box sx={{ display: "flex", alignItems: "center" }}>
										<Typography variant="h6" className="print-text" sx={{
											color: "#464646",
											fontSize: "22px",
											'@media print': {
												fontSize: '10px',
											},
										}}>
											{qcData?.qc_datetime_formatted || "ไม่มีข้อมูล"}
										</Typography>
										<Button
											variant="text"
											onClick={() => setIsEditing(true)}
											className="no-print"
											sx={{
												ml: 2,
												fontSize: "14px",
												'@media print': {
													display: 'none',
												},
											}}
										>
											แก้ไข
										</Button>
									</Box>
								)}
							</Box>

							{errorMessage && (
								<Typography
									className="no-print"
									sx={{
										color: "red",
										fontSize: "16px",
										mt: 1,
										'@media print': {
											display: 'none',
										},
									}}
								>
									{errorMessage}
								</Typography>
							)}
						</Box>




						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
							},
						}}>
							ผู้ดำเนินการตรวจสอบ : {qcData?.receiver_qc}
						</Typography>

						{qcData?.general_remark && (
							<Typography
								variant="h6"
								className="print-text"
								sx={{
									color: "#464646",
									fontSize: "22px",
									margin: "10px",
									marginBottom: '15px',
									wordBreak: 'break-word', // เพิ่มคุณสมบัตินี้เพื่อให้ข้อความขึ้นบรรทัดใหม่เมื่อยาวเกินไป
									whiteSpace: 'pre-line', // เพิ่มคุณสมบัตินี้เพื่อรักษาการขึ้นบรรทัดใหม่ที่มีอยู่แล้ว
									'@media print': {
										fontSize: '10px',
										margin: '2px 0',
										marginBottom: '15px',
										wordBreak: 'break-word',
										whiteSpace: 'pre-line',
									},
								}}
							>
								หมายเหตุทั่วไป : {qcData.general_remark}
							</Typography>
						)}

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
								marginBottom: '10px',
							},
						}}>
							วันที่เข้าห้องเย็น : ______/______/___________
						</Typography>

						<Typography variant="h6" className="print-text" sx={{
							color: "#464646",
							fontSize: "22px",
							margin: "10px",
							marginLeft: '110px',
							'@media print': {
								fontSize: '10px',
								margin: '2px 0',
								marginBottom: '10px',
								marginLeft: '45px',
							},
						}}>
							เวลา : _______:_______ น.
						</Typography>


					</Box>
				</Box>
			</Dialog>
		</>
	);
};

export default Modal3;