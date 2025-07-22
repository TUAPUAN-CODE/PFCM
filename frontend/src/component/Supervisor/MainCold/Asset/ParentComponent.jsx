import React, { useState, useEffect, useRef } from 'react';
import TableOvenToCold from './TableOvenToCold';  
import DeleteModal from './modaldelete'; 
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
  const [tableData, setTableData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trolleyToDelete, setTrolleyToDelete] = useState(null);
  const fetchTimeoutRef = useRef(null);

  const fetchDataDebounced = () => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchData();
    }, 300);
  };

  useEffect(() => {
    fetchData();
    
    const newSocket = io(API_URL, {
  transports: ["websocket"], 
});


    newSocket.emit('joinRoom', 'saveRMForProdRoom');
    newSocket.emit('joinRoom', 'trolleyUpdatesRoom');
    newSocket.emit('joinRoom', 'QcCheckRoom');

    newSocket.on('dataUpdated', fetchDataDebounced);
    newSocket.on('dataDelete', fetchDataDebounced);
    newSocket.on('rawMaterialSaved', fetchDataDebounced);
    newSocket.on('trolleyUpdated', fetchDataDebounced);

    return () => {
      // Cleanup socket connections
      newSocket.off('dataUpdated');
      newSocket.off('dataDelete');
      newSocket.off('rawMaterialSaved');
      newSocket.off('trolleyUpdated');
      newSocket.disconnect();
      
      // Clear any pending timeouts
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      console.log("Fetching data from API...");
      const [res1, res2] = await Promise.all([
        fetch(`${API_URL}/api/coldstorage/main/md/fetchSlotRawMat`, { credentials: "include" }),
        fetch(`${API_URL}/api/coldstorage/main/mix/fetchSlotRawMat`, { credentials: "include" }),
      ]);

      const [data1, data2] = await Promise.all([
        res1.json(),
        res2.json(),
      ]);

      const combinedData = [
        ...(data1.success ? data1.data : []),
        ...(data2.success ? data2.data : []),
      ];

      console.log(`Fetched ${combinedData.length} total records`);
      setTableData(combinedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleDeleteClick = (trolleyId) => {
    console.log(`Delete requested for trolley: ${trolleyId}`);
    setTrolleyToDelete(trolleyId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      console.log(`Confirming delete for trolley: ${trolleyToDelete}`);
      
      const response = await fetch(`${API_URL}/api/cold/clear/Trolley`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tro_id: trolleyToDelete }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log("Delete successful, refreshing data...");
        fetchData();
      } else {
        console.error("Error during deletion:", result.message);
        // You could add an alert or toast notification here
      }
    } catch (error) {
      console.error("Error clearing trolley:", error);
      // You could add an error alert here
    } finally {
      setShowDeleteModal(false);
      setTrolleyToDelete(null);
    }
  };

  const handleCloseModal = () => {
    console.log("Closing delete modal");
    setShowDeleteModal(false);
    setTrolleyToDelete(null);
  };

  return (
    <div>
      <TableOvenToCold
        data={tableData}
        onDeleteClick={handleDeleteClick}
      />
      
      {showDeleteModal && (
        <DeleteModal
          trolleyId={trolleyToDelete}
          onClose={handleCloseModal}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default ParentComponent;