import Header from "../../../Layout/Header";
import Buttom from "../../../Layout/Buttom";
import ParentComponentLarge from "./ParentComponentLarge";

const  CSLargePageCOS = () => {
	
	return (
		<div
		  style={{ backgroundColor: "#fff" }}
		  className="flex-1 overflow-auto relative z-10"
		>
		  <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
		  <Header title={"ห้องเย็นใหญ่"}   />
		  </main>
		  <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
            <ParentComponentLarge/>
		  </main>
		  <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
			<Buttom title="Copyright © 2025 i-Tail Corporation Public Company Limited. All right reserved" />
		  </main>
		</div>
	  );
};
export default CSLargePageCOS;
