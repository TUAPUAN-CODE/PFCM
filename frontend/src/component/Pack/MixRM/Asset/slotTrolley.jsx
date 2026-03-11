import React, { useState, useEffect } from "react";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import MixIcon from "@mui/icons-material/Blender";
import {
    IconButton,
    Button,
    Box,
    Typography,
    Snackbar,
    Alert,
    Paper,
    CircularProgress,
    AppBar,
    Toolbar,
    Fade,
    Backdrop,
    Autocomplete,
    Chip,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import TableList from "./table";
import ModalSuccess from "./modalsuccess";
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

const Slottrolley = ({ onClose }) => {
    // State management
    const [isLoading, setIsLoading] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);

    // Production plan state
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [productionPlans, setProductionPlans] = useState([]);

    // Trolley data state (consolidated)
    const [availableTrolleys, setAvailableTrolleys] = useState([]);
    const [basketItems, setBasketItems] = useState([]);
    const [weights, setWeights] = useState({});
    const [totalWeight, setTotalWeight] = useState(0);

    const [selectedLineId, setSelectedLineId] = useState(null); // เก็บ Lineid ที่เลือกจาก localStorage

    useEffect(() => {
        const LineIdFromLocalStorage = localStorage.getItem("line_id");
        console.log("line_id from localStorage:", LineIdFromLocalStorage); // ตรวจสอบค่าใน localStorage
        if (LineIdFromLocalStorage) {
            setSelectedLineId(LineIdFromLocalStorage);
        }
    }, []);

    // Generate unique key for each plan - improved to ensure uniqueness
    const generateUniqueKey = (plan) => {
        return `plan-${plan.code}-${plan.doc_no}-${plan.prod_id}-${Date.now()}`;
    };

    // Fetch production plans on component mount
    useEffect(() => {
        const fetchProductionPlans = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(`${API_URL}/api/production-plans`);
                if (response.data.success) {
                    const plansWithUniqueKeys = response.data.data.map(plan => ({
                        ...plan,
                        uniqueKey: generateUniqueKey(plan)
                    }));
                    setProductionPlans(plansWithUniqueKeys);
                }
            } catch (error) {
                console.error("Error fetching production plans:", error);
                showSnackbar("Failed to load production plans", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProductionPlans();
    }, []);

    // Calculate total weight whenever basket items or weights change
    useEffect(() => {
        const newTotal = basketItems.reduce(
            (sum, item) => sum + (parseFloat(weights[item.mapping_id]) || 0),
            0
        );
        setTotalWeight(newTotal);
    }, [basketItems, weights]);

    // Show notification message
    const showSnackbar = (message, severity) => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setOpenSnackbar(true);
    };

    // Refresh data
    const handleRefresh = async () => {
        if (!selectedPlan) {
            showSnackbar("กรุณาเลือกแผนการผลิตก่อน", "warning");
            return;
        }

        setIsLoading(true);
        try {
            await fetchTrolleys(selectedPlan.prod_id);
            showSnackbar("ข้อมูลได้รับการอัพเดตแล้ว", "success");
        } catch (error) {
            console.error("Error refreshing data:", error);
            showSnackbar("ไม่สามารถอัพเดตข้อมูลได้", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch trolleys when plan is selected
    const fetchTrolleys = async (prodId) => {
        if (!prodId) {
            setAvailableTrolleys([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/pack/mix/trolley`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    code: prodId, 
                    line_id: selectedLineId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "ไม่สามารถดึงข้อมูลได้");
            }

            const data = await response.json();
            if (data && data.length > 0) {
                const transformedData = data.map(item => ({
                    mapping_id: item.mapping_id,
                    batch: item.batch_after,
                    rmit_date: item.rmit_date,
                    weight_RM: item.weight_RM,
                    ntray: item.ntray,
                    mat_name: item.mat_name,
                    doc_no: item.doc_no,
                    mat: item.mat,
                    trolleyKey: `trolley-${item.mapping_id}`
                }));
                setAvailableTrolleys(transformedData);
            } else {
                setAvailableTrolleys([]);
                showSnackbar("ไม่พบรายการวัตถุดิบ", "warning");
            }
        } catch (error) {
            console.error("Error fetching trolleys:", error);
            showSnackbar("ไม่พบรายการวัตถุดิบ", "error");
            setAvailableTrolleys([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle plan selection
    const handlePlanChange = async (newPlan) => {
        setSelectedPlan(newPlan);

        // Reset all related state
        setBasketItems([]);
        setWeights({});
        setTotalWeight(0);

        if (newPlan) {
            await fetchTrolleys(newPlan.prod_id);
        } else {
            setAvailableTrolleys([]);
        }
    };

    // Handle weight changes from TableList
    const handleWeightChange = (rmTroId, newWeight) => {
        setWeights(prev => {
            const updated = { ...prev, [rmTroId]: parseFloat(newWeight) || 0 };
            return updated;
        });
    };

    // Handle adding items to basket
    const handleAddToBasket = (items) => {
        // Add items to basket
        const newBasketItems = [...basketItems];
        const newWeights = { ...weights };

        items.forEach(item => {
            if (!basketItems.some(basketItem => basketItem.mapping_id === item.mapping_id)) {
                // Ensure each basket item has a unique key
                const basketItem = {
                    ...item,
                    basketKey: `basket-${item.mapping_id}`
                };
                newBasketItems.push(basketItem);
                newWeights[item.mapping_id] = parseFloat(item.weight_RM) || 0;
            }
        });

        setBasketItems(newBasketItems);
        setWeights(newWeights);
    };

    // Handle removing items from basket
    const handleRemoveFromBasket = (rmTroId) => {
        setBasketItems(prev => prev.filter(item => item.mapping_id !== rmTroId));
    };

    // Handle deleting trolley
    const handleDeleteTrolley = async (rmTroId) => {
        try {
            // Remove from available trolleys and basket
            setAvailableTrolleys(prev => prev.filter(t => t.mapping_id !== rmTroId));
            setBasketItems(prev => prev.filter(item => item.mapping_id !== rmTroId));

            // Remove from weights
            setWeights(prev => {
                const newWeights = { ...prev };
                delete newWeights[rmTroId];
                return newWeights;
            });

            showSnackbar(`รถเข็นถูกลบออกแล้ว`, "info");
        } catch (error) {
            console.error("Error deleting trolley:", error);
            showSnackbar("ไม่สามารถลบข้อมูลรถเข็นได้", "error");
        }
    };

    // Handle mix button click - now opens confirmation dialog
    const handleMixButtonClick = () => {
        if (!selectedPlan) {
            showSnackbar("กรุณาเลือกแผนการผลิตก่อน", "error");
            return;
        }

        if (basketItems.length === 0) {
            showSnackbar("กรุณาเลือกวัตถุดิบอย่างน้อยหนึ่งรายการ", "error");
            return;
        }

        // Open confirmation dialog instead of immediately showing success modal
        setShowConfirmationDialog(true);
    };

    // Handle confirmation dialog confirm
    const handleConfirmMix = () => {
        setShowConfirmationDialog(false);
        setShowSuccessModal(true);
    };

    // Handle confirmation dialog cancel
    const handleCancelConfirmation = () => {
        setShowConfirmationDialog(false);
    };

    // Handle success modal close
    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        onClose();
    };

    return (
        <Fade in={true}>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={true}
                onClick={(e) => e.stopPropagation()}
            >
                <Paper
                    elevation={8}
                    style={{ color: "#585858" }}
                    className="bg-white rounded-lg shadow-lg w-[1200px] h-[600px] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <AppBar position="static" sx={{ backgroundColor: "#4e73df" }}>
                        <Toolbar sx={{ minHeight: "50px", px: 2 }}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <WarehouseIcon sx={{ mr: 1 }} />
                                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                    การผสมวัตถุดิบ
                                </Typography>
                            </Box>
                            <Box sx={{ flexGrow: 1 }} />
                            <IconButton
                                color="inherit"
                                onClick={handleRefresh}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <CircularProgress size={24} color="inherit" />
                                ) : (
                                    <RefreshIcon />
                                )}
                            </IconButton>
                        </Toolbar>
                    </AppBar>

                    {/* Production Plan Selection */}
                    <Box sx={{ p: 2, backgroundColor: "#f8f9fc", borderBottom: "1px solid #e3e6f0" }}>
                        <Autocomplete
                            value={selectedPlan}
                            options={productionPlans}
                            getOptionLabel={(option) => `${option.code} - (${option.doc_no})`}
                            isOptionEqualToValue={(option, value) => option?.prod_id === value?.prod_id}
                            onChange={(event, newValue) => handlePlanChange(newValue)}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} key={`option-${option.prod_id}-${option.code}-${option.doc_no}`}>
                                    {option.code} - ({option.doc_no})
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="เลือกแผนการผลิต"
                                    size="small"
                                    fullWidth
                                />
                            )}
                        />
                        {selectedPlan && (
                            <Box sx={{ mt: 1 }}>
                                <Chip
                                    key={`selected-${selectedPlan.prod_id}-${Date.now()}`}
                                    label={`${selectedPlan.code} - (${selectedPlan.doc_no})`}
                                    onDelete={() => handlePlanChange(null)}
                                    sx={{
                                        backgroundColor: "#EAEAEA",
                                        color: "#000",
                                        width: "100%",
                                        justifyContent: "space-between"
                                    }}
                                />
                            </Box>
                        )}
                    </Box>

                    {/* TableList to display trolleys */}
                    <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                        <TableList
                            productionPlan={selectedPlan}
                            availableTrolleys={availableTrolleys}
                            basketItems={basketItems}
                            weights={weights}
                            onWeightChange={handleWeightChange}
                            onAddToBasket={handleAddToBasket}
                            onRemoveFromBasket={handleRemoveFromBasket}
                            onDeleteTrolley={handleDeleteTrolley}
                            isLoading={isLoading}
                            totalWeight={totalWeight}
                        />
                    </Box>

                    {/* Action buttons */}
                    <Box
                        sx={{
                            p: 2,
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 2,
                            backgroundColor: "#f8f9fc",
                            borderTop: "1px solid #e3e6f0",
                        }}
                    >
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<MixIcon />}
                            onClick={handleMixButtonClick}
                            disabled={isSubmitting || isLoading || basketItems.length === 0 || !selectedPlan}
                            sx={{
                                backgroundColor: "#4e73df",
                                '&:hover': { backgroundColor: "#2e59d9" },
                                borderRadius: 2,
                            }}
                        >
                            ผสมวัตถุดิบ
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            sx={{
                                color: "#E74A3B",
                                borderColor: "#E74A3B",
                                "&:hover": {
                                    backgroundColor: "#fde7e9",
                                    borderColor: "#d52a1a"
                                },
                                borderRadius: 2,
                            }}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            ยกเลิก
                        </Button>
                    </Box>

                    {/* Confirmation Dialog */}
                    <Dialog
                        open={showConfirmationDialog}
                        onClose={handleCancelConfirmation}
                        aria-labelledby="confirmation-dialog-title"
                        aria-describedby="confirmation-dialog-description"
                        maxWidth="md"
                    >
                        <DialogTitle id="confirmation-dialog-title" sx={{ backgroundColor: "#f8f9fc", borderBottom: "1px solid #e3e6f0" }}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <MixIcon sx={{ mr: 1, color: "#4e73df" }} />
                                <Typography variant="h6">
                                    ยืนยันการผสมวัตถุดิบ
                                </Typography>
                            </Box>
                        </DialogTitle>
                        <DialogContent sx={{ mt: 2 }}>

                            {selectedPlan && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: "none", mb: 1 }}>
                                        แผนการผลิต:
                                    </Typography>
                                    <Chip
                                        label={`${selectedPlan.code} - (${selectedPlan.doc_no})`}
                                        sx={{
                                            backgroundColor: "#EAEAEA",
                                            color: "#000",
                                        }}
                                    />
                                </Box>
                            )}

                            <Typography variant="subtitle1" sx={{ fontWeight: "none", mb: 1 }}>
                                รายการวัตถุดิบที่เลือก:
                            </Typography>

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead sx={{ backgroundColor: "#f8f9fc" }}>
                                        <TableRow>
                                            <TableCell>ลำดับ</TableCell>
                                            <TableCell>รหัสวัตถุดิบ</TableCell>
                                            <TableCell>ชื่อวัตถุดิบ</TableCell>
                                            <TableCell>เวลาเตรียมเสร็จ</TableCell>
                                            <TableCell>batch</TableCell>
                                            <TableCell align="right">น้ำหนัก (กก.)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {basketItems.map((item, index) => (
                                            <TableRow key={`confirm-${item.mapping_id}`}>
                                                <TableCell style={{ textAlign: 'center' }}>{index + 1}</TableCell>
                                                <TableCell style={{ textAlign: 'center' }}>{item.mapping_id}</TableCell>
                                                <TableCell>{item.mat_name}</TableCell>
                                                <TableCell>{item.rmit_date}</TableCell>
                                                <TableCell>{item.batch}</TableCell>
                                                <TableCell align="right">{weights[item.mapping_id].toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ backgroundColor: "#f8f9fc" }}>
                                            <TableCell colSpan={4} align="right" sx={{ fontWeight: "none" }}>
                                                น้ำหนักรวม:
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: "none" }}>
                                                {totalWeight.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, backgroundColor: "#f8f9fc", borderTop: "1px solid #e3e6f0" }}>
                            <Button
                                onClick={handleCancelConfirmation}
                                sx={{
                                    color: "#858796",
                                    "&:hover": {
                                        backgroundColor: "#f8f9fc"
                                    }
                                }}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                onClick={handleConfirmMix}
                                variant="contained"
                                sx={{
                                    backgroundColor: "#4e73df",
                                    '&:hover': { backgroundColor: "#2e59d9" },
                                }}
                            >
                                ยืนยัน
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Snackbar for notifications */}
                    <Snackbar
                        open={openSnackbar}
                        autoHideDuration={3000}
                        onClose={() => setOpenSnackbar(false)}
                        anchorOrigin={{ vertical: "top", horizontal: "center" }}
                    >
                        <Alert
                            onClose={() => setOpenSnackbar(false)}
                            severity={snackbarSeverity}
                            variant="filled"
                            elevation={6}
                            sx={{ width: '100%' }}
                        >
                            {snackbarMessage}
                        </Alert>
                    </Snackbar>

                    {/* Success Modal */}
                    {showSuccessModal && (
                        <ModalSuccess
                            mapping_id={basketItems.map(item => item.mapping_id)}
                            weights={basketItems.map(item => weights[item.mapping_id] || 0)}
                            tro_production_id={selectedPlan?.prod_id}
                            onClose={handleSuccessModalClose}
                        />
                    )}
                </Paper>
            </Backdrop>
        </Fade>
    );
};

export default Slottrolley;