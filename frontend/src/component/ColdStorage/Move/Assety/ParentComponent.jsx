import React, { useState } from 'react';
import Parking4C from './Table/Table4C';
import ParkingAnte from './Table/TableAntePage';
import ParkingChil2 from './Table/TableChil2';
import ParkingChil4 from './Table/TableChil4';
import ParkingChil5 from './Table/TableChil5';
import ParkingChil6 from './Table/TableChil6';
import ParkingCSR3 from './Table/TableCSR3';
import ParkingLarge from './Table/TableLarge'

const ParentComponent = ({ tro }) => {
    const [selectedRoom, setSelectedRoom] = useState(null);

    const handleSlotClick = (slot) => {
        console.log("Slot clicked:", slot, tro);
    };

    const handleRoomSelect = (room) => {
        setSelectedRoom(room);
    };

    const handleBack = () => {
        setSelectedRoom(null);
    };

    const roomOptions = [
        { id: '4C', name: 'ห้องเย็น 4C' },
        { id: 'Ante', name: 'ห้องเย็น Ante' },
        { id: 'Chill 2', name: 'ห้องเย็น Chill 2' },
        { id: 'Chill 4', name: 'ห้องเย็น Chill 4' },
        { id: 'Chill 5', name: 'ห้องเย็น Chill 5' },
        { id: 'Chill 6', name: 'ห้องเย็น Chill 6' },
        { id: 'CSR3', name: 'ห้องเย็น CSR3' },
        { id: 'Large', name: 'ห้องเย็นใหญ่' },
    ];

    let selectedRoomComponent;
    switch (selectedRoom) {
        case '4C': selectedRoomComponent = <Parking4C onSlotClick={handleSlotClick} tro_id={tro} />; break;
        case 'Ante': selectedRoomComponent = <ParkingAnte onSlotClick={handleSlotClick} tro_id={tro} />; break;
        case 'Chill 2': selectedRoomComponent = <ParkingChil2 onSlotClick={handleSlotClick} tro_id={tro} />; break;
        case 'Chill 4': selectedRoomComponent = <ParkingChil4 onSlotClick={handleSlotClick} tro_id={tro} />; break;
        case 'Chill 5': selectedRoomComponent = <ParkingChil5 onSlotClick={handleSlotClick} tro_id={tro} />; break;
        case 'Chill 6': selectedRoomComponent = <ParkingChil6 onSlotClick={handleSlotClick} tro_id={tro} />; break;
        case 'CSR3': selectedRoomComponent = <ParkingCSR3 onSlotClick={handleSlotClick} tro_id={tro} />; break;
        case 'Large': selectedRoomComponent = <ParkingLarge onSlotClick={handleSlotClick} tro_id={tro} />; break;
        default: selectedRoomComponent = null;
    }

    return (
        <div className="min-h-screen bg-blue-50 p-6 font-sans"> {/* Changed to cool blue background */}
            {selectedRoom ? (
                <div className="max-w-6xl mx-auto">
                    <button
                        onClick={handleBack}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 mb-6"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        กลับไปเลือกห้องเย็น
                    </button>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center mb-6">
                            <div className="p-3 rounded-lg bg-blue-500 mr-4">
                                {/* Winter Thermometer Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800">
                                {roomOptions.find(r => r.id === selectedRoom)?.name || selectedRoom}
                            </h2>
                        </div>
                        {selectedRoomComponent}
                    </div>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">กรุณาเลือกห้องเย็นที่ต้องการ</h1>
                        
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {roomOptions.map((room) => (
                            <button
                                key={room.id}
                                onClick={() => handleRoomSelect(room.id)}
                                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-5 shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl flex flex-col items-center"
                            >
                                {/* Winter Thermometer Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                <span className="text-lg font-medium">{room.name}</span>
                            
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentComponent;