import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress
} from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL;

const ModalPrint = ({ open, onClose, rowData }) => {
  const [isLoading, setIsLoading] = useState(false);

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
        
        .hide-on-print {
          display: none !important;
        }
      }
    `;

    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // จัดรูปแบบวันที่ไทย
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

  // คำนวณระยะเวลาระหว่างวันที่
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

  // ฟังก์ชันแปลง / เป็น -
  const formatSpecialChars = (value) => {
    if (!value) return "-";
    return value === "/" ? "-" : value;
  };

  // คำนวณ DBS (Duration Between Processing and Cold Storage)
  const calculateDBS = (standardPtc, ptcTime) => {
    if (!standardPtc || !ptcTime) return "-";

    try {
      // แปลงเวลาจากรูปแบบ HH.MM เป็นนาที
      const standardParts = standardPtc.toString().split('.');
      const ptcParts = ptcTime.toString().split('.');

      // แปลงชั่วโมงเป็นนาที และรวมกับนาที
      const standardMinutes = parseInt(standardParts[0]) * 60 +
        (standardParts.length > 1 ? parseInt(standardParts[1]) : 0);
      const ptcMinutes = parseInt(ptcParts[0]) * 60 +
        (ptcParts.length > 1 ? parseInt(ptcParts[1]) : 0);

      // คำนวณความแตกต่าง
      let diffMinutes = standardMinutes - ptcMinutes;

      // ถ้าติดลบ ให้แสดงเป็น 0
      if (diffMinutes < 0) diffMinutes = 0;

      // แปลงเป็นชั่วโมงและนาที
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      // สร้างข้อความแสดงผล
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

  // คำนวณ DCS (Duration in Cold Storage)
  const calculateDCS = (comeColdDate, outColdDate) => {
    return calculateTimeDifference(comeColdDate, outColdDate);
  };

  const handlePrint = () => {
    window.print();
  };

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
        <Box
          className="hide-on-print"
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            mb: 2
          }}
        >
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

        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Header */}
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
            ประวัติข้อมูลรถเข็นวัตถุดิบในห้องเย็น
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
                ป้ายทะเบียน: {rowData?.trolleyId || "-"}
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
                  สถานที่จัดส่ง: {
  (rowData?.cold_dest === "จุดเตรียม") 
    ? rowData.cold_dest 
    : (rowData?.materials?.[0]?.code?.split('(')[1]?.replace(')', '') || rowData?.cold_dest || "ไม่มีข้อมูล")
}
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

        {/* Trolley General Information Section */}
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
            <InfoItem label="น้ำหนักรวม" value={`${rowData?.totalWeight ? parseFloat(rowData.totalWeight).toFixed(2) : "-"} kg`} fontSizes={fontSizes} />
            <InfoItem label="จำนวนถาดรวม" value={`${rowData?.totalTrayCount || "-"} ถาด`} fontSizes={fontSizes} />
            <InfoItem label="พื้นที่จอด" value={rowData?.roomAndSlot || "-"} fontSizes={fontSizes} />
            <InfoItem label="ผู้ดำเนินการ" value={rowData?.operator || "-"} fontSizes={fontSizes} />
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

        {/* Materials Section */}
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
            รายการวัตถุดิบในรถเข็น ({rowData?.materials?.length || 0} รายการ)
          </Typography>

          {rowData?.materials?.map((material, index) => (
            <MaterialItem
              key={index}
              index={index}
              material={{
                ...material,
                mix_time: material.mix_time,
                cold_to_pack_time: material.cold_to_pack_time,
                cold_to_pack: material.cold_to_pack,
                rework_time: material.rework_time
              }}
              totalItems={rowData?.materials?.length || 0}
              formatThaiDateTime={formatThaiDateTime}
              formatSpecialChars={formatSpecialChars}
              calculateTimeDifference={calculateTimeDifference}
              calculateDBS={calculateDBS}
              calculateDCS={calculateDCS}
              gridGapScreen={gridGapScreen}
              gridGapPrint={gridGapPrint}
              fontSizes={fontSizes}
            />
          ))}
        </Box>

        {/* Print Date at Bottom */}
        <Box sx={{
          width: "100%",
          textAlign: 'center',
          mt: 2,
          '@media print': {
            marginTop: '10px',
          },
        }}>
          <Typography sx={{
            fontSize: fontSizes.value.screen,
            '@media print': {
              fontSize: fontSizes.value.print,
            },
          }}>
            วันที่พิมพ์: {formatThaiDateTime(new Date())} น.
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};

// Reusable component for Info Items (Label: Value)
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

// Inline Format for Info Items (Label: Value on same line)
const InlineInfoItem = ({ label, value, fontSizes }) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    '@media print': {
      marginBottom: '2px',
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

// Material Item Component
const MaterialItem = ({
  index,
  material,
  totalItems,
  formatThaiDateTime,
  formatSpecialChars,
  calculateTimeDifference,
  calculateDBS,
  calculateDCS,
  gridGapScreen,
  gridGapPrint,
  fontSizes
}) => {
  // แยกประวัติเข้าและออกห้องเย็น
  const entryExitHistory = material.entryExitHistory || [];

  // Function to calculate packaging deadline
  const calculatePackagingDeadline = (history, mix_time, rework_time, cold_to_pack_time, cold_to_pack) => {
    if (!history || history.length === 0) {
      return { start: null, end: null, timeAllowed: null, timeAllowedLabel: null, isExpired: false };
    }

    // Find the latest out_date from history (exit history)
    let latestOutDate = null;
    const sortedExitHistory = [...history].filter(entry => entry.type !== 'enterColdRoom')
      .sort((a, b) => b.sequence - a.sequence);

    if (sortedExitHistory.length > 0) {
      latestOutDate = sortedExitHistory[0].time;
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
        {/* Material Info - Row 1 */}
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
          <InfoItem label="รหัสวัตถุดิบ" value={material.mat || "-"} fontSizes={fontSizes} />
          <InfoItem label="Batch" value={material.batch || "-"} fontSizes={fontSizes} />
        </Box>

        {/* Material Name - Full Width */}
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
          <InfoItem label="ชื่อวัตถุดิบ" value={material.rawMaterialName || "-"} fontSizes={fontSizes} />
          <InfoItem label="Level Eu" value={material.level_eu || "-"} fontSizes={fontSizes} />
        </Box>

        {/* Material Info - Row 2 */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: gridGapScreen,
          mb: 0.5,
          '@media print': {
            gap: gridGapPrint,
            marginBottom: '5px',
          },
        }}>
          <InfoItem label="น้ำหนัก" value={`${material.weight ? parseFloat(material.weight).toFixed(2) : "-"} kg`} fontSizes={fontSizes} />
          <InfoItem label="จำนวนถาด" value={`${material.trayCount || "-"} ถาด`} fontSizes={fontSizes} />
        </Box>

        {/* Cold Storage History */}
        {entryExitHistory.length > 0 ? (
          <>
            <Typography variant="subtitle2" sx={{
              fontSize: fontSizes.materialTitle.screen,
              color: "#2388d1",
              mb: 0,
              fontWeight: "normal",
              '@media print': {
                fontSize: fontSizes.materialTitle.print,
                marginBottom: '0px',
                marginTop: '0px',
              },
            }}>
              ประวัติการเข้า-ออกห้องเย็น
            </Typography>

            {/* แสดงประวัติการเข้าห้องเย็นก่อน */}
            {entryExitHistory.filter(entry => entry.type === 'enterColdRoom').map((entry, idx) => (
              <Box key={`enter-${idx}`} sx={{
                mb: 0,
                mt: 0,
                py: 0.5,
                borderTop: idx > 0 ? '1px dotted #eee' : 'none',
                '@media print': {
                  marginBottom: '2px',
                  marginTop: '2px',
                  paddingTop: '1px',
                  paddingBottom: '1px',
                },
              }}>
                <Box sx={{
                  mb: 0,
                  '@media print': {
                    marginBottom: '1px',
                  },
                }}>
                  <InlineInfoItem
                    label={`เวลาเข้าห้องเย็น (ครั้งที่ ${entry.sequence})`}
                    value={formatThaiDateTime(entry.time) + " น."}
                    fontSizes={fontSizes}
                  />
                </Box>

                <Box sx={{
                  mb: 0.5,
                  '@media print': {
                    marginBottom: '1px',
                  },
                }}>
                  <InlineInfoItem
                    label="ผู้ทำรายการ"
                    value={entry.operator && entry.operator !== "unspecified" ? entry.operator : "-"}
                    fontSizes={fontSizes}
                  />
                </Box>
              </Box>
            ))}

            {/* จากนั้นแสดงประวัติการออกห้องเย็น */}
            {entryExitHistory.filter(entry => entry.type !== 'enterColdRoom').map((entry, idx) => (
              <Box key={`exit-${idx}`} sx={{
                mb: 1,
                mt: 1,
                py: 0.5,
                borderTop: '1px dotted #eee',
                '@media print': {
                  marginBottom: '2px',
                  marginTop: '2px',
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
                    label={`เวลาออกห้องเย็น (ครั้งที่ ${entry.sequence})`}
                    value={formatThaiDateTime(entry.time) + " น."}
                    fontSizes={fontSizes}
                  />
                </Box>

                <Box sx={{
                  mb: 0.5,
                  '@media print': {
                    marginBottom: '1px',
                  },
                }}>
                  <InlineInfoItem
                    label="ผู้ทำรายการ"
                    value={entry.operator && entry.operator !== "unspecified" ? entry.operator : "-"}
                    fontSizes={fontSizes}
                  />
                </Box>

                {/* แสดง DCS สำหรับการออกห้องเย็นแต่ละครั้ง */}
                {entryExitHistory.find(enter =>
                  enter.type === 'enterColdRoom' && enter.sequence === entry.sequence
                ) && (
                    <Box sx={{
                      mb: 0.5,
                      '@media print': {
                        marginBottom: '1px',
                      },
                    }}>
                      <InlineInfoItem
                        label={`DCS ครั้งที่ ${entry.sequence}`}
                        value={calculateDCS(
                          entryExitHistory.find(enter =>
                            enter.type === 'enterColdRoom' && enter.sequence === entry.sequence
                          ).time,
                          entry.time
                        )}
                        fontSizes={fontSizes}
                      />
                    </Box>
                  )}
              </Box>
            ))}
          </>
        ) : (
          <Box sx={{
            textAlign: 'center',
            mt: 1,
            color: '#666',
            '@media print': {
              marginTop: '3px',
            },
          }}>
            <Typography sx={{
              fontSize: fontSizes.value.screen,
              '@media print': {
                fontSize: fontSizes.value.print,
              },
            }}>
              ไม่พบประวัติการเข้า-ออกห้องเย็น
            </Typography>
          </Box>
        )}

        {/* Process Date Information */}
        <Box sx={{
          mt: 1.5,
          '@media print': {
            marginTop: '5px',
          },
        }}>
          {material.withdraw_date && (
            <Box sx={{
              mb: 0.5,
              '@media print': {
                marginBottom: '1px',
              },
            }}>
              <InlineInfoItem
                label="เวลาเบิกจากห้องเย็นใหญ่"
                value={formatThaiDateTime(material.withdraw_date) + " น."}
                fontSizes={fontSizes}
              />
            </Box>
          )}
          {material.cooked_date && (
            <Box sx={{
              mb: 0.5,
              '@media print': {
                marginBottom: '1px',
              },
            }}>
              <InlineInfoItem
                label="เวลาต้มเสร็จ/อบเสร็จ"
                value={formatThaiDateTime(material.cooked_date) + " น."}
                fontSizes={fontSizes}
              />
            </Box>
          )}

          {material.rmit_date && (
            <Box sx={{
              mb: 0.5,
              '@media print': {
                marginBottom: '1px',
              },
            }}>
              <InlineInfoItem
                label="เวลาเตรียมเสร็จ"
                value={formatThaiDateTime(material.rmit_date) + " น."}
                fontSizes={fontSizes}
              />
            </Box>
          )}

          {/* DBS - ระยะเวลาจากต้มเสร็จถึงเข้าห้องเย็น */}
          {material.standard_ptc && material.ptc_time && (
            <Box sx={{
              mb: 0.5,
              '@media print': {
                marginTop: '1px',
                marginBottom: '6px',
                paddingTop: '1px',
              },
            }}>
              <InlineInfoItem
                label="DBS เตรียม - เข้า CS"
                value={calculateDBS(material.standard_ptc, material.ptc_time)}
                fontSizes={fontSizes}
              />
            </Box>
          )}
        </Box>

        {/* Packaging Deadline Section */}
        {(() => {
          const deadlineInfo = calculatePackagingDeadline(
            entryExitHistory,
            material.mix_time,
            material.rework_time,
            material.cold_to_pack_time,
            material.cold_to_pack
          );

          // Only show if cold_dest is packaging and we have valid data
          if (deadlineInfo.start && deadlineInfo.end && material.cold_dest === "บรรจุ") {
            return (
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
            );
          }
          return null;
        })()}

        {/* QC Information */}
        <Box sx={{
          mt: 1.5,
          '@media print': {
            marginTop: '5px',
          },
        }}>
          {material.name_edit_prod_two && material.name_edit_prod_two !== "-" && (
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
                <span style={{ color: '#666' }}>แผนการผลิต ครั้งที่ 1:</span> {material.first_prod || '-'}
              </Box>
              <Box sx={{
                mb: 0.5,
                fontSize: fontSizes.value.screen,
                '@media print': {
                  marginBottom: '1px',
                  fontSize: fontSizes.value.print,
                },
              }}>
                <span style={{ color: '#666' }}>แผนการผลิต ครั้งที่ 2:</span> {material.two_prod || '-'}
              </Box>
              <Box sx={{
                mb: 0.5,
                fontSize: fontSizes.value.screen,
                '@media print': {
                  marginBottom: '1px',
                  fontSize: fontSizes.value.print,
                },
              }}>
                <span style={{ color: '#666' }}>ผู้อนุมัติแก้ไข ครั้งที่ 2:</span> {material.two_prod || '-'}
              </Box>


              {material.three_prod && (
                <>
                  <Box sx={{
                    mb: 0.5,
                    fontSize: fontSizes.value.screen,
                    '@media print': {
                      marginBottom: '1px',
                      fontSize: fontSizes.value.print,
                    },
                  }}>
                    <span style={{ color: '#666' }}>แผนการผลิต ครั้งที่ 3:</span> {material.three_prod || '-'}
                  </Box>

                  <Box sx={{
                    mb: 0.5,
                    fontSize: fontSizes.value.screen,
                    '@media print': {
                      marginBottom: '1px',
                      fontSize: fontSizes.value.print,
                    },
                  }}>
                    <span style={{ color: '#666' }}>ผู้อนุมัติแก้ไข ครั้งที่ 3:</span> {material.name_edit_prod_three}
                  </Box>
                </>
              )}

            </>
          )}
          <Box sx={{
            mb: 0.5,
            fontSize: fontSizes.value.screen,
            '@media print': {
              marginBottom: '1px',
              fontSize: fontSizes.value.print,
            },
          }}>
            <span style={{ color: '#666' }}>Sensory Check:</span> {material.qccheck || '-'}&nbsp;||&nbsp;
            {material.sq_remark && material.sq_acceptance === true ? (
              <>&nbsp;&nbsp;<span style={{ color: '#666' }}>ยอมรับพิเศษ Sensory:</span> {material.sq_remark}</>
            ) : (
              <>&nbsp;&nbsp;<span style={{ color: '#666' }}>หมายเหตุ Sensory:</span> {material.sq_remark || '-'}</>
            )}
          </Box>

          <Box sx={{
            mb: 0.5,
            fontSize: fontSizes.value.screen,
            '@media print': {
              marginBottom: '1px',
              fontSize: fontSizes.value.print,
            },
          }}>
            <span style={{ color: '#666' }}>MD Check:</span> {material.mdcheck || '-'}&nbsp;||&nbsp;
            <span style={{ color: '#666' }}>หมายเหตุ MD:</span> {material.md_remark || '-'}
          </Box>

          <Box sx={{
            mb: 0.5,
            fontSize: fontSizes.value.screen,
            '@media print': {
              marginBottom: '1px',
              fontSize: fontSizes.value.print,
            },
          }}>
            <span style={{ color: '#666' }}>Defect Check:</span> {material.defectcheck || '-'}&nbsp;||&nbsp;
            {material.defect_remark && material.defect_acceptance === true ? (
              <>&nbsp;&nbsp;<span style={{ color: '#666' }}>ยอมรับพิเศษ Defect:</span> {material.defect_remark}</>
            ) : (
              <>&nbsp;&nbsp;<span style={{ color: '#666' }}>หมายเหตุ Defect:</span> {material.defect_remark || '-'}</>
            )}
          </Box>

          {material.machine_MD && (
            <Box sx={{
              mb: 0.5,
              fontSize: fontSizes.value.screen,
              '@media print': {
                marginBottom: '5px',
                fontSize: fontSizes.value.print,
              },
            }}>
              <span style={{ color: '#666' }}>หมายเลขเครื่อง:</span> {formatSpecialChars(material.machine_MD)}
            </Box>
          )}

        </Box>
        {material.qccheck_cold && (
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

            <Box sx={{
              mb: 0.5,
              fontSize: fontSizes.value.screen,
              '@media print': {
                marginBottom: '1px',
                fontSize: fontSizes.value.print,
              },
            }}>
              <span style={{ color: '#666' }}>ผลการตรวจสอบ:</span> {material.qccheck_cold}
            </Box>

            {material.remark_rework && (
              <Box sx={{
                mb: 0.5,
                fontSize: fontSizes.value.screen,
                '@media print': {
                  marginBottom: '1px',
                  fontSize: fontSizes.value.print,
                },
              }}>
                <span style={{ color: '#666' }}>หมายเหตุ:</span> {material.remark_rework}
              </Box>
            )}

            {material.receiver_qc_cold && (
              <Box sx={{
                mb: 0.5,
                fontSize: fontSizes.value.screen,
                '@media print': {
                  marginBottom: '1px',
                  fontSize: fontSizes.value.print,
                },
              }}>
                <span style={{ color: '#666' }}>ผู้ตรวจสอบ:</span> {material.receiver_qc_cold}
              </Box>
            )}
          </>
        )}

        {material?.prepare_mor_night && (
          <Typography variant="h6" sx={{
            fontSize: fontSizes.value.screen,
            fontWeight: "normal",
            mb: 0.5,
            '@media print': {
              fontSize: fontSizes.value.print,
              marginBottom: '2px',
            },
          }}>
            เตรียมงานให้กะ : {material?.prepare_mor_night}
          </Typography>
        )}



      </Box>
    </Box>
  );
};

export default ModalPrint