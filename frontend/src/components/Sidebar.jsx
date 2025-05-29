import { Link } from "react-router-dom";
import { getUserFromToken, removeToken } from "../utils/auth";
import logo from "/lenta_logo.png";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const username = getUserFromToken();
  const navigate = useNavigate();

  return (
    <aside className="w-64 bg-lentaBlue text-lentaWhite p-4 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <img src={logo} alt="Лента" className="h-6" />
          <span className="text-lg font-bold">ArchTool</span>
        </div>

        <ul className="space-y-2">
          <li>
            <Link to="/admin" className="hover:underline">Админ-панель</Link>
          </li>
          <li>
            <Link to="/registry" className="hover:underline">Реестр бизнес-способности</Link>
          </li>
          <li>
            <Link to="/applications" className="hover:underline">Реестр приложений</Link> {/* ✅ добавлено */}
          </li>
        </ul>
      </div>

      {username && (
        <div className="text-sm mt-6 border-t border-white pt-4 flex flex-col gap-2">
          <div>
            Вы вошли как: <span className="font-semibold">{username}</span>
          </div>
          <button
            onClick={() => {
              removeToken();
              navigate("/login");
            }}
            className="text-red-200 hover:text-white text-left"
          >
            Выйти
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
