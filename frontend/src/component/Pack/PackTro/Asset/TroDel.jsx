import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function TroDelModal({
  open,
  onClose,
  tro_id,
  onSuccess
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", type: "" });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setIsSubmitting(false);
      setFeedback({ message: "", type: "" });
    }
  }, [open]);

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    setFeedback({ message: "กำลังดำเนินการ...", type: "info" });

    try {
      // Call the actual API endpoint
      const response = await fetch(`${API_URL}/api/Trolley/del`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tro_id }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback({ 
          message: "อัปเดตสถานะรถเข็นเป็นไม่ใช้งานเรียบร้อยแล้ว (อัปเดตข้อมูลในตาราง Trolley และ PackTrolley แล้ว)", 
          type: "success" 
        });
        
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setFeedback({ 
          message: data.error || "เกิดข้อผิดพลาดในการปรับสถานะรถเข็น", 
          type: "error" 
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      setFeedback({ 
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์", 
        type: "error" 
      });
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/30 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative w-full max-w-md transform rounded-2xl bg-white shadow-2xl transition-all duration-300 ease-out">
        {/* Header with modern gradient */}
        <div className="relative flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-white opacity-90" />
            <h2 className="text-lg font-medium text-white">ยืนยันการลบรถเข็น</h2>
          </div>
          <button
            onClick={isSubmitting ? undefined : onClose}
            disabled={isSubmitting}
            className="rounded-full bg-white/10 p-1.5 text-white/90 transition-all hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content with soft shadow and improved spacing */}
        <div className="px-6 py-5">
          
          {/* Trolley Info Card with improved design */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
            <div className="space-y-3">
              {tro_id && (
                <div className="flex items-center">
                  <span className="w-1/3 text-sm font-medium text-gray-500">รหัสรถเข็น:</span>
                  <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{tro_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Feedback message with icons */}
          {feedback.message && (
            <div className={`mt-4 flex items-center justify-center gap-2 rounded-lg p-3 text-center text-sm font-medium ${
              feedback.type === 'success' ? 'bg-green-50 text-green-700' : 
              feedback.type === 'error' ? 'bg-red-50 text-red-700' : 
              'bg-blue-50 text-blue-700'
            }`}>
              {feedback.type === 'info' && <Loader2 className="h-4 w-4 animate-spin" />}
              {feedback.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {feedback.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {feedback.message}
            </div>
          )}
        </div>
        
        {/* Footer with improved buttons */}
        <div className="flex justify-end gap-3 rounded-b-2xl border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={isSubmitting ? undefined : onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDeactivate}
            disabled={isSubmitting}
            className="flex items-center rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            ยืนยันการลบรถเข็น
          </button>
        </div>
      </div>
    </div>
  );
}