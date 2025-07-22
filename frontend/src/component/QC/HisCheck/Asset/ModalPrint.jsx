import React, { useEffect } from "react";
import { Box, Button, Typography, Dialog } from '@mui/material';
import PrintIcon from "@mui/icons-material/Print";
import CancelIcon from "@mui/icons-material/CancelOutlined";

const ModalPrint = ({ open, onClose, rowData }) => {
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

  const handleAfterPrint = () => {
    onClose();
  };

  useEffect(() => {
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  // เพิ่มฟังก์ชันคำนวณเวลาบรรจุเสร็จ
  const calculatePackingEndTime = (endTimeOnly = false) => {
    const { rework_time, prep_to_pack_time, dest, qc_datetime_formatted, rmit_date } = rowData || {};

    // ตรวจสอบว่าควรใช้ rework_time หรือ ptp_time
    const timeToUse = rework_time !== null ? rework_time : prep_to_pack_time;

    if (!timeToUse || dest !== 'ไปบรรจุ') return "ไม่มีข้อมูล";

    // กำหนดวันที่เริ่มต้นตามเงื่อนไข
    let startDateTime;

    try {
      if (rework_time !== null) {
        // ถ้าใช้ rework_time ให้ใช้วันที่ QC ตรวจสอบเป็นจุดเริ่มต้น
        if (!qc_datetime_formatted) return "ไม่มีข้อมูล";

        // แปลงรูปแบบวันที่ให้ถูกต้องก่อนสร้าง Date object
        const dateTimeStr = qc_datetime_formatted.replace(' ', 'T') + ':00';
        startDateTime = new Date(dateTimeStr);

        // ตรวจสอบว่า Date object ถูกต้อง
        if (isNaN(startDateTime.getTime())) {
          console.error('Invalid qcDateTime:', qc_datetime_formatted);
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

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason === 'backdropClick') return; // ไม่ให้ปิดเมื่อคลิกพื้นที่นอก
        onClose();
      }}
      sx={{
        '& .MuiDialog-paper': {
          width: '850px', // กำหนดความกว้างของ Dialog
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
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
          '@media print': {
            display: 'none',
          },
        }} className="no-print">
          <Button
            variant="contained"
            onClick={onClose}
            startIcon={<CancelIcon />}
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
            onClick={handlePrint}
            startIcon={<PrintIcon />}
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
          {/* Header for thermal printer */}
          <Typography className="print-header" sx={{
            textAlign: 'center',
            marginBottom: '8px',
            display: 'none',
            '@media print': {
              display: 'block',
              marginBottom: '2mm',
            },
          }}>
            ประวัติการตรวจสอบคุณภาพ QC
          </Typography>

          {rowData?.prepare_mor_night && rowData?.prepare_mor_night !== "-" && (
            <Typography variant="h6" sx={{
              color: "#000",
              textAlign: 'center',
              fontSize: "24px",
              margin: "10px",
              '@media print': {
                fontSize: '14px',
                margin: '2px 0',
              },
            }}>
              เตรียมงานให้กะ : {rowData?.prepare_mor_night}
            </Typography>
          )}

          {/* แถวหัวข้อ */}
          <Box
            sx={{
              height: "50px",
              width: "600px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              '@media print': {
                height: 'auto',
                width: '100%',
              },
            }}
          >
            <Box
              sx={{
                height: "50px",
                width: "280px",
                border: "2px solid #000",
                display: "flex",
                justifyContent: "center",
                borderTopLeftRadius: "8px",
                borderBottomLeftRadius: "8px",
                alignItems: "center",
                fontSize: "22px",
                '@media print': {
                  height: 'auto',
                  width: '50%',
                  fontSize: '10px',
                  padding: '2px',
                  borderRadius: '4px 0 0 4px',
                  borderWidth: '1px',
                }
              }}>
              ป้ายทะเบียน : {rowData?.tro_id || "ไม่มีข้อมูล"}
            </Box>
            <Box
              sx={{
                height: "50px",
                width: "280px",
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
                  width: '50%',
                  fontSize: '10px',
                  padding: '2px',
                  borderRadius: '0 4px 4px 0',
                  borderWidth: '1px',
                }
              }}>
              สถานที่จัดส่ง : {rowData?.dest === 'เข้าห้องเย็น' ? 'เข้าห้องเย็น' : (rowData?.dest === 'ไปบรรจุ' || rowData?.dest === 'บรรจุ') ? rowData?.rmm_line_name : (rowData?.dest || "ไม่มีข้อมูล")}            </Box>
          </Box>

          {/* ส่วน Production */}
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
            ชื่อวัตถุดิบ : {rowData?.mat_name || "ไม่มีข้อมูล"}
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
            Batch : {rowData?.batch_after || "ไม่มีข้อมูล"}
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
            แผนการผลิต : {rowData?.production || "ไม่มีข้อมูล"}
            {rowData?.dest === 'เข้าห้องเย็น' && (
              <span style={{ marginLeft: "20px" }}>สถานที่บรรจุ : {rowData?.rmm_line_name || "ไม่มีข้อมูล"}</span>
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
            Level Eu (สำหรับปลา) : {rowData?.level_eu || "-"}
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
            ประเภทการแปรรูป: {rowData?.process_name}
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
            จำนวนถาด : {rowData?.tray_count || "ไม่มีข้อมูล"} ถาด | น้ำหนักสุทธิ : {rowData?.weight_RM || "ไม่มีข้อมูล"} กิโลกรัม
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
            วันที่/เวลา เบิกจากห้องเย็นใหญ่: {rowData?.withdraw_date_formatted || "ไม่มีข้อมูล"}
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
            วันที่/เวลา ที่เตรียมเสร็จ : {rowData?.rmit_date || "ไม่มีข้อมูล"}
          </Typography>

          {/* เพิ่มส่วนแสดงผล "บรรจุเสร็จ ภายใน" */}
          {rowData?.dest === 'ไปบรรจุ' && (
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
                  const timeToUse = rowData?.rework_time !== null ? rowData?.rework_time : rowData?.prep_to_pack_time;
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
                  เริ่ม: {rowData?.rework_time !== null ?
                    (rowData?.qc_datetime_formatted || "ไม่มีข้อมูล") :
                    (rowData?.rmit_date || "ไม่มีข้อมูล")}
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
            ผู้ดำเนินการ : {rowData?.receiver || "-"}
          </Typography>



          {rowData?.name_edit_prod_two && rowData?.name_edit_prod_two !== "-" && (
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
                วัตถุดิบนี้ถูกเปลี่ยน Line
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
                Line ครั้งที่ 1 : {rowData?.first_prod || "-"}
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
                Line ครั้งที่ 2 : {rowData?.two_prod || "-"}
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
                ชื่อผู้อนุมัติแก้ไข ครั้งที่ 2 : {rowData?.name_edit_prod_two}
              </Typography>

              {rowData?.three_prod && (
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
                    Line ครั้งที่ 3 : {rowData?.three_prod || "-"}
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
                    ชื่อผู้อนุมัติแก้ไข ครั้งที่ 3 : {rowData?.name_edit_prod_three}
                  </Typography>
                </>
              )}
            </>
          )}

          {rowData?.remark_rework || rowData?.remark_rework_cold && rowData?.edit_rework !== "-" && (
            <>
              {rowData?.remark_rework_cold && (
                <Typography variant="h6" className="print-text" sx={{
                  color: "#464646",
                  fontSize: "22px",
                  margin: "10px",
                  '@media print': {
                    fontSize: '10px',
                    margin: '2px 0',
                  },
                }}>
                  หมายเหตุแก้ไข-ห้องเย็น : {rowData?.remark_rework_cold || "-"}
                </Typography>)}


              {rowData?.remark_rework && (
                <Typography variant="h6" className="print-text" sx={{
                  color: "#464646",
                  fontSize: "22px",
                  margin: "10px",
                  '@media print': {
                    fontSize: '10px',
                    margin: '2px 0',
                  },
                }}>
                  หมายเหตุแก้ไข-บรรจุ : {rowData?.remark_rework || "-"}
                </Typography>)}


              <Typography variant="h6" className="print-text" sx={{
                color: "#464646",
                fontSize: "22px",
                margin: "10px",
                '@media print': {
                  fontSize: '10px',
                  margin: '2px 0',
                },
              }}>
                ประวัติการแก้ไข : {rowData?.edit_rework || "-"}
              </Typography>
            </>
          )}

          {/* ส่วน QC */}
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
            Sensory : {rowData?.qccheck || "ไม่มีข้อมูล"} | MD : {rowData?.mdcheck || "ไม่มีข้อมูล"} | Defect : {rowData?.defectcheck || "ไม่มีข้อมูล"}
          </Typography>

          {rowData?.sq_acceptance === true && rowData?.sq_remark && (
            <Typography variant="h6" className="print-text" sx={{
              color: "#464646",
              fontSize: "22px",
              margin: "10px", wordBreak: 'break-word', whiteSpace: 'pre-line',
              '@media print': {
                fontSize: '10px',
                margin: '2px 0', wordBreak: 'break-word', whiteSpace: 'pre-line',
              },
            }}>
              ยอมรับพิเศษ หมายเหตุ Sensory : {rowData.sq_remark}
            </Typography>
          )}

          {/* สำหรับ Sensory ที่ไม่ยอมรับพิเศษ แต่มีหมายเหตุ */}
          {rowData?.sq_remark && rowData?.sq_acceptance !== true && (
            <Typography variant="h6" className="print-text" sx={{
              color: "#464646",
              fontSize: "22px",
              margin: "10px", wordBreak: 'break-word', whiteSpace: 'pre-line',
              '@media print': {
                fontSize: '10px',
                margin: '2px 0', wordBreak: 'break-word', whiteSpace: 'pre-line',
              },
            }}>
              หมายเหตุ Sensory : {rowData.sq_remark}
            </Typography>
          )}

          {rowData?.md_remark && (
            <Typography variant="h6" className="print-text" sx={{
              color: "#464646",
              fontSize: "22px",
              margin: "10px", wordBreak: 'break-word', whiteSpace: 'pre-line',
              '@media print': {
                fontSize: '10px',
                margin: '2px 0', wordBreak: 'break-word', whiteSpace: 'pre-line',
              },
            }}>
              หมายเหตุ MD : {rowData?.md_remark}
            </Typography>
          )}

          {rowData?.defect_acceptance === true && rowData?.defect_remark && (
            <Typography variant="h6" className="print-text" sx={{
              color: "#464646",
              fontSize: "22px",
              margin: "10px", wordBreak: 'break-word', whiteSpace: 'pre-line',
              '@media print': {
                fontSize: '10px',
                margin: '2px 0', wordBreak: 'break-word', whiteSpace: 'pre-line',
              },
            }}>
              ยอมรับพิเศษ หมายเหตุ Defect : {rowData.defect_remark}
            </Typography>
          )}

          {/* สำหรับ Sensory ที่ไม่ยอมรับพิเศษ แต่มีหมายเหตุ */}
          {rowData?.defect_remark && rowData?.defect_acceptance !== true && (
            <Typography variant="h6" className="print-text" sx={{
              color: "#464646",
              fontSize: "22px",
              margin: "10px", wordBreak: 'break-word', whiteSpace: 'pre-line',
              '@media print': {
                fontSize: '10px',
                margin: '2px 0', wordBreak: 'break-word', whiteSpace: 'pre-line',
              },
            }}>
              หมายเหตุ Defect : {rowData.defect_remark}
            </Typography>
          )}
          {rowData.Moisture && rowData.Moisture !== "-" && (
            <Typography variant="h6" className="print-text" sx={{
              color: "#464646",
              fontSize: "22px",
              margin: "10px",
              '@media print': {
                fontSize: '10px',
                margin: '2px 0',
              },
            }}>
              Moisture (สำหรับวัตถุดิบ MDM) : {rowData.Moisture} %
            </Typography>
          )}

          {rowData.percent_fine && rowData.percent_fine !== "-" && (
            <Typography variant="h6" className="print-text" sx={{
              color: "#464646",
              fontSize: "22px",
              margin: "10px",
              '@media print': {
                fontSize: '10px',
                margin: '2px 0',
              },
            }}>
              Percent Fine (สำหรับวัตถุดิบ MDM) : {rowData.percent_fine} %
            </Typography>
          )}

          {rowData.Temp && rowData.Temp !== "-" && (
            <Typography variant="h6" className="print-text" sx={{
              color: "#464646",
              fontSize: "22px",
              margin: "10px",
              '@media print': {
                fontSize: '10px',
                margin: '2px 0',
              },
            }}>
              Temp : {rowData.Temp} °C
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
            วัน/เวลา ที่เริ่มตรวจ MD : {rowData.md_time_formatted || "-"}
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
            พื้นที่/หมายเลขเครื่อง : {rowData?.WorkAreaName ? `${rowData.WorkAreaName} (${rowData.WorkAreaCode || '-'}/${rowData.md_no || '-'})` : `${rowData.WorkAreaCode || '-'}/${rowData.md_no || '-'}`}
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
            วันที่/เวลา QC ตรวจสอบ : {rowData?.qc_datetime_formatted || "-"}
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
            ผู้ดำเนินการตรวจสอบ : {rowData?.receiver_qc || "-"}
          </Typography>



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

          <Typography variant="h6" className="print-text" sx={{
            color: "#464646",
            fontSize: "22px",
            margin: "10px",
            wordBreak: 'break-word', // เพิ่มคุณสมบัตินี้เพื่อให้ข้อความขึ้นบรรทัดใหม่เมื่อยาวเกินไป
            whiteSpace: 'pre-line', // เพิ่มคุณสมบัตินี้เพื่อรักษาการขึ้นบรรทัดใหม่ที่มีอยู่แล้ว
            '@media print': {
              fontSize: '10px',
              margin: '2px 0',
              marginBottom: '10px',
              wordBreak: 'break-word',
              whiteSpace: 'pre-line',
            },
          }}>
            หมายเหตุทั่วไป : {rowData?.general_remark || "-"}
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};

export default ModalPrint;