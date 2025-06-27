import { LayoutDashboard, Settings, LogOut, BookOpen, AppWindow } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUserFromToken, removeToken } from "../utils/auth";
import logo from "/lenta_logo.png";
import classNames from "classnames";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const username = getUserFromToken();

  const navItems = [
    { to: "/admin", label: "Админ-панель", icon: Settings },
    { to: "/registry", label: "Бизнес-способности", icon: LayoutDashboard },
    { to: "/applications", label: "Приложения", icon: AppWindow },
    { to: "/dictionaries", label: "Справочники", icon: BookOpen },
  ];

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  return (
    <aside className="w-20 sm:w-60 bg-white border-r border-gray-200 h-screen p-4 flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <img src={logo} alt="Лента" className="h-6" />
          <span className="hidden sm:inline text-lg font-bold text-lentaBlue">ArchTool</span>
        </div>

        <nav>
          <ul className="space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={classNames(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-lentaBlue/10 text-gray-700",
                    {
                      "bg-lentaBlue/10 text-lentaBlue font-semibold": location.pathname === to,
                    }
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {username && (
        <div className="text-xs mt-6 border-t pt-4 text-gray-500">
          <div className="mb-2">
            <span className="hidden sm:inline">Вы вошли как: </span>
            <span className="font-semibold">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
