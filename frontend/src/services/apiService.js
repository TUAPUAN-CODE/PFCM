const API_URL = import.meta.env.VITE_API_URL;

export const updateSlot = async (slot_id, cs_id, action) => {
  const endpoint = action === "reserve" ? "update-rsrv-slot" : "update-NULL-slot";

  try {
    const response = await fetch(`${API_URL}/api/coldstorage/${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot_id, cs_id }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to update slot");

    console.log(`✅ Slot ${action} updated successfully`, data);
    return data;
  } catch (error) {
    console.error("❌ Error updating slot:", error);
    return null;
  }
};
