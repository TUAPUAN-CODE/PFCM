import React, { useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL;

const TrolleyClearModal = ({ trolleyId, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState(null);
  const [responseStatus, setResponseStatus] = useState(null);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/cold/clear/Trolley`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tro_id: trolleyId }),
      });
      
      const result = await response.json();
      
      setResponseStatus(response.ok ? 'success' : 'error');
      setResponseMessage(result.message);
      
      if (response.ok) {
        // Wait 2 seconds before closing to show success message
        setTimeout(() => {
          onClose(true); // Pass true to indicate successful operation
        }, 2000);
      }
    } catch (error) {
      console.error("Error clearing trolley:", error);
      setResponseStatus('error');
      setResponseMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 z-10">
        <h2 className="text-xl font-bold mb-2">ยืนยันการเคลียร์รถเข็น</h2>
        
        {responseMessage ? (
          <div className={`my-4 p-3 rounded ${responseStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {responseMessage}
          </div>
        ) : (
          <p className="text-gray-600 my-4">
            คุณต้องการเคลียร์รถเข็น <span className="font-bold">{trolleyId}</span> และเอาวัตถุดิบทั้งหมดออกจากรถเข็นใช่หรือไม่?
          </p>
        )}
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
            onClick={() => onClose(false)}
            disabled={isLoading}
          >
            ยกเลิก
          </button>
          
          {!responseStatus && (
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังดำเนินการ...
                </>
              ) : (
                'ยืนยันการเคลียร์'
              )}
            </button>
          )}
          
          {responseStatus === 'success' && (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => onClose(true)}
            >
              ปิด
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrolleyClearModal;