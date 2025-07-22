import React, { useState, useEffect,useRef,useCallback } from "react";
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

const ParkingLayou4C = ({ onSlotClick }) => {
  const [rows, setRows] = useState({});
  const [columns, setColumns] = useState([]);
  const [socket, setSocket] = useState(null);
  const [reservations, setReservations] = useState(new Map());
  const [processingSlot, setProcessingSlot] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Function to format slot data
  const formatSlotData = (slotData) => {
    const columnSet = new Set(slotData.map((item) => item.slot_id[0]));
    const formattedRows = {};

    slotData.forEach((item) => {
      const [col, row] = [item.slot_id[0], item.slot_id.slice(1)];
      if (!formattedRows[row]) formattedRows[row] = {};
      formattedRows[row][col] = item;
    });

    return {
      columns: [...columnSet],
      rows: formattedRows
    };
  };


  
    // Debounced fetchData
    const fetchDataDebounced = useCallback(() => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchSlots();
      }, 300);
    }, []);
  
  // Function to fetch and update slots
  const fetchSlots = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/coldstorage/room`, { credentials: "include" });
      const data = await response.json();

      if (data.slot) {
        // Note the cs_id is 1 for CSR3 (different from previous components)
        const slotData = data.slot.filter((item) => item.cs_id === 7 && item.slot_status);
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

  let isTabActive = true;
  let reconnectTimer = null;
  let reconnectDelay = 2000; // เริ่มที่ 2 วินาที
  const MAX_DELAY = 60000; // สูงสุด 1 นาที

  const handleVisibilityChange = () => {
    isTabActive = !document.hidden;
    if (isTabActive && !newSocket?.connected) {
      console.log("🔄 Tab กลับมา active, พยายามเชื่อมต่อ...");
      manualReconnect();
    }
  };

  const newSocket = io(API_URL, {
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
  });

  const manualReconnect = () => {
    if (!newSocket.connected && isTabActive) {
      console.log(`🔁 พยายาม reconnect... รอ ${reconnectDelay / 1000} วินาที`);
      newSocket.connect();
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      // เพิ่มเวลาแบบ exponential (double ทุกครั้ง แต่ไม่เกิน MAX_DELAY)
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (!document.hidden) {
    newSocket.connect();
  }

  newSocket.on("connect", () => {
    console.log("✅ Socket connected:", newSocket.id);
    reconnectDelay = 2000; // reset delay เมื่อเชื่อมต่อสำเร็จ
    fetchDataDebounced();
  });

  newSocket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket disconnected:", reason);
    if (isTabActive) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  });

  newSocket.on("connect_error", (error) => {
    console.error("❌ Connection error:", error);
    if (isTabActive) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  });

  newSocket.on("slotUpdated", async (updatedSlot) => {
    console.log("🔄 Slot update received:", updatedSlot);
    await fetchDataDebounced();
  });

  newSocket.on("reservationError", (error) => {
    console.error("❌ Reservation error:", error.message);
  });

  setSocket(newSocket);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    clearTimeout(reconnectTimer);
    if (newSocket) {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("connect_error");
      newSocket.off("slotUpdated");
      newSocket.off("reservationError");
      newSocket.disconnect();
    }
  };
}, [API_URL]);



  // Add periodic refresh as a fallback
  useEffect(() => {
    const refreshInterval = setInterval(fetchSlots, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Modified handleSlotClick for parent component
  const handleSlotClick = (slotData) => {
    if (processingSlot === slotData.slot_id) return;

    setSelectedSlot(slotData);
    setProcessingSlot(slotData.slot_id);

    try {
      if (socket) {
        socket.emit("reserveSlot", {
          slot_id: slotData.slot_id,
          cs_id: slotData.cs_id,
        });
      }
    } catch (error) {
      console.error("❌ Error reserving slot:", error);
      setProcessingSlot(null);
    }
  };

  // Modified render logic to check reservations
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
          {Object.keys(rows).map((rowKey, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>
                {rowKey}
              </TableCell>
              {columns.map((col, colIndex) => {
                const slot = rows[rowKey]?.[col];
                const isOccupied = slot?.tro_id && slot?.tro_id !== "rsrv";
                const isReserved = slot?.tro_id === "rsrv";

                return (
                  <TableCell key={colIndex} padding="normal" align="center">
                    {slot && (
                      <Box
                        onClick={() => !isOccupied && !isReserved && slot.slot_status && onSlotClick(slot)}
                        sx={{
                          width: { xs: '150px', sm: '180px', md: '220px' },
                          height: '80px',
                          backgroundColor: '#fff',
                          borderLeft: `6px solid ${isReserved ? "#53c8ff" : isOccupied ? "#FF8175" : "#80FF75"}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'flex-start',
                          paddingLeft: 2,
                          boxShadow: 1,
                          borderRadius: 1,
                          cursor: !isOccupied && !isReserved && slot.slot_status ? "pointer" : "default",
                          '&:hover': {
                            bgcolor: !isOccupied && !isReserved && slot.slot_status ? theme.palette.action.hover : 'inherit',
                          }
                        }}
                      >
                        {isOccupied ? (
                          <>
                            <Typography variant={isMobile ? "caption" : "body2"} color="#686868">
                              ช่องจอดไม่ว่าง
                            </Typography>
                            <Typography variant={isMobile ? "caption" : "body2"} color="#686868">
                              ป้ายทะเบียน : {slot.tro_id}
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

export default ParkingLayou4C;
