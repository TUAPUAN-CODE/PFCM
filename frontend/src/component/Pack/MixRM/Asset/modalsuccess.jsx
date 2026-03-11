import React, { useEffect, useState, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const ModalSuccess = ({ mapping_id, weights, tro_production_id, onClose }) => {
  const [status, setStatus] = useState({
    message: "",
    error: "",
    loading: true
  });

  // ใช้ useRef เพื่อติดตามว่าได้ส่งข้อมูลไปแล้วหรือยัง
  const hasSubmitted = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    // Input validation
    const validateInput = () => {
      if (!mapping_id?.length || !weights?.length || !tro_production_id) {
        return "ข้อมูลไม่ครบถ้วน";
      }

      if (mapping_id.length !== weights.length) {
        return "จำนวนรายการรถเข็นและน้ำหนักไม่ตรงกัน";
      }

      return null;
    };

    const sendDataToServer = async () => {
      // ตรวจสอบว่าได้ส่งข้อมูลไปแล้วหรือไม่
      if (hasSubmitted.current) {
        return; // ไม่ส่งซ้ำ ถ้าเคยส่งไปแล้ว
      }

      const validationError = validateInput();

      if (validationError) {
        if (isMounted) {
          setStatus({
            message: "",
            error: validationError,
            loading: false
          });
        }
        return;
      }

      try {
        hasSubmitted.current = true;

        const payload = {
          mapping_id,
          weights,
          tro_production_id
        };

        // แสดงข้อมูลใน console
        console.log("Payload ที่ส่งไป API:", payload);

        const response = await fetch(`${API_URL}/api/pack/mixed/trolley`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });


        if (!isMounted) return;

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `เกิดข้อผิดพลาด: ${response.status}`);
        }

        if (isMounted) {
          setStatus({
            message: data.message || "บันทึกข้อมูลสำเร็จ",
            error: "",
            loading: false
          });

          // Auto-close on success after delay
          if (onClose) {
            setTimeout(onClose, 1500);
          }
        }
      } catch (err) {
        if (isMounted && err.name !== 'AbortError') {
          // กรณีมี error ให้รีเซ็ต hasSubmitted เพื่อให้สามารถลองส่งใหม่ได้
          hasSubmitted.current = false;

          setStatus({
            message: "",
            error: err.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
            loading: false
          });
        }
      }
    };

    // เริ่มส่งข้อมูลด้วย setTimeout เล็กน้อย
    const timeout = setTimeout(sendDataToServer, 50);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [mapping_id, weights, tro_production_id, onClose]);

  const { message, error, loading } = status;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-seminone">สถานะการผสมวัตถุดิบ</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">กำลังประมวลผลข้อมูล...</p>
            </div>
          )}

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
              <div className="flex items-center">
                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <p>{message}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <div className="flex items-center">
                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 rounded-b-lg flex justify-end">
          <button
            className={`px-4 py-2 rounded font-medium focus:outline-none transition-colors ${loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            onClick={onClose}
            disabled={loading}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalSuccess;