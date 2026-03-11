import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
  Paper, Box, TextField, TablePagination, Typography, Chip, IconButton,
  ToggleButton, ToggleButtonGroup, Card, CardContent, Divider, Tooltip,
  Popper, ClickAwayListener, List, ListItem, ListItemText, InputAdornment as MuiInputAdornment
} from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ClearIcon from "@mui/icons-material/Clear";

// ─── Helper: derive display location string ───────────────────────────────────
const getDisplayLocation = (row) => {
  const loc = row.trolley_location || '';
  const status = row.trolley_status || '';

  if (loc === 'รอห้องเย็นหรือบรรจุ Check In') return 'รถเข็นรอห้องเย็นหรือบรรจุ Check In';
  if (loc === 'รอบรรจุทำรายการรับเข้า') return 'รอบรรจุทำรายการรับเข้า';

  if (loc.includes('อยู่ในห้องเย็น') && status === 'รถเข็นว่าง (ห้องเย็น)') return 'ห้องเย็นจองรถเข็นว่างจัดชุด';
  if (loc.includes('อยู่ในห้องเย็น') && (status === 'มีวัตถุดิบ' || status === 'มีวัตถุดิบ (ห้องเย็น)')) return 'อยู่ในห้องเย็น';
  if (status === 'รอบรรจุจัดส่ง') return `บรรจุจองรถเข็นว่าง${row.line_name ? ` ${row.line_name}` : ''}`;

  return loc || '-';
};

const GROUP_ORDER = [
  'รอบรรจุทำรายการรับเข้า',
  'อยู่ในห้องเย็น',
  'รถเข็นรอห้องเย็นหรือบรรจุ Check In',
  'ห้องเย็นจองรถเข็นว่างจัดชุด',
  'บรรจุจองรถเข็นว่าง',
];

const getGroupKey = (row, displayLoc) => {
  if (displayLoc === 'รอบรรจุทำรายการรับเข้า') return 'รอบรรจุทำรายการรับเข้า';
  if (displayLoc === 'อยู่ในห้องเย็น') return 'อยู่ในห้องเย็น';
  if (displayLoc === 'รถเข็นรอห้องเย็นหรือบรรจุ Check In') return 'รถเข็นรอห้องเย็นหรือบรรจุ Check In';
  if (displayLoc === 'ห้องเย็นจองรถเข็นว่างจัดชุด') return 'ห้องเย็นจองรถเข็นว่างจัดชุด';
  if (displayLoc.startsWith('บรรจุจองรถเข็นว่าง')) return 'บรรจุจองรถเข็นว่าง';
  return 'อื่นๆ';
};

const STATUS_COLORS = {
  'รถเข็นว่าง (ห้องเย็น)': '#787878',
  'มีวัตถุดิบ': '#007BFF',
  'มีวัตถุดิบ (ห้องเย็น)': '#007BFF',
  'รอบรรจุจัดส่ง': '#ff9800',
};
const getStatusColor = (status) => STATUS_COLORS[status] || '#26c200';

const GROUP_COLORS = {
  'รอบรรจุทำรายการรับเข้า': '#d32f2f',
  'อยู่ในห้องเย็น': '#007BFF',
  'รถเข็นรอห้องเย็นหรือบรรจุ Check In': '#9c27b0',
  'ห้องเย็นจองรถเข็นว่างจัดชุด': '#787878',
  'บรรจุจองรถเข็นว่าง': '#ff9800',
  'อื่นๆ': '#26c200',
};

const countUniqueTroIds = (rows) => {
  const ids = new Set(rows.map(r => r.tro_id).filter(Boolean));
  return ids.size || rows.length;
};

