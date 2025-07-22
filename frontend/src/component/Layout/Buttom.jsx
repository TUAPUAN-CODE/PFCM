const Buttom = ({ title, user }) => {
    return (
        <header
            style={{
                backgroundColor: "#fff",
                color: "#686868",
                borderRadius: "4px",
                // border: '1px solid #e0e0e0',
                padding: "8px 15px",
                fontSize: "9px",
                display: "flex",
                alignItems: "center", // Vertically center content
                justifyContent: "center", // Horizontally center content
				boxShadow: "0 0px 3px rgba(0, 0, 0, 0.2)",
            }}
        >
            <h6 style={{ 
                textAlign: "center", 
                margin: 0, // Remove default h6 margins
                flex: 1,     // Allow h6 to expand to fill available space if needed
                whiteSpace: 'nowrap', // Prevent text from wrapping and messing up centering
                 overflow: 'hidden',   // Handle potential overflow if text is too long
                 textOverflow: 'ellipsis' // Add ellipsis (...) if text overflows
             }}>{title}</h6>

        </header>
    );
};

export default Buttom;