import Header from "../../Layout/Header";
import ParentComponent  from "./Asset/ParentComponent";

const CSHisInputPage = () => {
  return (
    <div style={{ backgroundColor: "#f9f9f9" }} className="flex-1 overflow-auto relative z-10">
      <Header title={"ตารางประวัติรถเข็นเข้า/ออกห้องเย็น"} />
      <main className='max-w-8xl mx-auto py-1 px-1 lg:px-8'>
  			<ParentComponent />
		</main>
    </div>
  );
};

export default CSHisInputPage;