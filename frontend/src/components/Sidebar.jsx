import { Link } from "react-router-dom";
import logo from "/lenta_logo.png"; // путь к файлу из `public/`

const Sidebar = () => {
  return (
    <aside className="w-64 bg-lentaBlue text-lentaWhite p-4 h-full">
      <div className="flex items-center gap-2 mb-6">
        <img src={logo} alt="Лента" className="h-6" />
        <span className="text-lg font-bold">ArchTool</span>
      </div>

      <ul className="space-y-2">
        <li>
          <Link to="/admin" className="hover:underline">Админ-панель</Link>
        </li>
        <li>
          <Link to="/registry" className="hover:underline">Бизнес-способности</Link>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
