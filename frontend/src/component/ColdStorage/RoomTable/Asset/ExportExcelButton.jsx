import React from 'react';

const ExportExcelButton = ({ data }) => {
  const exportToCSV = () => {
    // กำหนดคอลัมน์พร้อมหัวข้อภาษาไทยสำหรับไฟล์ CSV ตาม JSON ที่ให้มา
    const columns = [
      { header: 'Batch', key: 'batch' },
      { header: 'Material', key: 'mat' },
      { header: 'รายชื่อวัตถุดิบ', key: 'mat_name' },
      { header: 'แผนการผลิต', key: 'production' },
      { header: 'ป้ายทะเบียน', key: 'tro_id' },
      { header: 'ประเภทวัตถุดิบ', key: 'rm_cold_status' },
      { header: 'น้ำหนักต่อรถเข็น', key: 'weight_in_trolley' },
      { header: 'น้ำหนักวัตถุดิบ', key: 'weight_RM' },
      { header: 'จำนวนถาด', key: 'tray_count' },
      { header: 'เวลาเบิกห้องเย็นใหญ่', key: 'withdraw_date' },
      { header: 'เวลาต้มอบเสร็จ', key: 'cooked_date' },
      { header: 'เวลาเตรียมเสร็จ', key: 'rmit_date' },
      { header: 'เวลาเข้าห้องเย็น1', key: 'come_cold_date' },
      { header: 'เวลาออกห้องเย็น1', key: 'out_cold_date' },
      { header: 'เวลาเข้าห้องเย็น2', key: 'come_cold_date_two' },
      { header: 'เวลาออกห้องเย็น2', key: 'out_cold_date_two' },
      { header: 'เวลาเข้าห้องเย็น3', key: 'come_cold_date_three' },
      { header: 'เวลาออกห้องเย็น3', key: 'out_cold_date_three' },
      { header: 'เวลาแก้ไข', key: 'rework_date' }
    ];

    // จัดรูปแบบวันที่
    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleString('th-TH');
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:', error);
        return dateString;
      }
    };

    // สร้างหัวคอลัมน์ CSV
    let csvContent = columns.map(col => `"${col.header}"`).join(',') + '\n';

    // เพิ่มข้อมูลแต่ละแถว
    data.forEach(item => {
      const row = columns.map(col => {
        let value = '';
        
        if (col.key.includes('date') || col.key === 'updated_at' || col.key === 'rmit_date' || col.key === 'cook_date' || col.key === 'prep_date') {
          value = formatDate(item[col.key]);
        } else {
          value = item[col.key] || '';
        }
        
        // รองรับค่าที่มีเครื่องหมายจุลภาค (comma) โดยใส่เครื่องหมายคำพูด
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      
      csvContent += row.join(',') + '\n';
    });

    // สร้าง Blob และสร้าง URL สำหรับดาวน์โหลด
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // สร้างลิงก์ดาวน์โหลดและคลิกอัตโนมัติ
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // ตั้งชื่อไฟล์พร้อมวันที่ปัจจุบัน
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // รูปแบบ YYYY-MM-DD
    link.setAttribute('download', `รายงานวัตถุดิบ_${dateString}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={exportToCSV}
      style={{
        padding: '10px 18px',
        backgroundColor: '#198754',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 4px rgba(25, 135, 84, 0.3)',
        transition: 'all 0.2s'
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 10V16M12 16L9 13M12 16L15 13M3 15C3 17.2091 4.79086 19 7 19H17C19.2091 19 21 17.2091 21 15V9C21 6.79086 19.2091 5 17 5H7C4.79086 5 3 6.79086 3 9V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      ส่งออกเป็น Excel
    </button>
  );
};

export default ExportExcelButton;