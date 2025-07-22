import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  CircularProgress
} from "@mui/material";

const API_URL = import.meta.env.VITE_API_URL;

const ParkingLayoutCOLarge = ({ onSlotClick }) => {
  const [rows, setRows] = useState({});
  const [columns, setColumns] = useState([]);
  const [socket, setSocket] = useState(null);
  const [reservations, setReservations] = useState(new Map());
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // สร้างคอลัมน์ aa ถึง aj
  const generateColumns = () => {
    const cols = [];
    for (let i = 0; i < 10; i++) {
      cols.push(String.fromCharCode(97) + String.fromCharCode(97 + i)); // aa, ab, ac,..., aj
    }
    return cols;
  };

  // สร้างแถว 0 ถึง 9
  const generateRows = () => {
    const rows = {};
    for (let i = 0; i < 10; i++) {
      rows[i.toString()] = {};
    }
    return rows;
  };

  // Function to format slot data
  const formatSlotData = (slotData) => {
    const columnSet = new Set(generateColumns());
    const formattedRows = generateRows();

    slotData.forEach((item) => {
      const [col, row] = [item.slot_id.slice(0, 2), item.slot_id.slice(2)];
      if (formattedRows[row] && columnSet.has(col)) {
        formattedRows[row][col] = item;
      }
    });

    return {
      columns: Array.from(columnSet),
      rows: formattedRows
    };
  };

  // Function to fetch and update slots
  const fetchSlots = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/coldstorage/room`, { credentials: "include" });
      const data = await response.json();

      if (data.slot) {
        const slotData = data.slot.filter((item) => item.cs_id === 8 && item.slot_status);
        const formatted = formatSlotData(slotData);

        setColumns(formatted.columns);
        setRows(formatted.rows);
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!API_URL) {
      console.error("❌ API_URL is not defined.");
      return;
    }

    // Socket connection
    const newSocket = io(API_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      fetchSlots();
    });

    newSocket.on("disconnect", () => {
      console.warn("⚠️ Socket disconnected.");
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    newSocket.on("slotUpdated", async (updatedSlot) => {
      console.log("🔄 Slot update received:", updatedSlot);
      await fetchSlots();
    });

    newSocket.on("reservationError", (error) => {
      console.error("❌ Reservation error:", error.message);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.off("slotUpdated");
        newSocket.off("reservationError");
        newSocket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const refreshInterval = setInterval(fetchSlots, 30000);
    return () => clearInterval(refreshInterval);
  }, []);

  const isSlotReserved = (slot) => {
    return reservations.has(`${slot.slot_id}-${slot.cs_id}`);
  };

 if (loading && Object.keys(rows).length === 0) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
      <CircularProgress />
    </Box>
  );
}


  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'auto' }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.grey[50] }}></TableCell>
            {columns.map((col, index) => (
              <TableCell key={index} align="center" sx={{ fontWeight: 'bold', bgcolor: theme.palette.grey[50], color: '#787878' }}>
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(rows).sort().map((rowKey, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>
                {rowKey}
              </TableCell>
              {columns.map((col, colIndex) => {
                const slot = rows[rowKey]?.[col];
                const isOccupied = slot?.tro_id && slot?.tro_id !== "rsrv";
                const isReserved = slot?.tro_id === "rsrv";
                const isNULL = slot?.tro_id === null;

                return (
                  <TableCell key={colIndex} padding="normal" align="center">
                    {slot ? (
                      <Box
                        onClick={() => {
                          if ((!slot?.tro_id || slot?.tro_id === "NULL") || isReserved || !slot.slot_status) return;
                          onSlotClick(slot);
                        }}
                        sx={{
                          width: { xs: '150px', sm: '180px', md: '220px' },
                          height: '80px',
                          backgroundColor: '#fff',
                          borderLeft: `6px solid ${isReserved ? "#787878" : isOccupied ? "#80FF75" : "#787878"}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'flex-start',
                          paddingLeft: 2,
                          boxShadow: 1,
                          borderRadius: 1,
                          cursor: !isNULL && !isReserved && slot.slot_status ? "pointer" : "default",
                          '&:hover': {
                            bgcolor: !isNULL && !isReserved && slot.slot_status ? theme.palette.action.hover : 'inherit',
                          }
                        }}
                      >
                        {isOccupied ? (
                          <>
                            <Typography variant={isMobile ? "caption" : "body2"} color="#686868">
                              ป้ายทะเบียน : {slot.tro_id}
                            </Typography>
                            <Typography variant={isMobile ? "caption" : "body2"} color="#686868">
                              ดูข้อมูลเพิ่มเติม
                            </Typography>
                          </>
                        ) : isReserved ? (
                          <Typography variant={isMobile ? "caption" : "body2"} color="#686868">
                            กำลังจอง...
                          </Typography>
                        ) : (
                          <Typography variant={isMobile ? "caption" : "body2"} color="#686868">
                            ช่องจอดว่าง <br /> ไม่มีรถเข็น
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: { xs: '150px', sm: '180px', md: '220px' },
                          height: '80px',
                          backgroundColor: theme.palette.grey[200],
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant={isMobile ? "caption" : "body2"} color={theme.palette.grey[600]}>
                          ไม่มีข้อมูล
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ParkingLayoutCOLarge;