import React, { useState, useEffect } from 'react';
import TableMainPrep from './Table';
import axios from "axios";
axios.defaults.withCredentials = true; 
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
  const [tableData, setTableData] = useState([]);
  const [socket, setSocket] = useState(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      });
    setSocket(newSocket);
    newSocket.emit('joinRoom', 'toColdOvenRoom');
    newSocket.emit('joinRoom', 'QcCheckRoom');
    
    newSocket.on('dataUpdated', () => {
      fetchData();
    });
    
    newSocket.on('dataDelete', () => {
      fetchData();
    });
    
    newSocket.on('trolleyUpdated', () => {
      fetchData();
    });
    
    newSocket.on('trolleyUpdatesRoom', () => {
      fetchData();
    });

    return () => {
      newSocket.off('dataUpdated');
      newSocket.off('dataDelete');
      newSocket.off('trolleyUpdated');
      newSocket.off('trolleyUpdatesRoom');
      newSocket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/coldstorage/EmptyTrolley`);
      setTableData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleClearTrolley = async (tro_id) => {
    try {
      await axios.put(`${API_URL}/api/coldstorage/clearTrolley`, { tro_id });
      if (socket) {
        socket.emit('trolleyUpdated');
      }
      fetchData();
    } catch (error) {
      console.error("Error clearing trolley:", error);
    }
  };

  return (
    <div>
      <TableMainPrep 
        data={tableData} 
        handleClearTrolley={handleClearTrolley}
        handleOpenModal={() => {}}
        handleRowClick={() => {}}
        handleOpenEditModal={() => {}}
        handleOpenSuccess={() => {}}
      />
    </div>
  );
};

export default ParentComponent;