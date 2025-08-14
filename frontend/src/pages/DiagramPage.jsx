import GraphEditor from "../components/GraphEditor";

export default function DiagramPage() {
  const handleOpenCard = ({ id, type }) => {
    alert(`Открыть карточку типа ${type} с ID ${id}`);
  };

  return (
    <div style={{ height: "100vh" }}>
      <GraphEditor onOpenCard={handleOpenCard} />
    </div>
  );
}
