import React, { useState, useEffect } from 'react';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Modal component for displaying success or error messages with API integration
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the modal
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {Array} props.csvData - CSV data to be sent to API
 * @param {boolean} props.hasNoFilteredData - Whether there is no filtered data available
 * @returns {JSX.Element} ModalSuccess component
 */
const ModalSuccess = ({ show, onClose, csvData, hasNoFilteredData }) => {
    const [success, setSuccess] = useState(true);
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);

    console.log('ModalSuccess - csvData:', csvData);


    // Import API call is now handled inside the modal
    useEffect(() => {
        if (show) {
            if (!csvData) {
                // No data case
                setSuccess(false);
                setMessage('ไม่มีข้อมูลสำหรับนำเข้า');
                setDetails(null);
                setLoading(false);
                return;
            }

            if (hasNoFilteredData) {
                // No filtered data case
                setSuccess(false);
                setMessage('ไม่พบข้อมูลที่มีค่าในคอลัมน์ที่ลงท้ายด้วย _9, _10, _13 และ _15 ครบทุกคอลัมน์');
                setDetails(null);
                setLoading(false);
                return;
            }

            // Reset state for new API call
            setSuccess(true);
            setMessage('กำลังนำเข้าข้อมูล');
            setDetails(null);
            setLoading(true);

            // Make API call
            importData(csvData);
        }
    }, [show, csvData, hasNoFilteredData]);

    // Function to handle API call
    const importData = async (data) => {
        try {
            const response = await axios.post(`${API_URL}/api/import-prod-rawmat/CSV`, {
                csvData: data, 
            });

            setSuccess(true);
            setMessage(response.data.message || 'นำเข้าข้อมูลสำเร็จ');
            setDetails({
                totalRows: data.length,
                importedData: data
            });
            setLoading(false);
        } catch (error) {
            console.error('Error importing data:', error);
            setSuccess(false);
            setMessage(error.response?.data?.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
            setDetails({
                details: error.response?.data?.details || error.message
            });
            setLoading(false);
        }
    };

    if (!show) return null;

    const formatNumber = (num) => {
        return new Intl.NumberFormat('th-TH').format(num);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className={`p-4 ${success ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    <h3 className="text-lg font-medium">
                        {success ? 'นำเข้าข้อมูลสำเร็จ' : 'เกิดข้อผิดพลาด'}
                    </h3>
                </div>

                {/* Body */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                            <p className="text-gray-700">กำลังประมวลผล...</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 text-center">
                                <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${success ? 'bg-green-100' : 'bg-red-100'
                                    } mb-4`}>
                                    {success ? (
                                        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </div>
                                <p className="text-lg font-medium text-gray-900">{message}</p>
                            </div>

                            {success && details && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                                    <h4 className="font-medium text-gray-700 mb-2">รายละเอียด:</h4>
                                    <ul className="space-y-1 text-sm text-gray-600">
                                        <li>จำนวนข้อมูลที่นำเข้า: <span className="font-medium">{formatNumber(details.totalRows || 0)}</span> รายการ</li>
                                    </ul>
                                </div>
                            )}

                            {!success && details && details.details && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                                    <p className="text-sm text-red-700">{details.details}</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Buttons */}
                    <div className="mt-6 flex justify-end">
                        {!loading && (
                            <button
                                onClick={onClose}
                                className={`px-4 py-2 rounded-md ${success
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    } text-white font-medium focus:outline-none`}
                            >
                                ปิด
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalSuccess;