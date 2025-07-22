import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

const PrintTrolleyModal = ({ open, onClose, trolleyId, slotId }) => {
  const [trolleyData, setTrolleyData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [coldHistory, setColdHistory] = useState([]);

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

  // Fetch trolley data and cold storage history when the modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!open || !trolleyId) return;

      setIsLoading(true);
      try {
        // Fetch trolley data
        const trolleyResponse = await axios.get(`${API_URL}/api/coldstorage/fetchTrolleyMaterials`, {
          params: { tro_id: trolleyId }
        });

        if (trolleyResponse.data.success) {
          const trolleyInfo = {
            ...trolleyResponse.data,
            slot_id: slotId
          };
          setTrolleyData(trolleyInfo);

          // Fetch cold storage history for each material
          if (trolleyInfo.materials && trolleyInfo.materials.length > 0) {
            const historyPromises = trolleyInfo.materials.map(item =>
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
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, trolleyId]);

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
                ป้ายทะเบียน: {trolleyId || "-"}
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
                พื้นที่จอด: {slotId || "-"}
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" sx={{
            fontSize: fontSizes.value.screen,
            '@media print': {
              fontSize: fontSizes.value.print,
            },
          }}>
            วันที่พิมพ์: {formatThaiDateTime(currentDateTime.toISOString())}
          </Typography>
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
        {trolleyData && trolleyData.materials && (
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

            {trolleyData.materials.map((material, index) => (
              <MaterialItem
                key={index}
                index={index}
                item={material}
                history={coldHistory.find(hist => hist.materialIndex === index)?.history || []}
                qcDate={coldHistory.find(hist => hist.materialIndex === index)?.qc_date}
                reworkDate={coldHistory.find(hist => hist.materialIndex === index)?.rework_date}
                reworkTime={coldHistory.find(hist => hist.materialIndex === index)?.rework_time}
                totalItems={trolleyData.materials.length}
                calculateDBS={calculateDBS}
                calculateDCS={calculateDCS}
                calculateCorrectedDBS={calculateCorrectedDBS}
                formatThaiDateTime={formatThaiDateTime}
                formatSpecialChars={formatSpecialChars}
                gridGapScreen={gridGapScreen}
                gridGapPrint={gridGapPrint}
                fontSizes={fontSizes}
              />
            ))}
          </Box>
        )}

        {/* Manual Exit Time Writing Area */}
        <Box sx={{
          width: "100%",
          mt: 2,
          mb: 2,
          border: '1px dashed #ccc',
          padding: '12px',
          minHeight: '80px',
          '@media print': {
            marginTop: '8px',
            marginBottom: '8px',
            padding: '6px',
            minHeight: '60px',
          },
        }}>
          <Typography sx={{
            fontSize: fontSizes.value.screen,
            color: '#666',
            mb: 1,
            '@media print': {
              fontSize: fontSizes.value.print,
              marginBottom: '4px',
            },
          }}>
            วันที่ออกจากห้องเย็น : ______/______/___________
          </Typography>
          <Typography sx={{
            fontSize: fontSizes.value.screen,
            color: '#666',
            '@media print': {
              fontSize: fontSizes.value.print,
            },
          }}>
            เวลา : _______:_______ น.
          </Typography>
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
  fontSizes
}) => {
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
          <InfoItem label="Level EU" value={item.level_eu} fontSizes={fontSizes} />
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
          <InfoItem label="ชื่อวัตถุดิบ" value={`${item.materialName || "-"}`} fontSizes={fontSizes} />
          <InfoItem label="แผนการผลิต" value={`${item.production || "-"}`} fontSizes={fontSizes} />
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
          <InfoItem label="น้ำหนักรวม" value={`${item.weight_RM ? parseFloat(item.weight_RM).toFixed(2) : "-"} kg`} fontSizes={fontSizes} />
          <InfoItem label="จำนวนถาดรวม" value={`${item.tray_count || "-"} ถาด`} fontSizes={fontSizes} />
        </Box>

        {/* Cold Storage History */}
        <Typography variant="subtitle2" sx={{
          fontSize: fontSizes.materialTitle.screen,
          color: "#2388d1",
          mb: 0.5,
          mt: 1.5,
          fontWeight: "normal",
          '@media print': {
            fontSize: fontSizes.materialTitle.print,
            marginBottom: '2px',
            marginTop: '5px',
          },
        }}>
          ประวัติการเข้า-ออกห้องเย็น
        </Typography>

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
                <>
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

                  <Box sx={{
                    mb: 0.5,
                    '@media print': {
                      marginBottom: '1px',
                    },
                  }}>
                    <InlineInfoItem
                      label={`DCS${history.length > 1 ? ` ครั้งที่ ${entry.round}` : ''}`}
                      value={calculateDCS(entry.come_date, entry.out_date)}
                      fontSizes={fontSizes}
                    />
                  </Box>
                </>
              )}

              {entry.operator && entry.operator !== "unspecified" && (
                <Box sx={{
                  mb: 0.5,
                  '@media print': {
                    marginBottom: '1px',
                  },
                }}>
                  <InlineInfoItem
                    label="ผู้ทำรายการ"
                    value={entry.operator}
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

        {/* Time Information */}
        <Box sx={{
          mb: 0.5,
          mt: 1,
          '@media print': {
            marginTop: '5px',
            marginBottom: '1px',
          },
        }}>
          {/* Withdraw Time */}
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

        {/* QC Information */}
        <Box sx={{
          mt: 1.5,
          '@media print': {
            marginTop: '5px',
          },
        }}>
          <Box sx={{
            mb: 0.5,
            fontSize: fontSizes.value.screen,
            '@media print': {
              marginBottom: '1px',
              fontSize: fontSizes.value.print,
            },
          }}>
            <span style={{ color: '#666' }}>Sensory Check:</span> {item.qccheck || '-'}&nbsp;||&nbsp;
            {item.sq_remark && item.sq_acceptance === true ? (
              <>&nbsp;&nbsp;<span style={{ color: '#666' }}>ยอมรับพิเศษ Sensory:</span> {item.sq_remark}</>
            ) : (
              <>&nbsp;&nbsp;<span style={{ color: '#666' }}>หมายเหตุ Sensory:</span> {item.sq_remark || '-'}</>
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
            <span style={{ color: '#666' }}>Defect Check:</span> {item.defectcheck || '-'}&nbsp;||&nbsp;
            {item.defect_remark && item.defect_acceptance === true ? (
              <>&nbsp;&nbsp;<span style={{ color: '#666' }}>ยอมรับพิเศษ Defect:</span> {item.defect_remark}</>
            ) : (
              <>&nbsp;&nbsp;<span style={{ color: '#666' }}>หมายเหตุ Defect:</span> {item.defect_remark || '-'}</>
            )}
          </Box>

          {item.machine_MD && (
            <Box sx={{
              mb: 0.5,
              fontSize: fontSizes.value.screen,
              '@media print': {
                marginBottom: '5px',
                fontSize: fontSizes.value.print,
              },
            }}>
              <span style={{ color: '#666' }}>หมายเลขเครื่อง:</span> {formatSpecialChars(item.machine_MD)}
            </Box>
          )}
        </Box>

        {/* Cold Storage Sensory Check */}
        {(item.qccheck_cold || item.receiver_qc_cold) && (
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
          </>
        )}

        {/* Rework Information */}
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

export default PrintTrolleyModal;