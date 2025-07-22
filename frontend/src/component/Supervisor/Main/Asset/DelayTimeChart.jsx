import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';

// Register required Chart.js components
Chart.register(...registerables);

const API_URL = import.meta.env.VITE_API_URL;

// Function to fetch historical data
const getHistoricalData = async (hoursBack = 4) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/coldstorage/history/getWeightStats`, 
      { params: { hoursBack } }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return []; // Return empty array in case of error
  }
};

const SimpleLineChart = ({ data }) => {
  const [chartData, setChartData] = useState([]);
  const [currentStats, setCurrentStats] = useState({ 
    green: 0, 
    yellow: 0, 
    red: 0, 
    total: 0,
    greenPercent: 0,
    yellowPercent: 0,
    redPercent: 0 
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dataSource, setDataSource] = useState('loading'); // 'real', 'mock', 'loading'
  const [historyHours, setHistoryHours] = useState(4); // Hours of historical data to view
  const [lastFetchTime, setLastFetchTime] = useState(null); // Last fetch time
  const [chartMaxValue, setChartMaxValue] = useState(0); // สำหรับเก็บค่าสูงสุดที่จะแสดงในกราฟ (รวม padding)
  
  // Chart.js refs
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  // Function to calculate elapsed time
  const calculateTimeDifference = (qc_datetime) => {
    if (!qc_datetime) return 0;
    const comecolddatetime = new Date(qc_datetime);
    const currentDate = new Date();
    return (currentDate - comecolddatetime) / (1000 * 60); // Calculate in minutes
  };
  
  // Function to format time in a readable format
  const formatTimeDifference = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours} ชม. ${mins} นาที`;
    } else {
      return `${mins} นาที`;
    }
  };
  
  // Calculate current stats from the data received
  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      let greenWeight = 0, yellowWeight = 0, redWeight = 0;
      
      data.forEach(item => {
        if (!item) return;
        
        const weight = parseFloat(item.weight_RM) || parseFloat(item.weight_per_tro) || 0;
        const qcTime = item.come_cold_date || item.rmit_date;
        
        if (!qcTime || item.rm_status === "รอกลับมาเตรียม" || item.rm_status === "รอ Qc") {
          return;
        }
        
        const timePassed = calculateTimeDifference(qcTime);
        const coldHours = parseFloat(item.cold) || 0;
        const coldMinutes = coldHours * 60;
        const percentage = coldMinutes > 0 ? Math.max(0, (timePassed / coldMinutes) * 100) : 0;
        
        if (percentage >= 100) {
          redWeight += weight;
        } else if (percentage >= 50) {
          yellowWeight += weight;
        } else if (percentage > 0) {
          greenWeight += weight;
        }
      });
      
      greenWeight = parseFloat(greenWeight.toFixed(2));
      yellowWeight = parseFloat(yellowWeight.toFixed(2));
      redWeight = parseFloat(redWeight.toFixed(2));
      
      // คำนวณเปอร์เซ็นต์จากน้ำหนักจริง
      const totalWeight = greenWeight + yellowWeight + redWeight;
      const greenPercent = totalWeight > 0 ? parseFloat(((greenWeight / totalWeight) * 100).toFixed(1)) : 0;
      const yellowPercent = totalWeight > 0 ? parseFloat(((yellowWeight / totalWeight) * 100).toFixed(1)) : 0;
      const redPercent = totalWeight > 0 ? parseFloat(((redWeight / totalWeight) * 100).toFixed(1)) : 0;
      
      // คำนวณค่าสูงสุดที่จะแสดงในกราฟ (เพิ่มช่องว่างด้านบน 20%)
      const paddedMaxValue = totalWeight * 1.2; // เพิ่ม 20% จากน้ำหนักรวม
      
      setChartMaxValue(paddedMaxValue);
      setCurrentStats({ 
        green: greenWeight, 
        yellow: yellowWeight, 
        red: redWeight,
        total: totalWeight,
        greenPercent,
        yellowPercent,
        redPercent
      });
    } else {
      // กรณีไม่มีข้อมูล ใช้ค่าตัวอย่าง
      const sampleGreen = 150;
      const sampleYellow = 100;
      const sampleRed = 50;
      const sampleTotal = sampleGreen + sampleYellow + sampleRed;
      const paddedMaxValue = sampleTotal * 1.2; // เพิ่ม 20%
      
      setChartMaxValue(paddedMaxValue);
      setCurrentStats({ 
        green: sampleGreen, 
        yellow: sampleYellow, 
        red: sampleRed,
        total: sampleTotal,
        greenPercent: 50,
        yellowPercent: 33.3,
        redPercent: 16.7
      });
    }
  }, [data]);

  // Function to fetch historical data
  const fetchHistoricalData = async (hours = historyHours) => {
    setHistoryLoading(true);
    try {
      const historyData = await getHistoricalData(hours);
      
      if (Array.isArray(historyData) && historyData.length > 0) {
        let maxTotalWeight = 0; // สำหรับหาค่าสูงสุดในประวัติ
        
        const formattedData = historyData.map(entry => {
          // คำนวณเปอร์เซ็นต์สำหรับข้อมูลในประวัติจากน้ำหนัก
          const totalWeight = entry.totalWeight || 0;
          if (totalWeight > maxTotalWeight) {
            maxTotalWeight = totalWeight;
          }
          
          // ใช้สัดส่วนน้ำหนักในการคำนวณเปอร์เซ็นต์
          const greenPercent = totalWeight > 0 ? 
            parseFloat(((entry.greenWeight / totalWeight) * 100).toFixed(1)) : 0;
          const yellowPercent = totalWeight > 0 ? 
            parseFloat(((entry.yellowWeight / totalWeight) * 100).toFixed(1)) : 0;
          const redPercent = totalWeight > 0 ? 
            parseFloat(((entry.redWeight / totalWeight) * 100).toFixed(1)) : 0;
          
          return {
            time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            green: entry.greenWeight,
            yellow: entry.yellowWeight,
            red: entry.redWeight,
            total: entry.totalWeight,
            greenPercent,
            yellowPercent,
            redPercent,
            timestamp: entry.timestamp,
            isCurrent: false
          };
        });
        
        // เพิ่มข้อมูลปัจจุบัน
        const currentTotal = currentStats.total || 0;
        if (currentTotal > maxTotalWeight) {
          maxTotalWeight = currentTotal;
        }
        
        // คำนวณค่าสูงสุดสำหรับกราฟ (เพิ่ม padding 20%)
        const paddedMaxValue = maxTotalWeight * 1.2;
        setChartMaxValue(paddedMaxValue);
        
        const now = new Date();
        formattedData.push({
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          green: currentStats.green || 0,
          yellow: currentStats.yellow || 0,
          red: currentStats.red || 0,
          total: currentStats.total || 0,
          greenPercent: currentStats.greenPercent || 0,
          yellowPercent: currentStats.yellowPercent || 0,
          redPercent: currentStats.redPercent || 0,
          timestamp: now.toISOString(),
          isCurrent: true
        });
        
        formattedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setChartData(formattedData);
        setDataSource('real');
        setLastFetchTime(new Date());
      } else {
        generateMockHistoricalData();
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
      generateMockHistoricalData();
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Function to generate mock data
  const generateMockHistoricalData = () => {
    const timeSeriesData = [];
    const now = new Date();
    
    let prevGreen = currentStats.green || 150;
    let prevYellow = currentStats.yellow || 100;
    let prevRed = currentStats.red || 50;
    let maxTotalWeight = 0;
    
    for (let i = 7; i >= 0; i--) {
      const pastTime = new Date(now.getTime() - (i * 30 * 60 * 1000));
      const timeStr = pastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
      const changeFactorGreen = 0.85 + (Math.random() * 0.3);
      const changeFactorYellow = 0.85 + (Math.random() * 0.3);
      const changeFactorRed = 0.85 + (Math.random() * 0.3);
      
      const greenWeight = parseFloat((prevGreen * changeFactorGreen).toFixed(2));
      const yellowWeight = parseFloat((prevYellow * changeFactorYellow).toFixed(2));
      const redWeight = parseFloat((prevRed * changeFactorRed).toFixed(2));
      const totalWeight = parseFloat((greenWeight + yellowWeight + redWeight).toFixed(2));
      
      if (totalWeight > maxTotalWeight) {
        maxTotalWeight = totalWeight;
      }
      
      // คำนวณเปอร์เซ็นต์จากน้ำหนัก
      const greenPercent = parseFloat(((greenWeight / totalWeight) * 100).toFixed(1));
      const yellowPercent = parseFloat(((yellowWeight / totalWeight) * 100).toFixed(1));
      const redPercent = parseFloat(((redWeight / totalWeight) * 100).toFixed(1));
      
      timeSeriesData.push({
        time: timeStr,
        green: greenWeight,
        yellow: yellowWeight,
        red: redWeight,
        total: totalWeight,
        greenPercent,
        yellowPercent,
        redPercent,
        timestamp: pastTime.toISOString(),
        isCurrent: false
      });
      
      prevGreen = greenWeight;
      prevYellow = yellowWeight;
      prevRed = redWeight;
    }
      
    // เพิ่มข้อมูลปัจจุบัน
    const totalWeight = currentStats.total || 300;
    if (totalWeight > maxTotalWeight) {
      maxTotalWeight = totalWeight;
    }
    
    // คำนวณค่าสูงสุดสำหรับกราฟ (เพิ่ม padding 20%)
    const paddedMaxValue = maxTotalWeight * 1.2;
    setChartMaxValue(paddedMaxValue);
    
    // คำนวณเปอร์เซ็นต์จากน้ำหนัก (สำหรับข้อมูลจำลอง)
    const greenPercent = parseFloat(((currentStats.green / totalWeight) * 100).toFixed(1));
    const yellowPercent = parseFloat(((currentStats.yellow / totalWeight) * 100).toFixed(1));
    const redPercent = parseFloat(((currentStats.red / totalWeight) * 100).toFixed(1));
    
    timeSeriesData.push({
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      green: currentStats.green || 150,
      yellow: currentStats.yellow || 100,
      red: currentStats.red || 50,
      total: totalWeight,
      greenPercent,
      yellowPercent,
      redPercent,
      timestamp: now.toISOString(),
      isCurrent: true
    });
    
    setChartData(timeSeriesData);
    setDataSource('mock');
    setLastFetchTime(new Date());
  };
  
  // Fetch historical data when component loads
  useEffect(() => {
    const now = new Date();
    if (!lastFetchTime || (now - lastFetchTime) > 60000) {
      fetchHistoricalData(historyHours);
    }
    
    const refreshInterval = setInterval(() => {
      fetchHistoricalData(historyHours);
    }, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [historyHours, currentStats, lastFetchTime]);
  
  // Colors for chart lines
  const colors = {
    green: "#80FF75",
    yellow: "#FFF398",
    red: "#FF8175",
    total: "#3B82F6"
  };
  
  // Create and update chart when data changes
  useEffect(() => {
    if (!chartRef.current || !chartData || chartData.length === 0) return;
    
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.map(item => item.time),
        datasets: [
          // กราฟเส้นน้ำหนัก
          {
            label: 'เขียว (1-49%)',
            data: chartData.map(item => item.green),
            backgroundColor: 'rgba(128, 255, 117, 0.2)',
            borderColor: colors.green,
            borderWidth: 2,
            pointBackgroundColor: colors.green,
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.2
          },
          {
            label: 'เหลือง (50-99%)',
            data: chartData.map(item => item.yellow),
            backgroundColor: 'rgba(255, 243, 152, 0.2)',
            borderColor: colors.yellow,
            borderWidth: 2,
            pointBackgroundColor: colors.yellow,
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.2
          },
          {
            label: 'แดง (≥100%)',
            data: chartData.map(item => item.red),
            backgroundColor: 'rgba(255, 129, 117, 0.2)',
            borderColor: colors.red,
            borderWidth: 2,
            pointBackgroundColor: colors.red,
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const weight = context.parsed.y !== null ? context.parsed.y.toFixed(2) + ' กก.' : '0 กก.';
                
                // คำนวณเปอร์เซ็นต์จากน้ำหนักในช่วงเวลานั้น
                const dataIndex = context.dataIndex;
                const itemData = chartData[dataIndex];
                const total = itemData.total || 0;
                
                let percent = 0;
                if (label.includes('เขียว')) {
                  percent = itemData.greenPercent;
                } else if (label.includes('เหลือง')) {
                  percent = itemData.yellowPercent;
                } else if (label.includes('แดง')) {
                  percent = itemData.redPercent;
                }
                
                return `${label}: ${weight} (${percent.toFixed(1)}%)`;
              }
            }
          },
          legend: {
            position: 'top',
            labels: {
              font: {
                size: 11
              },
              boxWidth: 12,
              padding: 10
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        scales: {
          x: {
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 10
              }
            }
          },
          y: {
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 10
              },
              callback: function(value) {
                return value + ' กก.';
              }
            },
            beginAtZero: true,
            suggestedMax: chartMaxValue, // ใช้ค่าสูงสุดที่คำนวณไว้ (พร้อม padding)
            title: {
              display: true,
              text: 'น้ำหนัก (กิโลกรัม)',
              font: {
                size: 12,
                weight: 'bold'
              },
              color: '#64748b' // สีของชื่อแกน
            }
          }
        }
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData, colors, chartMaxValue]);

  return (
    <div style={{ 
      marginBottom: '25px', 
      padding: '20px', 
      backgroundColor: 'white', 
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      border: '1px solid rgb(212, 211, 211)',
      width: '100%',
      height: 'auto'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px',
        borderBottom: '1px solid #f5f5f5',
        paddingBottom: '10px'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '16px',
          color: '#2c3e50', 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11M8 11C6.89543 11 6 11.8954 6 13V19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19V13C18 11.8954 17.1046 11 16 11M8 11H16" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          แนวโน้มน้ำหนักวัตถุดิบตามสถานะ
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: dataSource === 'real' ? '#10b981' : dataSource === 'mock' ? '#f59e0b' : '#9ca3af',
            marginRight: '4px'
          }}></div>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {dataSource === 'real' 
              ? 'ข้อมูลจริงย้อนหลัง' 
              : dataSource === 'mock' 
                ? 'ข้อมูลจำลอง (ไม่พบข้อมูลจริง)' 
                : 'กำลังโหลดข้อมูล...'}
          </span>
          
          <button 
            onClick={() => fetchHistoricalData(historyHours)}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              fontSize: '11px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#f1f5f9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            disabled={historyLoading}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3V9H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.05 9C4.36 5.44 7.77 3 11.7 3C16.67 3 20.7 7.03 20.7 12C20.7 16.97 16.67 21 11.7 21C7.97 21 4.71 18.88 3.25 15.68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {historyLoading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '15px',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '12px', color: '#4a5568' }}>ดูข้อมูลย้อนหลัง:</span>
        {[1, 4, 8, 12, 24].map(hours => (
          <button 
            key={hours}
            onClick={() => {
              setHistoryHours(hours);
              fetchHistoricalData(hours);
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: historyHours === hours ? '#3b82f6' : '#e5e7eb',
              color: historyHours === hours ? 'white' : '#4b5563',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {hours} ชั่วโมง
          </button>
        ))}
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        marginBottom: '15px', 
        justifyContent: 'flex-start',
        fontSize: '11px',
        gap: '12px'
      }}>
        {/* สถิติน้ำหนักและเปอร์เซ็นต์รวมกัน */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '4px 8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            marginRight: '6px', 
            borderRadius: '50%', 
            backgroundColor: colors.green 
          }}></div>
          <span style={{ color: '#4a5568' }}>เขียว (1-49%): {currentStats.green} กก. ({currentStats.greenPercent}%)</span>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '4px 8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            marginRight: '6px', 
            borderRadius: '50%', 
            backgroundColor: colors.yellow 
          }}></div>
          <span style={{ color: '#4a5568' }}>เหลือง (50-99%): {currentStats.yellow} กก. ({currentStats.yellowPercent}%)</span>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '4px 8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            marginRight: '6px', 
            borderRadius: '50%', 
            backgroundColor: colors.red 
          }}></div>
          <span style={{ color: '#4a5568' }}>แดง (≥100%): {currentStats.red} กก. ({currentStats.redPercent}%)</span>
        </div>
        
        {/* แสดงน้ำหนักรวม */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '4px 8px',
          backgroundColor: '#e6f7ff',
          borderRadius: '4px',
          borderLeft: `3px solid ${colors.total}`
        }}>
          <span style={{ color: '#4a5568' }}>น้ำหนักรวม: {currentStats.total} กก.</span>
        </div>
      </div>
      
      <div style={{ 
        height: '400px',
        width: '100%',
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '20px', 
        backgroundColor: '#f9fafb',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {historyLoading && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '4px 8px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#3b82f6',
            zIndex: 10
          }}>
            กำลังโหลดข้อมูล...
          </div>
        )}
        
        {chartData && chartData.length > 0 ? (
          <canvas 
            ref={chartRef} 
            style={{ 
              width: '100%', 
              height: '100%'
            }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            color: '#718096',
            fontSize: '14px'
          }}>
            กำลังโหลดข้อมูล...
          </div>
        )}
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        marginTop: '10px', 
        fontSize: '12px', 
        color: '#718096' 
      }}>
        {/* <div>แนวโน้มน้ำหนักวัตถุดิบในแต่ละสถานะย้อนหลัง {historyHours} ชั่วโมง (อัปเดตทุก 5 นาที)</div>
        <div style={{ fontStyle: 'italic', marginTop: '4px' }}>
          * เปอร์เซ็นต์คำนวณจากสัดส่วนน้ำหนักจริงของแต่ละประเภท
        </div>
        <div style={{ fontStyle: 'italic', marginTop: '2px' }}>
          * กราฟน้ำหนักมีการเพิ่มช่องว่างด้านบน 20% เพื่อการแสดงผลที่ดีขึ้น
        </div> */}
      </div>
    </div>
  );
};
  
export default SimpleLineChart;