import React, { useMemo, useState } from 'react';

// นำเข้าฟังก์ชันจากไฟล์ TableOvenToCold
const calculateTimeDifference = (qc_datetime) => {
  if (!qc_datetime) return 0;
  const comecolddatetime = new Date(qc_datetime);
  const currentDate = new Date();
  return (currentDate - comecolddatetime) / (1000 * 60); // คำนวณเป็นนาที
};

const formatTime = (minutes) => {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.floor(minutes % 60);

  let timeString = '';
  if (days > 0) timeString += `${days} วัน`;
  if (hours > 0) timeString += ` ${hours} ชม.`;
  if (mins > 0) timeString += ` ${mins} นาที`;
  return timeString.trim();
};

const getStatusMessage = (timeRemaining) => {
  return timeRemaining > 0
    ? `เหลืออีก ${formatTime(timeRemaining)}`
    : `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;
};

const getBorderColor = (percentage) => {
  if (percentage >= 100) return '#FF8175'; // สีแดง - 100% ขึ้นไป
  if (percentage >= 50) return '#FFF398'; // สีเหลือง - 50-99%
  return '#80FF75'; // สีเขียว - 1-49%
};

const getRowStatus = (row) => {
  if (!row) return { borderColor: "#969696", statusMessage: "-", hideDelayTime: true, percentage: 0 };
  
  // ถ้ามี rmit_date แต่ไม่มี come_cold_date ให้ใช้ rmit_date เป็น qc_datetime
  const qcTime = row.come_cold_date || row.rmit_date;
  
  if (!qcTime || row.rm_status === "รอกลับมาเตรียม" || row.rm_status === "รอ Qc") {
    return { 
      borderColor: "#969696", 
      statusMessage: "รอดำเนินการ", 
      hideDelayTime: true,
      percentage: 0,
    };
  }

  // คำนวณจากเวลาที่กำหนด
  const timePassed = calculateTimeDifference(qcTime);
  const coldHours = parseFloat(row.cold) || 0;
  const coldMinutes = coldHours * 60;
  const percentage = Math.max(0, (timePassed / coldMinutes) * 100); 
  const timeRemaining = coldMinutes - timePassed;

  return {
    borderColor: getBorderColor(percentage),
    statusMessage: getStatusMessage(timeRemaining),
    hideDelayTime: timeRemaining > 0,
    percentage,
  };
};

const WeightSummaryCard = ({ data }) => {
  // สถานะสำหรับเปิด/ปิดรายการในแต่ละการ์ด
  const [expandedStatus, setExpandedStatus] = useState(null);
  
  // คำนวณผลรวมและข้อมูลสถิติต่างๆ
  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalItems: 0,
        totalWeight: 0,
        totalTrays: 0,
        delayStatus: {
          green: { count: 0, totalWeight: 0, totalTrays: 0, items: [] },
          yellow: { count: 0, totalWeight: 0, totalTrays: 0, items: [] },
          red: { count: 0, totalWeight: 0, totalTrays: 0, items: [] },
          gray: { count: 0, totalWeight: 0, totalTrays: 0, items: [] }
        }
      };
    }

    return data.reduce((acc, item) => {
      // สรุปน้ำหนักรวม
      const itemWeight = Number(item.weight_RM) || 0;
      const itemTrays = Number(item.ntray) || 0;
      
      // ใช้ฟังก์ชันเดียวกับที่ใช้ในตาราง
      const { borderColor, statusMessage } = getRowStatus(item);
      
      // แปลงสี borderColor เป็นสถานะ
      let colorStatus = 'gray';
      if (borderColor === '#80FF75') colorStatus = 'green';
      else if (borderColor === '#FFF398') colorStatus = 'yellow';
      else if (borderColor === '#FF8175') colorStatus = 'red';
      
      // สร้างกลุ่มสถานะตามสี ถ้ายังไม่มี
      if (!acc.delayStatus[colorStatus]) {
        acc.delayStatus[colorStatus] = {
          count: 0,
          totalWeight: 0,
          totalTrays: 0,
          items: []
        };
      }
      
      // เพิ่มข้อมูลในกลุ่มสถานะ
      acc.delayStatus[colorStatus].count += 1;
      acc.delayStatus[colorStatus].totalWeight += itemWeight;
      acc.delayStatus[colorStatus].totalTrays += itemTrays;
      
      // เก็บข้อมูลรายการ
      acc.delayStatus[colorStatus].items.push({
        id: item.rmfp_id || item.tro_id || `item-${acc.totalItems + 1}`,
        batch: item.batch || '-',
        mat: item.mat || '-',
        mat_name: item.mat_name || '-',
        production: item.production || '-',
        weight: itemWeight,
        trays: itemTrays,
        statusMessage: statusMessage,
        coldHours: item.cold || 0
      });
      
      // ค่าสถิติทั่วไป
      acc.totalItems += 1;
      acc.totalWeight += itemWeight;
      acc.totalTrays += itemTrays;
      
      return acc;
    }, {
      totalItems: 0,
      totalWeight: 0,
      totalTrays: 0,
      delayStatus: {
        green: { count: 0, totalWeight: 0, totalTrays: 0, items: [] },
        yellow: { count: 0, totalWeight: 0, totalTrays: 0, items: [] },
        red: { count: 0, totalWeight: 0, totalTrays: 0, items: [] },
        gray: { count: 0, totalWeight: 0, totalTrays: 0, items: [] }
      }
    });
  }, [data]);

  // จัดรูปแบบตัวเลขให้มีทศนิยม 2 ตำแหน่ง และคั่นหลักพัน
  const formatNumber = (num) => {
    return num.toLocaleString('th-TH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  // จัดรูปแบบจำนวนนับ
  const formatCount = (num) => {
    return num.toLocaleString('th-TH', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // ข้อมูลการ์ดตามสี
  const cardInfo = {
    green: {
      color: '#22c55e',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      name: 'ปกติ (≤ 49%)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    yellow: {
      color: '#f59e0b',
      bgColor: '#fffbeb',
      borderColor: '#fef3c7',
      name: 'มีความล่าช้า (50-99%)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    red: {
      color: '#ef4444',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      name: 'ล่าช้ามาก (≥ 100%)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    gray: {
      color: '#64748b',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0',
      name: 'รอดำเนินการ',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  };

  // ฟังก์ชันสลับการแสดง/ซ่อนรายการในแต่ละการ์ด
  const toggleExpand = (status) => {
    if (expandedStatus === status) {
      setExpandedStatus(null);
    } else {
      setExpandedStatus(status);
    }
  };

  // กรองเอาเฉพาะสถานะสำคัญ 3 สถานะ (green, yellow, red)
  const mainStatuses = ['green', 'yellow', 'red'];

  return (
    <div className="weight-summary-card" style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      border: '1px solid #eaeaea',
      marginBottom: '25px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px',
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '10px'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '18px', 
          color: '#2c3e50', 
          fontWeight: 600 
        }}>
          <span style={{ marginRight: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          สรุปน้ำหนักตามสถานะ DelayTime
        </h3>
        <span style={{
          fontSize: '14px', 
          backgroundColor: '#f0f9ff', 
          color: '#0369a1',
          padding: '4px 10px', 
          borderRadius: '20px',
          fontWeight: 500
        }}>
          {summary.totalItems} รายการ
        </span>
      </div>
      
      {/* แสดงการ์ดสรุปน้ำหนักแยกตามสีของสถานะ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* สร้างการ์ดสำหรับ 3 สถานะหลัก (green, yellow, red) */}
        {mainStatuses.map((status) => {
          const statusData = summary.delayStatus[status] || { count: 0, totalWeight: 0, totalTrays: 0, items: [] };
          const info = cardInfo[status];
          const isExpanded = expandedStatus === status;
          
          if (statusData.count === 0) return null;
          
          return (
            <div 
              key={status}
              style={{
                backgroundColor: info.bgColor,
                borderRadius: '8px',
                padding: '16px',
                border: isExpanded ? `1px solid ${info.color}` : `1px solid ${info.borderColor}`,
                borderLeft: `4px solid ${info.color}`,
                boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
            >
              {/* ส่วนหัวของการ์ด */}
              <div 
                onClick={() => toggleExpand(status)}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{ color: info.color, marginRight: '8px' }}>
                    {info.icon}
                  </div>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: info.color
                  }}>
                    {info.name}
                  </span>
                </div>
                
                <div style={{
                  transform: `rotate(${isExpanded ? '180deg' : '0deg'})`,
                  transition: 'transform 0.3s'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 9l-7 7-7-7" stroke={info.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              
              {/* ส่วนแสดงข้อมูลสรุป */}
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: isExpanded ? '16px' : '0'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>น้ำหนักรวม</div>
                  <div style={{ fontSize: '22px', fontWeight: '600', color: info.color }}>
                    {formatNumber(statusData.totalWeight)} กก.
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>จำนวน</div>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#475569' }}>
                    {formatCount(statusData.count)} รายการ
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {formatCount(statusData.totalTrays)} ถาด
                  </div>
                </div>
              </div>
              
              {/* ส่วนแสดงรายการเมื่อเปิดขยาย */}
              {isExpanded && statusData.items.length > 0 && (
                <div style={{
                  marginTop: '16px',
                  borderTop: `1px solid ${info.borderColor}`,
                  paddingTop: '12px'
                }}>
                  <div style={{
                    maxHeight: '240px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '4px'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px'
                    }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${info.borderColor}` }}>
                          <th style={{ textAlign: 'left', padding: '6px 4px', color: '#475569', fontWeight: '500' }}>Batch</th>
                          <th style={{ textAlign: 'left', padding: '6px 4px', color: '#475569', fontWeight: '500' }}>ชื่อวัตถุดิบ</th>
                          <th style={{ textAlign: 'right', padding: '6px 4px', color: '#475569', fontWeight: '500' }}>น้ำหนัก</th>
                          <th style={{ textAlign: 'center', padding: '6px 4px', color: '#475569', fontWeight: '500' }}>ถาด</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusData.items.map((item, idx) => (
                          <tr key={`${status}-${item.id}-${idx}`} style={{ 
                            borderBottom: `1px solid ${info.borderColor}20`,
                            backgroundColor: idx % 2 === 0 ? 'transparent' : `${info.borderColor}30`
                          }}>
                            <td style={{ padding: '6px 4px', color: '#64748b' }}>{item.batch}</td>
                            <td style={{ padding: '6px 4px', color: '#64748b' }}>
                              <div style={{ fontWeight: '500' }}>{item.mat_name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{item.mat}</span>
                                <span>{item.production}</span>
                              </div>
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'right', color: '#64748b' }}>{formatNumber(item.weight)} กก.</td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', color: '#64748b' }}>{item.trays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* แสดงข้อมูลรวม */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #e2e8f0',
        marginTop: '10px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>น้ำหนักรวมทั้งหมด</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#334155' }}>{formatNumber(summary.totalWeight)} กก.</div>
          </div>
          
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>จำนวนรายการทั้งหมด</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#334155' }}>{formatCount(summary.totalItems)} รายการ</div>
          </div>
          
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>จำนวนถาดรวม</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#334155' }}>{formatCount(summary.totalTrays)} ถาด</div>
          </div>
          
          {summary.delayStatus.gray.count > 0 && (
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>รอดำเนินการ</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#334155' }}>
                {formatNumber(summary.delayStatus.gray.totalWeight)} กก. ({formatCount(summary.delayStatus.gray.count)} รายการ)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeightSummaryCard;