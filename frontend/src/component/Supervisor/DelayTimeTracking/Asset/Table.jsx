import React from 'react';

const Table = ({ data }) => {
  if (!data) return <div className="text-gray-600 p-4">No data available</div>;

  const totalCounts = {
    prepToCold: data.summary[0].values[0],
    cold: data.summary[0].values[1],
    coldToPack: data.summary[0].values[2],
    prepToPack: data.summary[0].values[3]
  };

  const barColors = {
    prepToCold: 'bg-emerald-600',
    cold: 'bg-amber-600',
    coldToPack: 'bg-rose-600',
    prepToPack: 'bg-violet-600'
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm">
      {/* Main Summary Table */}
      <div className="mb-8 px-6 pt-6">  {/* Added padding */}
        <h3 className="text-lg font-semibold mb-4 text-[#4aaaec] border-b pb-2 pl-2">  {/* Added pl-2 */}
          ประเภทวัตถุดิบ: <span className="text-gray-700">{data.metadata.groupName}</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <tbody>
              {data.summary.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border border-gray-200 px-6 py-3 font-medium text-gray-700">{row.label}</td>  {/* Increased px */}
                  {row.values.map((value, colIndex) => (
                    <td key={colIndex} className="border border-gray-200 px-6 py-3 text-center">  {/* Increased px */}
                      {row.label === "N" ? Math.round(value) : 
                       typeof value === 'number' ? value.toFixed(1) : value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delay Distribution Table */}
      <div className="mt-8 px-6 pb-6">  {/* Added padding */}
        <h3 className="text-lg font-semibold mb-4 text-[#4aaaec] border-b pb-2 pl-2">  {/* Added pl-2 */}
          Delay Time Distribution (hours)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-[#4aaaec] text-white">
                {data.delayDistribution.headers.map((header, index) => (
                  <th key={index} className="border border-gray-200 px-6 py-3">  {/* Increased px */}
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.delayDistribution.data.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  {row.map((cell, cellIndex) => {
                    if (cellIndex >= 1 && cellIndex <= 4) {
                      const total = totalCounts[
                        cellIndex === 1 ? 'prepToCold' : 
                        cellIndex === 2 ? 'cold' : 
                        cellIndex === 3 ? 'coldToPack' : 'prepToPack'
                      ];
                      const percentage = total > 0 ? (cell / total) * 100 : 0;

                      const colorClass = [
                        '', // Skip index 0
                        barColors.prepToCold,
                        barColors.cold,
                        barColors.coldToPack,
                        barColors.prepToPack
                      ][cellIndex];
                      
                      return (
                        <td key={cellIndex} className="border border-gray-200 px-6 py-3 relative group">  {/* Increased px */}
                          <div className="flex items-center justify-between z-10 relative">
                            <span>{Math.round(cell)}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div 
                             className={`absolute inset-y-0 left-0 ${colorClass} opacity-90 rounded-r-md`}
                            style={{ 
                              width: `${percentage}%`,
                              transition: 'width 0.3s ease'
                            }}
                          ></div>
                          <div className="absolute inset-y-0 left-0 bg-gray-200 opacity-30 w-full rounded-r-md">
                          </div>
                        </td>
                      );
                    }
                    
                    return (
                      <td key={cellIndex} className="border border-gray-200 px-6 py-3 text-center">  {/* Increased px */}
                        {typeof cell === 'number' ? cell.toFixed(1) : cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="mt-6 mx-6 p-4 bg-gray-50 rounded-lg border border-gray-200">  {/* Added mx-6 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium text-[#4aaaec]">Group:</span> {data.metadata.groupName}
          </div>
          <div>
            <span className="font-medium text-[#4aaaec]">Type:</span> {data.metadata.rmType}
          </div>
          <div>
            <span className="font-medium text-[#4aaaec]">Sample Size:</span> {data.metadata.sampleSize}
          </div>
        </div>
      </div>
      
      {/* Legend Section */}
      <div className="mt-4 mx-6 pb-6 flex flex-wrap gap-4 text-sm">  {/* Added mx-6 and pb-6 */}
        <div className="flex items-center">
          <div className={`w-4 h-4 ${barColors.prepToCold} rounded mr-2`}></div>
          <span>เตรียม→เข้าห้องเย็น</span>
        </div>
        <div className="flex items-center">
          <div className={`w-4 h-4 ${barColors.cold} rounded mr-2`}></div>
          <span>เข้า→ออกห้องเย็น</span>
        </div>
        <div className="flex items-center">
          <div className={`w-4 h-4 ${barColors.coldToPack} rounded mr-2`}></div>
          <span>ออกห้องเย็น→บรรจุเสร็จ</span>
        </div>
        <div className="flex items-center">
          <div className={`w-4 h-4 ${barColors.prepToPack} rounded mr-2`}></div>
          <span>เตรียม→บรรจุเสร็จ</span>
        </div>
      </div>
    </div>
  );
};

export default Table;