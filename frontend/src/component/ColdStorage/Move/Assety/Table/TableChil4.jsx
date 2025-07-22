import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import ModalSuccess from "../ModalSuccess";
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

const ParkingChil4 = ({ onSlotClick, tro_id }) => {
  const [rows, setRows] = useState({});
  const [columns, setColumns] = useState([]);
  const [socket, setSocket] = useState(null);
  const [reservations, setReservations] = useState(new Map()); // Store reservation status
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Handle slot click event to show modal
  const handleSlotClick = (slot) => {
    console.log("Slot clicked:", slot);
    setSelectedSlot(slot);
    setIsModalOpen(true); // Open modal to show more details
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  // Function to format slot data (grouping by rows and columns)
  const formatSlotData = (slotData) => {
    const columnSet = new Set(slotData.map((item) => item.slot_id[0])); // Extract columns
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

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/coldstorage/room`, { credentials: "include" });
      const data = await response.json();

      if (data.slot) {
        const slotData = data.slot.filter((item) => item.cs_id === 3 && item.slot_status);
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
      // Fetch initial data when socket connects
      fetchSlots();
    });

    newSocket.on("disconnect", () => {
      console.warn("⚠️ Socket disconnected.");
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    // Listen for slot updates
    newSocket.on("slotUpdated", async (updatedSlot) => {
      console.log("🔄 Slot update received:", updatedSlot);
      // Refresh data when a slot is updated
      await fetchSlots();
    });

    newSocket.on("reservationError", (error) => {
      console.error("❌ Reservation error:", error.message);
      // Handle error (e.g., show toast notification)
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.off("slotUpdated");
        newSocket.off("reservationError");
        newSocket.disconnect();
      }
    };
  }, []);

  // Add periodic refresh as a fallback (refresh every 30 seconds)
  useEffect(() => {
    const refreshInterval = setInterval(fetchSlots, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Check if the slot is reserved
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
    <>
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
                  const isNULL = slot?.tro_id === null;

                  return (
                    <TableCell key={colIndex} padding="normal" align="center">
                      {slot && (
                        <Box
                          onClick={() => {
                            onSlotClick(slot);
                            handleSlotClick(slot);
                          }}
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
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isModalOpen && (
        <ModalSuccess
          tro_id={selectedSlot?.tro_id}
          Tro_id={tro_id}
          slot_id={selectedSlot?.slot_id}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default ParkingChil4;