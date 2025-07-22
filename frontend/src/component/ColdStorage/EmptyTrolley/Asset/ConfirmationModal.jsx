import React from 'react';
import PropTypes from 'prop-types';

/**
 * Modal component for confirming trolley clearance
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onConfirm - Function to handle confirmation
 * @param {string} props.trolleyId - ID of trolley to clear
 * @returns {React.ReactElement|null} - The modal component or null if not open
 */
const ConfirmationModal = ({ isOpen, onClose, onConfirm, trolleyId }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(trolleyId);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop overlay - no onClick to prevent closing when clicking outside */}
      <div className="fixed inset-0 bg-black bg-opacity-50"></div>
      
      {/* Modal Content */}
      <div className="bg-white rounded-lg p-6 shadow-lg z-10 max-w-md w-full mx-4">
        <div className="flex flex-col items-center">
          {/* Warning Icon */}
          <svg 
            className="text-yellow-400 w-16 h-16 mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            ยืนยันการเคลียร์รถเข็น
          </h3>
          
          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-1">คุณต้องการเคลียร์รถเข็นหมายเลข</p>
            <p className="text-lg font-bold text-blue-600">{trolleyId}</p>
            <p className="text-gray-600 mt-1">ใช่หรือไม่?</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-4 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 font-medium transition duration-200"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition duration-200"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Prop types for better documentation and validation
ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  trolleyId: PropTypes.string
};

export default ConfirmationModal;