// ─── Cold date pair helper ───────────────────────────────────────────────────
const ColdDatePair = ({ comeDate, outDate, label }) => {
  if (!comeDate && !outDate) return <Typography fontSize={11} color="#ccc">-</Typography>;
  return (
    <Box>
      {label && <Typography fontSize={9} color="#aaa" fontWeight={600}>{label}</Typography>}
      {comeDate && (
        <Box display="flex" alignItems="center" gap={0.3}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#007BFF', flexShrink: 0 }} />
          <Typography fontSize={10} color="#555">{comeDate}</Typography>
        </Box>
      )}
      {outDate && (
        <Box display="flex" alignItems="center" gap={0.3}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ff9800', flexShrink: 0 }} />
          <Typography fontSize={10} color="#555">{outDate}</Typography>
        </Box>
      )}
    </Box>
  );
};

// ─── RmmLine Dropdown with search ────────────────────────────────────────────
const RmmLineDropdown = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const anchorRef = useRef(null);

  const filtered = useMemo(() =>
    options.filter(o => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const handleSelect = (opt) => {
    onChange(opt === value ? null : opt);
    setOpen(false);
    setSearch('');
  };

  return (
    <ClickAwayListener onClickAway={() => { setOpen(false); setSearch(''); }}>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Box
          ref={anchorRef}
          onClick={() => setOpen(o => !o)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            border: value ? '1.5px solid #007BFF' : '1.5px solid #ddd',
            borderRadius: 1.5, px: 1.2, py: 0.4, cursor: 'pointer',
            backgroundColor: value ? '#e3f0ff' : '#fafafa',
            minWidth: 130, userSelect: 'none',
            '&:hover': { borderColor: '#007BFF', backgroundColor: '#f0f7ff' },
            transition: 'all .15s',
          }}
        >
          <Typography fontSize={12} color={value ? '#007BFF' : '#888'} fontWeight={value ? 700 : 400} noWrap sx={{ flex: 1 }}>
            {value || 'Sort by Line'}
          </Typography>
          {value ? (
            <ClearIcon
              sx={{ fontSize: 14, color: '#007BFF' }}
              onClick={e => { e.stopPropagation(); onChange(null); setSearch(''); }}
            />
          ) : (
            <ArrowDropDownIcon sx={{ fontSize: 18, color: '#aaa' }} />
          )}
        </Box>

        {open && (
          <Paper elevation={4} sx={{
            position: 'absolute', top: '110%', left: 0, zIndex: 9999,
            minWidth: 200, maxHeight: 280, display: 'flex', flexDirection: 'column',
            borderRadius: 2, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <Box sx={{ p: 1, borderBottom: '1px solid #f0f0f0' }}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                placeholder="ค้นหา Line..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                InputProps={{
                  startAdornment: <MuiInputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: '#aaa' }} /></MuiInputAdornment>,
                  sx: { fontSize: 12, height: 32 },
                }}
                sx={{ '& input': { padding: '4px 6px', fontSize: 12 } }}
              />
            </Box>
            <List dense sx={{ overflowY: 'auto', p: 0 }}>
              {filtered.length === 0 ? (
                <ListItem><ListItemText primary={<Typography fontSize={12} color="#aaa">ไม่พบ</Typography>} /></ListItem>
              ) : filtered.map(opt => (
                <ListItem
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  sx={{
                    cursor: 'pointer', py: 0.5, px: 1.5,
                    backgroundColor: opt === value ? '#e3f0ff' : 'transparent',
                    '&:hover': { backgroundColor: '#f5f9ff' },
                  }}
                >
                  <ListItemText primary={
                    <Typography fontSize={12} color={opt === value ? '#007BFF' : '#444'} fontWeight={opt === value ? 700 : 400}>
                      {opt}
                    </Typography>
                  } />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TrolleyTable
// ═══════════════════════════════════════════════════════════════════════════════
const TrolleyTable = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(500);
  const [viewMode, setViewMode] = useState('table');
  const [sortMode, setSortMode] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeRmmLine, setActiveRmmLine] = useState(null); // rmm_line_name filter

  const trolleys = data?.trolleys || [];

  // ── Enrich rows ──────────────────────────────────────────────────────────
  const enriched = useMemo(() =>
    trolleys.map(r => {
      const _displayLoc = getDisplayLocation(r);
      return { ...r, _displayLoc, _group: getGroupKey(r, _displayLoc) };
    }),
    [trolleys]
  );

  // ── Unique rmm_line_name options ─────────────────────────────────────────
  const rmmLineOptions = useMemo(() => {
    const set = new Set(enriched.map(r => r.rmm_line_name).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'th'));
  }, [enriched]);

  // ── Group counts ─────────────────────────────────────────────────────────
  const groupCounts = useMemo(() => {
    const counts = {};
    GROUP_ORDER.forEach(g => {
      counts[g] = countUniqueTroIds(enriched.filter(r => r._group === g));
    });
    return counts;
  }, [enriched]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = enriched.filter(row =>
      Object.values(row).some(v => v?.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (activeGroup) rows = rows.filter(r => r._group === activeGroup);
    if (activeRmmLine) rows = rows.filter(r => r.rmm_line_name === activeRmmLine);

    if (sortMode === 'code') {
      rows = [...rows].sort((a, b) => (a.trolley_number || '').localeCompare(b.trolley_number || '', 'th'));
    } else if (sortMode === 'line') {
      rows = [...rows].sort((a, b) => (a.line_name || '').localeCompare(b.line_name || '', 'th'));
    } else if (sortMode === 'rmmline') {
      rows = [...rows].sort((a, b) => (a.rmm_line_name || '').localeCompare(b.rmm_line_name || '', 'th'));
    }
    return rows;
  }, [enriched, searchTerm, activeGroup, activeRmmLine, sortMode]);

  useEffect(() => { setPage(0); }, [searchTerm, activeGroup, activeRmmLine, sortMode]);

  // ── Group for card view ──────────────────────────────────────────────────
  const groupedRows = useMemo(() => {
    const map = {};
    GROUP_ORDER.forEach(g => { map[g] = []; });
    filteredRows.forEach(r => {
      const key = r._group in map ? r._group : 'อื่นๆ';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [filteredRows]);

  // ── Table columns definition ─────────────────────────────────────────────
  const columns = [
    { label: 'หมายเลขรถเข็น', w: 120 },
    { label: 'สถานะรถเข็น', w: 140 },
    { label: 'Batch', w: 130 },
    { label: 'Material', w: 120 },
    { label: 'รายชื่อวัตถุดิบ', w: 200 },
    { label: 'แผนการผลิต', w: 130 },
    { label: 'RMM Line', w: 110 },
    { label: 'เวลาอบ/ต้มเสร็จ', w: 140 },
    { label: 'เวลาเตรียมเสร็จ', w: 140 },
    { label: 'เข้า-ออกห้องเย็น 1', w: 155 },
    { label: 'เข้า-ออกห้องเย็น 2', w: 155 },
    { label: 'เข้า-ออกห้องเย็น 3', w: 155 },
    { label: 'สถานที่รถเข็น', w: 240 },
  ];

  // ── Table row ─────────────────────────────────────────────────────────────
  const TableDataRow = ({ row, index }) => {
    const bg = index % 2 === 0 ? '#ffffff' : 'hsl(210,100%,96%)';
    const cellStyle = {
      borderTop: '1px solid #e8e8e8',
      borderBottom: '1px solid #e8e8e8',
      borderLeft: '1px solid #f0f0f0',
      fontSize: '13px',
      height: '48px',
      padding: '4px 8px',
      color: '#555',
      backgroundColor: bg,
    };

    const hasCold2 = row.come_cold_date_two || row.out_cold_date_two;
    const hasCold3 = row.come_cold_date_three || row.out_cold_date_three;

    return (
      <>
        <TableRow><TableCell style={{ height: 5, padding: 0, border: 0 }} /></TableRow>
        <TableRow>
          <TableCell align="center" style={{ ...cellStyle, borderLeft: '1px solid #e8e8e8', borderTopLeftRadius: 8, borderBottomLeftRadius: 8, width: 120 }}>
            <Typography fontWeight={600} fontSize={13} color="#333">{row.trolley_number || '-'}</Typography>
          </TableCell>
          <TableCell align="center" style={{ ...cellStyle, width: 140 }}>
            <Chip label={row.trolley_status} size="small"
              style={{ backgroundColor: getStatusColor(row.trolley_status), color: '#fff', fontWeight: 700, fontSize: 11 }} />
          </TableCell>
          <TableCell align="center" style={{ ...cellStyle, width: 130 }}>{row.batch || '-'}</TableCell>
          <TableCell align="center" style={{ ...cellStyle, width: 120 }}>{row.mat || '-'}</TableCell>
          <TableCell align="center" style={{ ...cellStyle, minWidth: 200 }}>{row.mat_name || '-'}</TableCell>
          <TableCell align="center" style={{ ...cellStyle, width: 130 }}>{row.production || '-'}</TableCell>
          <TableCell align="center" style={{ ...cellStyle, width: 110 }}>
            {row.rmm_line_name ? (
              <Chip label={row.rmm_line_name} size="small"
                style={{ backgroundColor: '#e3f0ff', color: '#007BFF', fontWeight: 700, fontSize: 11, border: '1px solid #b3d4ff' }} />
            ) : '-'}
          </TableCell>
          <TableCell align="center" style={{ ...cellStyle, width: 140 }}>{row.cooked_date || '-'}</TableCell>
          <TableCell align="center" style={{ ...cellStyle, width: 140 }}>{row.rmit_date || '-'}</TableCell>

          {/* Cold 1 */}
          <TableCell align="center" style={{ ...cellStyle, width: 155 }}>
            <ColdDatePair comeDate={row.come_cold_date} outDate={row.out_cold_date} />
          </TableCell>

          {/* Cold 2 */}
          <TableCell align="center" style={{ ...cellStyle, width: 155, opacity: hasCold2 ? 1 : 0.4 }}>
            <ColdDatePair comeDate={row.come_cold_date_two} outDate={row.out_cold_date_two} />
          </TableCell>

          {/* Cold 3 */}
          <TableCell align="center" style={{ ...cellStyle, width: 155, opacity: hasCold3 ? 1 : 0.4 }}>
            <ColdDatePair comeDate={row.come_cold_date_three} outDate={row.out_cold_date_three} />
          </TableCell>

          <TableCell align="center" style={{
            ...cellStyle, minWidth: 240,
            borderRight: '1px solid #e8e8e8',
            borderTopRightRadius: 8, borderBottomRightRadius: 8,
          }}>
            <Chip label={row._displayLoc} size="small"
              style={{ backgroundColor: GROUP_COLORS[row._group] || '#26c200', color: '#fff', fontWeight: 600, fontSize: 11, maxWidth: 220, height: 'auto', padding: '2px 0' }}
            />
          </TableCell>
        </TableRow>
        <TableRow><TableCell style={{ padding: 0, border: 0 }} /></TableRow>
      </>
    );
  };

  // ── Card ──────────────────────────────────────────────────────────────────
  const TrolleyCard = ({ row }) => (
    <Card elevation={0} sx={{
      border: `1.5px solid ${GROUP_COLORS[row._group] || '#e0e0e0'}22`,
      borderLeft: `4px solid ${GROUP_COLORS[row._group] || '#26c200'}`,
      borderRadius: 2, mb: 1,
      '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }
    }}>
      <CardContent sx={{ p: '10px 14px !important' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={0.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontWeight={700} fontSize={15} color="#333">{row.trolley_number || '-'}</Typography>
            <Chip label={row.trolley_status} size="small"
              style={{ backgroundColor: getStatusColor(row.trolley_status), color: '#fff', fontWeight: 700, fontSize: 11 }} />
            {row.rmm_line_name && (
              <Chip label={row.rmm_line_name} size="small"
                style={{ backgroundColor: '#e3f0ff', color: '#007BFF', fontWeight: 700, fontSize: 11, border: '1px solid #b3d4ff' }} />
            )}
          </Box>
          <Chip label={row._displayLoc} size="small"
            style={{ backgroundColor: GROUP_COLORS[row._group] || '#26c200', color: '#fff', fontWeight: 600, fontSize: 11, maxWidth: 280, height: 'auto', padding: '2px 0', whiteSpace: 'normal' }} />
        </Box>
        <Divider sx={{ my: 0.75 }} />
        <Box display="flex" gap={2} flexWrap="wrap">
          {[
            ['Batch', row.batch],
            ['Material', row.mat],
            ['วัตถุดิบ', row.mat_name],
            ['แผนผลิต', row.production],
            ['อบ/ต้มเสร็จ', row.cooked_date],
            ['เตรียมเสร็จ', row.rmit_date],
          ].map(([label, val]) => val && val !== '-' ? (
            <Box key={label}>
              <Typography fontSize={10} color="#aaa" lineHeight={1.2}>{label}</Typography>
              <Typography fontSize={12} color="#555" fontWeight={500}>{val}</Typography>
            </Box>
          ) : null)}
        </Box>

        {/* Cold dates */}
        {(row.come_cold_date || row.out_cold_date || row.come_cold_date_two || row.out_cold_date_two || row.come_cold_date_three || row.out_cold_date_three) && (
          <>
            <Divider sx={{ my: 0.75 }} />
            <Box display="flex" gap={2} flexWrap="wrap">
              {[
                { label: 'ห้องเย็น 1', come: row.come_cold_date, out: row.out_cold_date },
                { label: 'ห้องเย็น 2', come: row.come_cold_date_two, out: row.out_cold_date_two },
                { label: 'ห้องเย็น 3', come: row.come_cold_date_three, out: row.out_cold_date_three },
              ].map(({ label, come, out }) => (come || out) ? (
                <Box key={label}>
                  <Typography fontSize={10} color="#aaa" lineHeight={1.2} fontWeight={600}>{label}</Typography>
                  <ColdDatePair comeDate={come} outDate={out} />
                </Box>
              ) : null)}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );

  // ── Summary badge ─────────────────────────────────────────────────────────
  const GroupBadge = ({ group }) => (
    <Chip
      label={`${group}: ${groupCounts[group] ?? 0} คัน`}
      size="small"
      onClick={() => setActiveGroup(activeGroup === group ? null : group)}
      style={{
        backgroundColor: activeGroup === group ? GROUP_COLORS[group] : `${GROUP_COLORS[group]}22`,
        color: activeGroup === group ? '#fff' : GROUP_COLORS[group],
        border: `1.5px solid ${GROUP_COLORS[group]}`,
        fontWeight: 600, fontSize: 11, cursor: 'pointer',
      }}
    />
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 2 }}>

      {/* ── Header ── */}
      <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h6" sx={{ color: '#444', fontWeight: 700, fontSize: 16 }}>
            ข้อมูลรถเข็น
          </Typography>

          <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
            {/* RMM Line Dropdown */}
            <RmmLineDropdown
              options={rmmLineOptions}
              value={activeRmmLine}
              onChange={setActiveRmmLine}
            />

            {/* Sort */}
            {/* <ToggleButtonGroup size="small" value={sortMode} exclusive
              onChange={(_, v) => setSortMode(v)}
              sx={{ '& .MuiToggleButton-root': { fontSize: 11, px: 1.2, py: 0.4, textTransform: 'none' } }}>
              <ToggleButton value="code">
                <SortByAlphaIcon sx={{ fontSize: 14, mr: 0.4 }} /> Sort Code
              </ToggleButton>
              <ToggleButton value="line">
                <SortByAlphaIcon sx={{ fontSize: 14, mr: 0.4 }} /> Sort Line
              </ToggleButton>
            </ToggleButtonGroup> */}

            {/* View mode */}
            <ToggleButtonGroup size="small" value={viewMode} exclusive
              onChange={(_, v) => v && setViewMode(v)}
              sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.4 } }}>
              <Tooltip title="ตารางข้อมูล"><ToggleButton value="table"><ViewListIcon sx={{ fontSize: 18 }} /></ToggleButton></Tooltip>
              <Tooltip title="การ์ดตามสถานะ"><ToggleButton value="card"><ViewModuleIcon sx={{ fontSize: 18 }} /></ToggleButton></Tooltip>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Group filter chips */}
        <Box display="flex" gap={0.75} flexWrap="wrap" mt={1} mb={0.5}>
          {GROUP_ORDER.map(g => <GroupBadge key={g} group={g} />)}
          {(activeGroup || activeRmmLine) && (
            <Chip
              label="ล้างตัวกรอง"
              size="small"
              onClick={() => { setActiveGroup(null); setActiveRmmLine(null); }}
              sx={{ fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
            />
          )}
        </Box>
      </Box>

      {/* ── Search ── */}
      <Box sx={{ px: 2, pb: 1 }}>
        <TextField variant="outlined" fullWidth placeholder="พิมพ์เพื่อค้นหารถเข็น..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#aaa' }} /></InputAdornment>,
            sx: { height: 40 },
          }}
          sx={{
            '& .MuiOutlinedInput-root': { height: 40, fontSize: 13, borderRadius: 2, color: '#555' },
            '& input': { padding: '8px' },
          }}
        />
      </Box>

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <>
          <TableContainer style={{ padding: '0 16px' }} sx={{ height: 'calc(65vh)', overflowY: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ height: 44 }}>
                  {columns.map((col, i) => (
                    <TableCell key={col.label} align="center" style={{
                      backgroundColor: 'hsl(210,80%,55%)',
                      border: '1px solid #d0dff0',
                      borderLeft: i === 0 ? '1px solid #d0dff0' : '1px solid #c8dcf0',
                      borderTopLeftRadius: i === 0 ? 8 : 0,
                      borderBottomLeftRadius: i === 0 ? 8 : 0,
                      borderTopRightRadius: i === columns.length - 1 ? 8 : 0,
                      borderBottomRightRadius: i === columns.length - 1 ? 8 : 0,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 8px',
                      color: '#fff',
                      minWidth: col.w,
                      whiteSpace: 'nowrap',
                    }}>
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Legend row for cold dates */}
                <TableRow>
                  {columns.map((col, i) => {
                    const isColdCol = ['เข้า-ออกห้องเย็น 1', 'เข้า-ออกห้องเย็น 2', 'เข้า-ออกห้องเย็น 3'].includes(col.label);
                    if (!isColdCol) return <TableCell key={i} style={{ padding: 0, border: 0 }} />;
                    return (
                      <TableCell key={i} align="center" style={{ padding: '2px 8px', border: 0, backgroundColor: 'transparent' }}>
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Box display="flex" alignItems="center" gap={0.3}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#007BFF' }} />
                            <Typography fontSize={9} color="#aaa">เข้า</Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.3}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ff9800' }} />
                            <Typography fontSize={9} color="#aaa">ออก</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length > 0
                  ? filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, i) => <TableDataRow key={`${row.trolley_number}-${i}`} row={row} index={i} />)
                  : (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center" sx={{ py: 4, fontSize: 15, color: '#aaa' }}>
                        ไม่มีข้อมูลรถเข็นในขณะนี้
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            sx={{ '& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar': { fontSize: 11, color: '#888', padding: 0 } }}
            rowsPerPageOptions={[500, 1000, 1500]}
            component="div"
            count={filteredRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </>
      )}

      {/* ── CARD VIEW ── */}
      {viewMode === 'card' && (
        <Box sx={{ px: 2, pb: 2, height: 'calc(68vh)', overflowY: 'auto' }}>
          {GROUP_ORDER.map(group => {
            const rows = groupedRows[group] || [];
            if (rows.length === 0) return null;
            return (
              <Box key={group} mb={2}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box sx={{ width: 4, height: 18, borderRadius: 2, backgroundColor: GROUP_COLORS[group] }} />
                  <Typography fontWeight={700} fontSize={13} color={GROUP_COLORS[group]}>{group}</Typography>
                  <Chip label={`${countUniqueTroIds(rows)} คัน`} size="small"
                    style={{ backgroundColor: GROUP_COLORS[group], color: '#fff', fontWeight: 700, fontSize: 10 }} />
                </Box>
                {rows.map((row, i) => <TrolleyCard key={`${row.trolley_number}-${i}`} row={row} />)}
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

export default TrolleyTable;