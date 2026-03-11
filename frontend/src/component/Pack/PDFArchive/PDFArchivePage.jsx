import { useEffect, useMemo, useState } from "react";
import Header from "../Layout/Header";
import axios from "axios";

axios.defaults.withCredentials = true;

const API_URL = import.meta.env.VITE_API_URL;

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const PDFArchivePage = () => {
  const [query, setQuery] = useState("");
  const [paperStatus, setPaperStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const [selected, setSelected] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");

  const params = useMemo(() => {
    const p = {};
    if (query) p.q = query;
    if (paperStatus) p.paper_status = paperStatus;
    p.limit = 100;
    p.offset = 0;
    return p;
  }, [query, paperStatus]);

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/api/pack/data/pdf`, { params });
      if (!res.data?.success) throw new Error("Failed to fetch PDF list");
      setItems(res.data.data || []);
    } catch (e) {
      setError(e?.message || "Fetch failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openPdf = async (paper) => {
    setSelected(paper);
    setError("");

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }

    try {
      const res = await fetch(`${API_URL}/api/pack/data/pdf/${paper.paper_id}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`โหลด PDF ไม่สำเร็จ: ${res.status} ${txt}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (e) {
      setError(e?.message || "Load PDF failed");
    }
  };

  useEffect(() => {
    fetchList();
    // cleanup object URL
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ backgroundColor: "#fff" }} className="flex-1 overflow-auto relative z-10">
      <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
        <Header title="PDF Archive" />
      </main>

      <main className="max-w-8xl mx-auto py-2 px-2 lg:px-8">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ค้นหา: line / plant / คนบันทึก..."
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                  <select
                    value={paperStatus}
                    onChange={(e) => setPaperStatus(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                    title="paper_status"
                  >
                    <option value="">ทุกสถานะ</option>
                    <option value="N">N</option>
                    <option value="Y">Y</option>
                  </select>
                  <button
                    onClick={fetchList}
                    className="bg-blue-600 text-white rounded px-3 py-1 text-sm"
                    disabled={loading}
                  >
                    {loading ? "กำลังโหลด..." : "ค้นหา"}
                  </button>
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <div className="max-h-[70vh] overflow-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left p-2 border-b">paper_id</th>
                        <th className="text-left p-2 border-b">date</th>
                        <th className="text-left p-2 border-b">shift</th>
                        <th className="text-left p-2 border-b">line</th>
                        <th className="text-left p-2 border-b">plant</th>
                        <th className="text-left p-2 border-b">status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr
                          key={it.paper_id}
                          className={`cursor-pointer hover:bg-blue-50 ${
                            selected?.paper_id === it.paper_id ? "bg-blue-100" : ""
                          }`}
                          onClick={() => openPdf(it)}
                        >
                          <td className="p-2 border-b">{it.paper_id}</td>
                          <td className="p-2 border-b">{formatDateTime(it.date)}</td>
                          <td className="p-2 border-b">{it.shift || ""}</td>
                          <td className="p-2 border-b">{it.line || ""}</td>
                          <td className="p-2 border-b">{it.plant || ""}</td>
                          <td className="p-2 border-b">{it.paper_status || ""}</td>
                        </tr>
                      ))}
                      {!items.length && !loading && (
                        <tr>
                          <td className="p-3 text-gray-500" colSpan={6}>
                            ไม่พบข้อมูล
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="rounded-lg border border-gray-200 p-3 min-h-[70vh]">
              {!selected && (
                <div className="text-sm text-gray-600">เลือกเอกสารจากรายการด้านซ้ายเพื่อแสดง PDF</div>
              )}

              {selected && (
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm">
                    <div className="font-semibold">paper_id: {selected.paper_id}</div>
                    <div className="text-gray-600">
                      {selected.line ? `Line: ${selected.line}` : ""}{" "}
                      {selected.plant ? `Plant: ${selected.plant}` : ""}{" "}
                      {selected.shift ? `Shift: ${selected.shift}` : ""}
                    </div>
                  </div>
                  <a
                    className="text-sm text-blue-700 underline"
                    href={`${API_URL}/api/pack/data/pdf/${selected.paper_id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    เปิดแท็บใหม่
                  </a>
                </div>
              )}

              {pdfUrl && (
                <iframe
                  title="pdf-preview"
                  src={pdfUrl}
                  className="w-full h-[65vh] border rounded"
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PDFArchivePage;

