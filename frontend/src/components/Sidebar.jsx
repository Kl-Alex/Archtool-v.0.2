import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <aside className="w-64 bg-lentaBlue text-lentaWhite p-4 h-full">
      <h2 className="text-lg font-bold mb-4">ArchTool</h2>
      <ul>
        <li className="mb-2 font-semibold">
          <Link to="/admin" className="hover:underline">Админ-панель</Link>
        </li>
        <li className="mb-2 font-semibold">
          <Link to="/registry" className="hover:underline">Бизнес-способности</Link>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
