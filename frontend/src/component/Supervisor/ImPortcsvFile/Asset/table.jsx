import React, { useState, useEffect } from 'react';

const CSVTable = ({ data, headers }) => {
  // ระบุคอลัมน์ที่ต้องการแสดงเป็นค่าคงที่ตามที่ระบุ
  const selectedColumns = ["_1", "_7", "_8", "_11", "_13", "_14", "_15"];

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    // Apply filtering and sorting
    let result = [...data];

    // Apply filters if any
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key].trim() !== '') {
        result = result.filter(item => {
          const value = item[key];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(filters[key].toLowerCase());
        });
      }
    });

    // Apply sorting if configured
    if (sortConfig.key) {
      result.sort((a, b) => {
        // Handle null or undefined values
        if (a[sortConfig.key] === null || a[sortConfig.key] === undefined) return 1;
        if (b[sortConfig.key] === null || b[sortConfig.key] === undefined) return -1;

        // Compare values
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredData(result);
  }, [data, sortConfig, filters]);

  // Handle sorting when clicking on a column header
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);  // Reset to first page when filtering
  };

  // Calculate pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Handle pagination change
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle rows per page change
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);  // Reset to first page when changing rows per page
  };

  // Render pagination controls
  const renderPagination = () => {
    const pageNumbers = [];

    // Show 5 page numbers max with current page in middle if possible
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust startPage if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-4">
        <div>
          <span className="text-sm text-gray-700">
            แสดง {indexOfFirstRow + 1} ถึง {Math.min(indexOfLastRow, filteredData.length)} จากทั้งหมด {filteredData.length} รายการ
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => paginate(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm rounded border hover:bg-gray-100 disabled:opacity-50"
          >
            «
          </button>

          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm rounded border hover:bg-gray-100 disabled:opacity-50"
          >
            ‹
          </button>

          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => paginate(number)}
              className={`px-3 py-1 text-sm rounded border ${currentPage === number ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
            >
              {number}
            </button>
          ))}

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm rounded border hover:bg-gray-100 disabled:opacity-50"
          >
            ›
          </button>

          <button
            onClick={() => paginate(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm rounded border hover:bg-gray-100 disabled:opacity-50"
          >
            »
          </button>
        </div>

        <div className="flex items-center">
          <span className="text-sm mr-2">แสดง:</span>
          <select
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">ข้อมูล CSV (เฉพาะคอลัมน์ที่ระบุ)</h2>

        {filteredData.length > 0 ? (
          <>
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                พบข้อมูลทั้งหมด {filteredData.length} รายการ
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => {
                    // Reset all filters
                    setFilters({});
                    // Reset sorting
                    setSortConfig({ key: null, direction: 'ascending' });
                    // Reset pagination
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  {/* Filter row */}
                  <tr>
                    {selectedColumns.map((header, index) => (
                      <th key={`filter-${index}`} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="text"
                          placeholder={`กรอง ${header}`}
                          value={filters[header] || ''}
                          onChange={(e) => handleFilterChange(header, e.target.value)}
                          className="w-full p-1 text-xs border border-gray-300 rounded"
                        />
                      </th>
                    ))}
                  </tr>

                  {/* Header row */}
                  <tr>
                    {selectedColumns.map((header, index) => (
                      <th
                        key={index}
                        onClick={() => requestSort(header)}
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          {header}
                          {sortConfig.key === header && (
                            <span className="ml-1">
                              {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {currentRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      {selectedColumns.map((header, colIndex) => (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap"
                        >
                          {row[header] !== null && row[header] !== undefined ? row[header] : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {renderPagination()}
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">ไม่พบข้อมูลที่ต้องการ</div>
        )}
      </div>
    </div>
  );
};

export default CSVTable;