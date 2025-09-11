import {
  LayoutDashboard,
  Settings,
  LogOut,
  AppWindow,
  Boxes,
  Share2,
  Cpu,
  Layers,
  Rocket,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUserFromToken, removeToken } from "../utils/auth";
import logo from "/lenta_logo.png";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";

const REGISTRY_ROUTES = [
  "/registry",
  "/applications",
  "/app-capabilities",
  "/platforms",
  "/technologies",
  "/initiatives",
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const username = getUserFromToken();

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  // --- раскрывашка «Реестры» ---
  const routeIsRegistry = useMemo(
    () => REGISTRY_ROUTES.some((r) => isActive(r)),
    [location.pathname]
  );

  const [registriesOpen, setRegistriesOpen] = useState(() => {
    // пробуем восстановить из localStorage
    const saved = localStorage.getItem("registriesOpen");
    if (saved === "true" || saved === "false") return saved === "true";
    // иначе открываем, если находимся внутри одного из реестров
    return routeIsRegistry;
  });

  useEffect(() => {
    localStorage.setItem("registriesOpen", String(registriesOpen));
  }, [registriesOpen]);

  useEffect(() => {
    // если зашли на маршрут реестра — раскрыть
    if (routeIsRegistry && !registriesOpen) setRegistriesOpen(true);
  }, [routeIsRegistry]); // eslint-disable-line

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
            {/* Админ-панель */}
            <NavItem to="/admin" label="Админ-панель" icon={Settings} active={isActive("/admin")} />

            {/* Группа: Реестры */}
            <li>
              <button
                type="button"
                onClick={() => setRegistriesOpen((p) => !p)}
                className={classNames(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-lentaBlue/10 text-gray-700",
                  { "bg-lentaBlue/10 text-lentaBlue font-semibold": routeIsRegistry }
                )}
                aria-expanded={registriesOpen}
                aria-controls="registries-group"
              >
                <span className="flex items-center justify-center">
                  {registriesOpen ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </span>
                <span className="hidden sm:inline">Реестры</span>
              </button>

              {/* Вложенные пункты */}
              {registriesOpen && (
                <ul id="registries-group" className="mt-2 ml-6 space-y-1">
                  <NavItem
                    to="/business-capabilities"
                    label="Бизнес-способности"
                    icon={LayoutDashboard}
                    active={isActive("/registry")}
                  />
                  <NavItem
                    to="/applications"
                    label="Приложения"
                    icon={AppWindow}
                    active={isActive("/applications")}
                  />
                  <NavItem
                    to="/app-capabilities"
                    label="Способности приложений"
                    icon={Layers}
                    active={isActive("/app-capabilities")}
                  />
                  <NavItem
                    to="/platforms"
                    label="Платформы"
                    icon={Boxes}
                    active={isActive("/platforms")}
                  />
                  <NavItem
                    to="/technologies"
                    label="Технологии"
                    icon={Cpu}
                    active={isActive("/technologies")}
                  />
                  <NavItem to="/initiatives" label="Инициативы" icon={Rocket} active={isActive("/initiatives")} />
                </ul>
              )}
            </li>

            {/* Графический редактор */}
            <NavItem to="/graph" label="Граф. редактор" icon={Share2} active={isActive("/graph")} />
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

// --- маленький помощник для ссылок ---
function NavItem({ to, label, icon: Icon, active }) {
  return (
    <li>
      <Link
        to={to}
        className={classNames(
          "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-lentaBlue/10 text-gray-700",
          { "bg-lentaBlue/10 text-lentaBlue font-semibold": active }
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    </li>
  );
}
